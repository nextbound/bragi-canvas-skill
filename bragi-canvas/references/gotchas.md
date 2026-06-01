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

- Sync types (image, text, audio): re-read the placeholder with `get_node(placeholderId)` after a short wait. When its type/content changes it's done. Red color + error text = failure.
- Async types (video): use `list_pending_tasks` and `get_task_status(taskId)`. When the task disappears from the queue, check the placeholder.

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

## 6. Asset IDs for Seedance face reference

Seedance's face-preservation feature uses provider-specific Asset IDs (`asset-20260403175316-…`). You can bind them from MCP via `set_asset_id({ nodeId, provider, assetId })` — image nodes only. `provider` defaults to `tokenrouter` and can be `tokenrouter`, `byteplus`, or `bytedance`. When the active provider/model supports Seedance assets, the bound Asset ID is passed through as `asset://<id>` (no base64 inline payload).

If BytePlus AK+SK and a BytePlus Asset group ID are configured in settings, ref images without a BytePlus/Volcengine Asset ID can be routed through that explicit BytePlus asset library group. Bragi no longer creates BytePlus asset groups automatically; without a configured group ID, Seedance refs use temporary HTTPS URLs instead of BytePlus `asset://...`. If TokenRouter is active and both a TokenRouter key and Asset group ID are configured, ref images/audio/videos can be routed through that explicit TokenRouter ModelArk group and cached back on the source node. TokenRouter no longer creates or guesses a ModelArk group; without a configured group ID, Seedance refs use temporary HTTPS URLs instead of `asset://...`.

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

The Obsidian bottom bar auto-picks a smart mode based on upstream (1 img → first-frame, 2 img → first-last-frame, etc). The MCP does *not* do this — if you pass no `mode`, it uses `model.modes[0]`, which for most video models is `text-to-video`. Always pass `mode` explicitly for video unless you really want text-to-video.

---

## 10. `batchCount` caps at 4

`generate({ batchCount: 10 })` is silently clamped to 4.

---

## 11. Switching canvases requires user confirmation

Canvas-mutating and reading tools always target the currently active canvas leaf. You can inspect Bragi-known canvases with `list_canvases` and switch with `open_canvas({ path })` — but `open_canvas` pops a modal asking the user to confirm. If they dismiss it you get `cancelled by user`.

`list_canvases` is intentionally an indexed known-canvas list, not a full vault scan. If the user gives an exact canvas path, call `open_canvas({ path })` directly.

If the user switches tabs manually mid-session, your next tool call targets the new tab.

---

## 12. Output files land in `_bragi/assets`

Generated files go to the vault-level `_bragi/assets/` directory. The file node's `file` property is a vault-relative path such as `_bragi/assets/img_<timestamp>.png`. If you need the filesystem path, combine with the vault root (not exposed via MCP — you'd have to ask the user).

---

## 13. Localhost + optional bearer token auth

The MCP server binds to `127.0.0.1` with CORS `*`. If the user sets `MCP access token` in plugin settings, every request must carry `Authorization: Bearer <token>` (401 otherwise). If the token is blank, any local process can connect — treat canvas contents accordingly.

---

## 14. Port changes need an Obsidian restart

Toggling `Enable MCP server` starts/stops the server live, but changing `MCP port` only takes effect after restarting Obsidian.

---

## 15. Errors you might see and what they mean

| Error | Cause |
|-------|-------|
| `No active canvas open in Obsidian` | No `.canvas` tab is active. Ask the user to open one. |
| `Node not found: <id>` | Wrong id, or the node was just deleted. |
| `Edge not found: <id>` | Wrong edgeId. |
| `Model not found: <id>` | `modelId` isn't in the hardcoded catalogue. Typo or wrong provider prefix. |
| `No configured provider for model <id>` | Model exists, but the user either hasn't set a provider key or hasn't connected that provider to this model in settings. |
| `Node contains no prompt text` | Target node empty, and no upstream text node either. |
| `Settings not available` | MCP server started without the settings callback — shouldn't happen in practice. |
| `Generation not available` | MCP started without the `runGeneration` callback — same, shouldn't happen. |
