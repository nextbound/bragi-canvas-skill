# Bragi Canvas — gotchas & edge cases

The things that will silently break if you don't know them.

---

## 1. Arrow direction is load-bearing

Only edges with `toEnd: "arrow"` *and no reverse arrow* count as upstream input. This is the #1 source of "why is my reference image not being used?"

| Edge style | Counts as upstream? |
|-----------|---------------------|
| `fromSide → toSide` with `toEnd: "arrow"` | ✅ yes |
| `toEnd: "none"` (undirected line) | ❌ no |
| Bidirectional (both ends arrowed) | ❌ no |

When calling `connect_nodes`, leave `toEnd` at its default (`"arrow"`) unless you explicitly want a decorative line.

---

## 2. `generate` returns placeholder IDs, not results

`generate` resolves immediately after creating the placeholder node(s). The real provider call runs in the background. You get `placeholderIds` back — use them to track what you just started.

- Sync types (image, text, and most audio): re-read the placeholder with `get_node(placeholderId)` after a short wait. When its type/content changes it's done. Red color + error text = failure.
- Async types (video and providers such as Mureka Music): use `list_pending_tasks` and `get_task_status(taskId)` after submission. When the task disappears from the queue, check the placeholder. These tasks persist across plugin restarts and reopen with the matching canvas.

Tasks are removed from the queue the moment they finish. `get_task_status` returning `"not_found"` is not an error — it means "the queue no longer tracks this, look at the placeholder node."

---

## 3. Prompts live on the node, not in `generate`

There is no `prompt` argument on `generate`. The prompt is *read from the target node*:

- text node → `node.text`
- `.md` file node → the file's contents

If the node has no text AND no upstream text node, `generate` throws `Node contains no prompt text`.

To set a prompt programmatically, `create_text_node` with the text you want, or `update_node({ id, text })`.

---

## 4. Upstream text is concatenated *before* the node's own text

Final prompt = `upstreamTextNodes.join("\n") + "\n" + node.text`. If both are present, they are joined. Use this to layer "system style" + "shot description":

```
upstream: a text node with "photorealistic, 35mm film grain, …"
  → arrow → 
target:   the shot text node with "a wolf in a snowstorm"
```

The model will receive both concatenated.

---

## 5. Reference ordering is drag-sortable — but deterministic from MCP

When multiple upstream images feed one node, the order Bragi uses is stored on the downstream node as `bragiImageOrder` (similarly `bragiTextOrder`, `bragiAudioOrder`). If you haven't set it, order falls back to edge creation order.

To inspect ordering from MCP, call `get_upstream(id)`. The `images` array is ordered and `textRefs` shows ordered text / `.md` refs. The `prompts` array is only a raw edge-parser view; `.md` refs may appear as `__md__:<path>`, and final generation resolves ordered text / `.md` refs internally.

To *control* order from MCP, create the edges in the desired order, or use `read_canvas` to inspect/set the order array directly (then `update_node` — but note `update_node` only exposes standard fields; custom order fields require a raw canvas write, which the MCP doesn't expose cleanly).

---

## 6. Asset IDs for Seedance references

Seedance uses provider-specific Asset IDs (`asset-20260403175316-…`) for native image and audio references. You can bind them from MCP via `set_asset_id({ nodeId, provider, assetId })` on image or audio nodes. `provider` defaults to `tokenrouter` and can be `tokenrouter`, `byteplus`, or `bytedance`. When the active provider/model supports Seedance assets, the bound Asset ID is passed through as `asset://<id>` (no base64 inline payload).

If BytePlus AK+SK and a BytePlus Asset group ID are configured in settings, reference media without a BytePlus/Volcengine Asset ID can be routed through that explicit BytePlus asset library group. Bragi no longer creates BytePlus asset groups automatically; without a configured group ID, Seedance refs use temporary HTTPS URLs instead of BytePlus `asset://...`. If TokenRouter is active and both a TokenRouter key and Asset group ID are configured, ref images/audio/videos can be routed through that explicit TokenRouter ModelArk group and cached back on the source node. TokenRouter no longer creates or guesses a ModelArk group; without a configured group ID, Seedance refs use temporary HTTPS URLs instead of `asset://...`.

Token360 Seedance does not use the manual `set_asset_id` flow. Keep `set_asset_id` provider values to `tokenrouter`, `byteplus`, or `bytedance`. If a Token360 Asset group ID is configured in settings, Bragi automatically uploads image refs into that group, caches the returned `ta_...` ID on the source node as `bragiAssetIds.token360`, and sends `asset://ta_...` to Token360. If no group ID is configured, Token360 image/audio/video refs use temporary public HTTPS URLs.

---

## 7. `---SPLIT---` splits text output into multiple nodes

For text generation only. If the model output contains a line consisting of exactly `---SPLIT---`, Bragi splits the output at those markers and creates one text node per chunk, each connected back to the source prompt. Leverage this for batch creative work — "write 5 shots, separate with ---SPLIT---".

---

## 8. Text multimodal inputs are provider-specific

Bragi validates upstream image / PDF / video / audio refs against a model × provider capability matrix before generation. Use `list_models({ type: "text" })` and read `supportedInputs` / `unsupportedInputs` for the active provider.

| Provider | Image | PDF | Video | Audio |
|----------|-------|-----|-------|-------|
| OpenAI / APIMart GPT | yes | yes | no | no |
| Anthropic / Bedrock Claude | yes | yes (≤32 MB) | no | no |
| xAI Grok | yes | yes | no | no |
| Google Gemini | yes | yes | yes | yes |
| DashScope Qwen 3.6 Plus | yes | yes | yes (no audio track) | yes |
| TokenRouter | slug-dependent | slug-dependent | slug-dependent | slug-dependent |

Gemini and DashScope upload large or non-inline refs through Bragi Relay. Claude PDFs over 32 MB fail before the API call. OpenAI, Claude, xAI, and APIMart do **not** accept upstream video/audio for text — connect video frames as images manually if you need a workaround.

---

## 9. Video mode defaults from MCP are dumber than the UI's

The Obsidian bottom bar auto-picks a smart mode based on upstream (1 img → first-frame, 2 img → first-last-frame, etc). The MCP does *not* do this — if you pass no `mode`, it uses the **first mode in the model's `list_models` entry** (the active provider's first mode). For most video models that is `text-to-video`, but for a provider that only exposes a subset it is that subset's first mode (e.g. MuleRouter `wan-2.7` → `first-frame`). Always pass `mode` explicitly for video.

---

## 9b. `list_models` is provider-scoped; modes and params differ by provider

The same model can expose different modes and params depending on its active provider. `list_models` already returns the provider-effective set: a provider may offer a subset of modes (MuleRouter `wan-2.7` is `first-frame` only) and may narrow or hide params (MuleRouter `wan-2.7` hides `ratio`, uses lowercase resolutions). Never pass a mode or param taken from `references/models.md` or from another provider's row — read them from the model's own `list_models` entry.

---

## 9c. MCP rejects unsupported modes before the provider

If you pass a `mode` the active provider does not offer, `generate` throws `Mode "<mode>" is not supported by <provider> for <modelId>. Supported modes: …` before any provider call. This is an MCP-level guard, not an upstream error — fix the `mode` to one listed in `list_models`.

---

## 9d. Kling 3.0 Omni video edit supports ordinary reference images

For `kling-3.0-omni`, `video-edit` requires exactly one upstream base video, but it may also receive upstream images as ordinary references. These images are not first/last frames: native Kling sends them in `image_list`, while APIMart sends them in `image_urls`. Bragi adds missing `<<<image_N>>>` prompt references automatically. Native Kling allows up to 4 reference images when a video is present.

---

## 9e. Seedance 2.5 editing and extension depend on prompt intent

Volcengine and BytePlus classify `seedance-2.5` reference tasks after they enter the queue. `video-edit` must use explicit editing language (for example add/remove/replace/change), `ratio: "adaptive"`, and `duration: "-1"`. `video-extend` must use explicit extension language (extend/continue), and also requires `ratio: "adaptive"`. If the prompt intent and selected mode disagree, the provider may return the asynchronous `InvalidParameter.TaskTypeConstraint` error even though task creation initially succeeded.

---

## 9f. Grok Video modes differ between xAI and gateway providers

With xAI active, `grok-video` is aggregated: Grok Imagine Video 1.5 handles text-to-video, first-frame, and image-ref, while the official legacy `grok-imagine-video` handles video-edit and video-extend because xAI rejects those operations on 1.5. fal.ai and SVRouter keep the four legacy modes and reject `video-edit` before any request. For xAI, first-frame requires exactly one upstream image, image-ref accepts 1–7 images and no 1080p, and video-edit/video-extend each require exactly one upstream video. Edit ignores duration, ratio, and resolution; extension accepts only a 2–10 second duration. Read the xAI-effective `optionsByMode` from `list_models` instead of reusing the fal.ai/SVRouter duration options.

---

## 9f. MiniMax-H3 frame and reference inputs are mutually exclusive

For `minimax-h3`, `first-frame` requires exactly one ordered image and `first-last-frame` requires exactly two. Neither mode may include reference video or audio. Use `image-ref` for images with optional audio, or `video-ref` for at least one video with optional image/audio references. Audio-only generation is rejected by APIMart. Every MiniMax-H3 prompt is still required, including reference modes, and is limited to 7000 characters.

---

## 10. Denoise actions are UI-only

NLM 35 and FLUX Denoise are Obsidian UI actions on image file nodes, not MCP models. They do not appear in `list_models`, and `generate` will reject denoise-like model IDs.

The NLM 35 option requires the separate local service to be reachable at the configured service URL (default `http://127.0.0.1:17776`, endpoint `/v1/denoise`). If the service is stopped or returns an invalid payload, Bragi errors before writing a final output file.

---

## 11. `batchCount` caps at 4

`generate({ batchCount: 10 })` is silently clamped to 4.

---

## 12. Switching canvases requires user confirmation

Canvas-mutating and reading tools always target the currently active canvas leaf. You can inspect Bragi-known canvases with `list_canvases` and switch with `open_canvas({ path })` — but `open_canvas` pops a modal asking the user to confirm. If they dismiss it you get `cancelled by user`.

`list_canvases` is intentionally an indexed known-canvas list, not a full vault scan. If the user gives an exact canvas path, call `open_canvas({ path })` directly.

If the user switches tabs manually mid-session, your next tool call targets the new tab.

---

## 13. Output files land in `_bragi/assets`

Generated files go to the vault-level `_bragi/assets/` directory. The file node's `file` property is a vault-relative path such as `_bragi/assets/img_<timestamp>.png`. If you need the filesystem path, combine with the vault root (not exposed via MCP — you'd have to ask the user).

---

## 14. Localhost + optional bearer token auth

The MCP server binds to `127.0.0.1` with CORS `*`. If the user sets `MCP access token` in plugin settings, every request must carry `Authorization: Bearer <token>` (401 otherwise). If the token is blank, any local process can connect — treat canvas contents accordingly.

---

## 15. Port changes need an Obsidian restart

Toggling `Enable MCP server` starts/stops the server live, but changing `MCP port` only takes effect after restarting Obsidian.

---

## 16. Errors you might see and what they mean

| Error | Cause |
|-------|-------|
| `No active canvas open in Obsidian` | No `.canvas` tab is active. Ask the user to open one. |
| `Node not found: <id>` | Wrong id, or the node was just deleted. |
| `Edge not found: <id>` | Wrong edgeId. |
| `Model not found: <id>` | `modelId` isn't in the hardcoded catalogue. Typo or wrong provider prefix. |
| `No configured provider for model <id>` | Model exists, but the user either hasn't set a provider key or hasn't connected that provider to this model in settings. |
| `Node contains no prompt text` | Target node empty, and no upstream text node either. |
| `Mode "…" is not supported by <provider> for <modelId>. Supported modes: …` | The mode isn't offered by the model's active provider. Use a mode from the model's `list_models` entry. |
| `Settings not available` | MCP server started without the settings callback — shouldn't happen in practice. |
| `Generation not available` | MCP started without the `runGeneration` callback — same, shouldn't happen. |
