# Bragi Canvas — workflow recipes

Concrete multi-step flows you can execute end-to-end via MCP tools. Each assumes a `.canvas` file is open.

---

## 1. Generate an image from an existing prompt node

```
1. (if unsure which node) get_selection()
2. list_models({ type: "image" })
3. generate({
     nodeId: "<prompt node id>",
     modelId: "<from step 2>",
     params: { … from the model's schema … }
   })
```

The image node will appear to the right, auto-connected.

---

## 2. Create a prompt, then generate from it (one-shot)

```
1. create_text_node({ text: "cinematic shot of...", x: 0, y: 0 })
     → returns { id }
2. generate({ nodeId: id, modelId: "...", params: { … } })
```

---

## 3. Shot-list → storyboard images

Goal: user gives you 5 shot descriptions, you lay them out and generate all 5 images.

```
1. for i, desc in enumerate(shots):
     create_text_node({ text: desc, x: i * 400, y: 0, width: 320, height: 160 })

2. models = list_models({ type: "image" })
   model = pick one (ask user, or use the first)

3. for each shot node:
     generate({ nodeId: shotId, modelId: model.id, params: {…} })
```

All 5 generations run in parallel. Tell the user they'll see 5 shimmering placeholders that resolve over the next ~30s.

---

## 4. Style-consistent storyboard (shared reference image)

One style reference image feeds every shot.

```
1. Assume the style reference is already an image node on the canvas — get its id
   (or ask the user to drop one in, then use get_selection).

2. Create the shot text nodes (same as recipe 3).

3. For each shot node:
     connect_nodes({
       fromId: styleRefId,
       toId:   shotNodeId,
       toEnd:  "arrow"          // REQUIRED for it to count as reference
     })

4. For each shot node:
     generate({ nodeId: shotNodeId, modelId: <image model that supports image refs>, … })
```

Good image-ref-capable choices from `list_models({ type: "image" })`: `gpt-image-2`, `nano-banana-pro`, `nano-banana-2`, `grok-imagine`, `luma-uni-1`, and `seedream-5.0` / `seedream-4.5` when their providers are configured. Always pass the Bragi `modelId`, not the provider API model ID.

---

## 5. Images → animated clips (first-frame video)

```
1. For each image node you want to animate:
     create_text_node({ text: "camera slowly dollies forward", x: imgX+400, y: imgY })
     connect_nodes({ fromId: imgNodeId, toId: motionTextId })   // image feeds motion prompt

2. list_models({ type: "video" })
   pick one whose entry lists "first-frame" (Seedance 2.5/2.0, Kling 3.0, Wan 2.7, Veo 3.1, Grok Video)
   // Wan 2.7 is one modelId "wan-2.7"; on MuleRouter it is first-frame only, on DashScope it has all modes

3. For each motion text node:
     const { placeholderIds } = generate({
       nodeId: motionTextId,
      modelId: "seedance-2.0",
      mode: "first-frame",
      params: { duration: "5", ratio: "16:9", resolution: "1080p" }
     })
     // remember placeholderIds[0] — you'll check it later

4. Track with list_pending_tasks until empty, then get_node(placeholderId)
   for each to see whether it became a video file node or went red.
```

Video is async — results arrive minutes later. Don't spin on `list_pending_tasks`; poll at most every ~10s.

---

## 6. First-last-frame interpolation

Two images → a video that morphs from the first to the second.

```
1. Create the motion prompt text node.
2. connect_nodes(firstImageId  → motionPromptId, toEnd: "arrow")
3. connect_nodes(secondImageId → motionPromptId, toEnd: "arrow")
4. generate({
     nodeId: motionPromptId,
     modelId: "kling-3.0",             // or any model supporting first-last-frame
     mode: "first-last-frame",
     params: { duration: "5", aspect_ratio: "16:9" }
   })
```

The drag-sort order of the two images (stored as `bragiImageOrder` on the node) decides which is first and which is last. To control it deterministically, check `get_upstream(motionPromptId).images` ordering.

---

## 6a. MiniMax-H3 multimodal reference

MiniMax-H3 uses distinct Bragi modes for frame control and multimodal references even though APIMart infers the upstream mode from request fields.

For character + voice reference generation:

```
1. Connect one or more image nodes to the motion prompt with arrow-ended edges.
2. Connect up to three audio nodes to the same prompt.
3. generate({
     nodeId: motionPromptId,
     modelId: "minimax-h3",
     mode: "image-ref",
     params: { duration: 5, resolution: "2K", aspect_ratio: "adaptive" }
   })
```

For motion video + optional character/voice references, connect at least one video and use `mode: "video-ref"`. This mode accepts up to 3 videos, 9 images, and 3 audio clips. Audio cannot be used alone. If one or two images are intended as first/last frames, use `first-frame` or `first-last-frame` and disconnect every video/audio reference first.

All MiniMax-H3 inputs are automatically copied to temporary Bragi Relay URLs before APIMart receives the request.

---

## 7. Video extension (continue a clip)

```
1. Create a prompt text node describing what should happen next.
2. connect_nodes(existingVideoNodeId → nextBeatPromptId, toEnd: "arrow")
3. generate({
     nodeId: nextBeatPromptId,
     modelId: "grok-video",
     mode: "video-extend",
     params: { duration: "5" }
   })
```

---

## 8. Batch variations (×N)

Get 4 alternative images from the same prompt:

```
generate({
  nodeId: promptId,
  modelId: "<image model>",
  params: {…},
  batchCount: 4       // max 4
})
```

Four placeholder nodes appear vertically stacked.

---

## 9. Text generation with `---SPLIT---` fan-out

Ask a text model to write multiple items separated by `---SPLIT---` on its own line — Bragi will explode the output into multiple text nodes.

```
1. create_text_node({
     text: "Write 5 short shot descriptions for a noir chase scene. " +
           "Separate each with a line containing only ---SPLIT---."
   })
2. generate({ nodeId, modelId: "claude-opus-4-7" or "gpt-5.5-pro", ... })
```

Result: 5 separate text nodes, each connected back to the prompt. Now feed them into recipe 3 or 4.

---

## 10. TTS / music / SFX

```
1. create_text_node({ text: "Welcome to episode one." })
2. list_models({ type: "audio" })
3. generate({
     nodeId,
     modelId: "elevenlabs-tts-v3",
     mode: "tts",
     params: { voice: "21m00Tcm4TlvDq8ikWAM" }
   })
```

For music: `mode: "music"`, ElevenLabs uses `music_length_ms` (seconds in the UI range) plus `instrumental`; MiniMax Music uses `instrumental`. Lyrics come from ordered upstream text nodes for MiniMax Music.

For Mureka Music, use `modelId: "mureka-music"` and one of the `generation_mode` values returned by `list_models`:

- `prompt`: the target node is a complete prompt-to-song description.
- `lyrics`: connect one or more lyrics text nodes into a separate target style-prompt node, then generate from that target. Ordered upstream text becomes lyrics; target text stays the music/style prompt.
- `instrumental`: the target node describes the instrumental music.

Mureka is async. Bragi sends one choice per task and maps `batchCount` 1–4 to separate variations. After the provider task appears, track it with `list_pending_tasks`; when it disappears, inspect the placeholder/file node.
For SFX: use `modelId: "elevenlabs-sfx"`, `mode: "sound-effect"`, and `duration` from {1,3,5,10,20,30}.

For voice reference cloning in the Obsidian UI, connect an upstream audio file to a TTS prompt and choose the `Voice ref` source mode. Native ElevenLabs and MiniMax TTS can clone from the upstream audio; MCP `generate` can use an already-created custom voice ID via the model's `voice` param.

---

## 11. Voice Changer / speech-to-text / audio isolation

These exist as Obsidian UI actions on audio file nodes, but they are **not exposed as MCP `generate` models** today. Do not call `generate` with Voice Changer, `stt`, `isolation`, or fal.ai utility IDs; `getModelById` will reject them.

For **Voice Changer**, configure ElevenLabs, select the audio whose content, timing, and emotion should be preserved, and connect exactly one incoming audio node as the target voice reference. Every click creates a separate output node, so conversions can run in parallel.

---

## 12. Denoise image nodes

Denoise exists as an Obsidian UI image-node action, not an MCP `generate` model. Do not call `generate` with NLM 35, denoise, or FLUX utility IDs.

The default denoise method is **NLM 35 - local CPU**. It calls a local service URL from settings (default `http://127.0.0.1:17776`) at `/v1/denoise` with strength `0.35`, then replaces the normal placeholder with the returned image. The separate local service must already be running.

The **FLUX.2 Klein 9B** choice remains available in the modal when a configured provider supports it. If FLUX is unavailable, the UI disables that choice instead of hiding the whole action.

---

## 13. PDF summary with Claude or GPT

Connect a PDF file node upstream of a text prompt node, then generate with a text model whose active provider supports PDF (`list_models({ type: "text" })` → check `supportedInputs` includes `"pdf"`).

```
1. Place a PDF file node on the canvas
2. create_text_node({ text: "Summarize this document in 5 bullet points.", ... }) → promptNodeId
3. connect_nodes({ fromId: pdfNodeId, toId: promptNodeId })   // arrow points into the prompt node
4. generate({ nodeId: promptNodeId, modelId: "claude-sonnet-4-6" })
```

For Qwen on DashScope with video refs, use `modelId: "qwen-3-6-plus"` and ensure DashScope key is configured. DashScope video understanding does not include audio tracks — describe spoken content separately if needed.

---

## 14. Inspecting before generating (dry run)

Before spending on a model call, confirm the upstream graph:

```
get_upstream(nodeId)  →  { prompts, images, videos, audios, pdfs, textRefs }
```

Use this to verify:
- That the expected text / `.md` refs are present in `textRefs`
- That reference images are in the order you expect
- That no stray undirected edge is missing (absent refs = missing arrow direction)

`get_upstream.prompts` is a raw quick view and may contain `__md__:<path>` entries. Generation itself resolves ordered text / `.md` refs internally.

---

---

## 15. Fast storyboard creation (batch tools)

When creating 5+ shots, use the batch tools — one round-trip instead of N.

```
1. { ids } = create_nodes_batch({
     nodes: shots.map((text, i) => ({
       text, x: i * 400, y: 0, width: 320, height: 160
     }))
   })

2. connect_nodes_batch({
     edges: ids.map(id => ({ fromId: styleRefId, toId: id }))
   })

3. for each id in ids:
     generate({ nodeId: id, modelId: "...", params: {...} })
```

---

## 14. Inject an external image as a reference

Agent has a PNG in hand (maybe from a web fetch) and wants to use it as style reference:

```
1. { id: refId, filePath } = upload_image_as_node({
     base64: "<raw base64 or data URI>",
     filename: "style_ref.png",
     x: 0, y: 0
   })

2. create a prompt text node, then
   connect_nodes({ fromId: refId, toId: promptId, toEnd: "arrow" })

3. generate({ nodeId: promptId, modelId: "...", params: {...} })
```

For an image already in the vault, skip step 1 and use `create_file_node({ filePath, x, y })` instead.

---

## 15. Face-consistent Seedance videos

```
1. Bind each face image:
     set_asset_id({ nodeId: faceImgId, provider: "tokenrouter", assetId: "asset-20260403175316-..." })

2. Connect face image(s) → shot prompt, then
   generate({ nodeId: shotId, modelId: "seedance-2.0",
              mode: "image-ref", params: {...} })
```

Use `provider: "byteplus"` or `provider: "bytedance"` for those native Seedance paths. If BytePlus AK+SK or TokenRouter are configured in settings, you can often skip step 1 entirely — ref media can be auto-routed through the provider's asset library and cached on the source node.

---

## 16. Clean up a cluttered canvas

When a canvas has grown to 50+ nodes with overlapping / scattered layout:

```
1. list_nodes() → inspect what's there; group mentally by theme
2. For each group:
     (a) decide a grid: e.g. 4 cols, top-left at (500, 0)
     (b) arrange_in_grid({ ids: groupIds, cols: 4, originX: 500, originY: 0 })
     (c) create_group_node({
           label: "Scene 1", x: 480, y: -40,
           width: groupBboxW + 40, height: groupBboxH + 80
         })
3. Optionally delete failed nodes:
     list_nodes() → filter color === "1" (red) → delete_node each
```

For a pure "re-grid everything" pass, prefer `update_nodes_batch` over N `arrange_in_grid` calls if you want custom per-node positions.

---

## 17. Bulk move / re-color (no RPC storm)

Moving 30 nodes 500px to the right:

```
const nodes = list_nodes()
update_nodes_batch({
  updates: nodes.map(n => ({ id: n.id, x: n.x + 500 }))
})
```

One RPC instead of 30.

---

## Layout conventions that work well

- Canvas `x` increases to the right; `y` increases *downward*
- 400–500px horizontal spacing between sequential shots
- 300×200 default text node is usually too tall for one-line prompts — set `height: 100`
- Vertical columns for variants, horizontal rows for sequence
