# Bragi Canvas MCP tools — full reference

All tools are exposed by the Bragi Canvas MCP server. Depending on the host, the tool prefix may appear as `mcp__bragi_canvas__` (hyphen normalized to underscore) or `mcp__bragi-canvas__`. Every tool operates on the **currently active** `.canvas` file in Obsidian (except `list_canvases` / `open_canvas` / `get_active_canvas_info`).

Errors are thrown as plain strings. Most common:
- `No active canvas open in Obsidian`
- `Node not found: <id>` / `Edge not found: <id>`
- `Model not found: <id>` / `No configured provider for model <id>`
- `Node contains no prompt text`
- `Self-loop not allowed: <id>`
- `cancelled by user` (from `open_canvas` when the confirmation modal is dismissed)
- `Unauthorized` (HTTP 401 when MCP access token is set but missing/wrong)

---

## Canvas — read

### `list_nodes`
**Params** `{ type?: "text" | "file" | "link" | "group" }`
**Returns** — array of:
```
{ id, type, x, y, width, height,
  text?, file?, color? }
```

### `get_node`
**Params** `{ id }`
**Returns** `{ node, edges: [{ id, fromNode, fromSide, toNode, toSide, label? }] }`

### `list_edges`
No params. All edges.

### `read_canvas`
Raw JSON of the entire canvas. **Size-capped at 100KB** — if the canvas is larger you get `{ truncated: true, sizeBytes, nodeCount, edgeCount, hint }` instead. Use `list_nodes` / `list_edges` for large canvases.

---

## Canvas — write

### `create_text_node`
**Params** `{ text, x, y, width?=300, height?=200 }` → `{ id }`

### `update_node`
**Params** `{ id, text?, x?, y?, width?, height?, color? }`
Geometry-only edits use Canvas `moveAndResize`. Text or color edits rebuild the node through `importData({ ...full, nodes })`; this avoids Obsidian Canvas live-state corruption that can happen when external MCP calls use UI-oriented `setText()` / `setData()` paths.

### `delete_node`
**Params** `{ id }`.

### `connect_nodes`
**Params**
- `fromId`, `toId`
- `fromSide?` — `"top" | "right" | "bottom" | "left"`, default `"right"`
- `toSide?` — same, default `"left"`
- `toEnd?` — `"none" | "arrow"`, default `"arrow"`
- `label?`

**Returns** `{ edgeId }`.

**Critical:** Bragi only treats an edge as upstream input when `toEnd === "arrow"` and no reverse arrow is drawn. Self-loops are rejected.

### `delete_edge`
**Params** `{ edgeId }`.

---

## Canvas — batch write

### `create_nodes_batch`
Create many text nodes in one `importData` call.
**Params**
```
{ nodes: [{ text, x, y, width?=300, height?=200, color? }, ...] }
```
**Returns** `{ ids: [...] }`.

### `connect_nodes_batch`
**Params**
```
{ edges: [{ fromId, toId, fromSide?, toSide?, toEnd?, label? }, ...] }
```
**Returns** `{ edgeIds: [...] }`. Rejects self-loops and references to missing nodes.

Use batch variants when creating more than 2–3 nodes/edges at once — single round-trip instead of N.

### `update_nodes_batch`
Update geometry/color of many nodes in one import. Doesn't support `text` — use `update_node` for text edits.
**Params**
```
{ updates: [{ id, x?, y?, width?, height?, color? }, ...] }
```
**Returns** `{ applied: [...ids...], missing: [...ids...] }` — `missing` lists ids that weren't on the canvas (not an error, just reported).

The go-to tool for cleanup passes on large canvases (re-grid 50 nodes in one RPC).

---

## Layout / cleanup

### `arrange_in_grid`
Move the listed nodes into a grid. Preserves current width/height unless overridden. Only touches `x`/`y`.
**Params**
```
{ ids,               // node IDs in reading order (left→right, top→bottom)
  cols,              // grid columns
  originX?=0,        // top-left corner of the grid
  originY?=0,
  gap?=80,           // pixel gap between cells
  cellWidth?,        // default = max width among the provided nodes
  cellHeight? }      // default = max height
```
**Returns** `{ moved, cellWidth, cellHeight, rows, cols }`. Throws if any id isn't on the canvas.

Typical use: filter `list_nodes` to a set (e.g. all generated images of a scene), then `arrange_in_grid` with a reasonable `cols` to clean up overlap.

### `create_group_node`
Create a group node — a labelled rectangular frame. Use to visually chapter a dense canvas (one group per scene / beat / shot list). Does NOT re-parent existing nodes; it's a sibling visual frame.
**Params** `{ label?, x, y, width, height, color? }` → `{ id }`

Tip: compute `x`/`y`/`width`/`height` from the bounding box of the nodes you want to visually group (`list_nodes` → min/max x+width / y+height).

---

## Files / assets

### `create_file_node`
Reference an existing vault file as a canvas node.
**Params** `{ filePath, x, y, width?=400, height?=400 }` → `{ id }`
Throws if the file isn't in the vault.

### `upload_image_as_node`
Write a base64 image into the canvas's output directory (`_bragi/assets`) and create a file node for it.
**Params**
```
{ base64,          // with or without "data:...;base64," prefix
  filename,        // e.g. "ref.png" — sanitized; deduped with "_1", "_2" on collision
  x, y,
  width?=400, height?=400 }
```
**Returns** `{ id, filePath }`.

Use this to inject reference images from outside Obsidian.

### `set_asset_id`
Bind / clear a Volcengine / BytePlus Asset ID on an image node (`bragiAssetId`). Used for Seedance face-reference (`asset://<id>` protocol is passed directly to the provider).
**Params** `{ nodeId, assetId }` — pass `assetId: ""` to clear.
Throws if the node isn't an image file node.

---

## Canvas switching

### `get_active_canvas_info`
No params. Returns `{ path, basename, nodeCount, edgeCount }` — or `null` if no canvas is active.

### `list_canvases`
No params. Returns every `.canvas` file in the vault: `[{ path, basename }]`.

### `open_canvas`
**Params** `{ path }`.
**Requires user confirmation** — pops a modal asking "Switch canvas?". If dismissed, throws `cancelled by user`.
**Returns** `{ path }` once opened.

---

## Selection

### `get_selection`
No params. Currently selected nodes.

### `select_node`
**Params** `{ id }`. Replaces selection with just this node.

---

## Generation

### `list_models`
**Params** `{ type?: "image" | "video" | "text" | "audio" }`
Returns only models with at least one configured provider key:
```
[{ id, name, type, provider, modes,
   supportedInputs?, unsupportedInputs?,
   params: [{ id, label, type, default,
              options?, min?, max?, step?, unit? }, ...] }, ...]
```
For `type: "text"`, `supportedInputs` / `unsupportedInputs` describe which upstream media kinds the active provider accepts (for example `["text","image","pdf"]`). Always call this first — the set depends on which keys the user has configured.

### `get_upstream`
**Params** `{ id }`
**Returns**
```
{ prompts:  [...raw upstream prompt strings...],
  images:   [...ordered vault-relative image paths...],
  videos:   [...vault-relative video paths...],
  audios:   [...vault-relative audio paths...],
  pdfs:     [...vault-relative PDF paths...],
  textRefs: [{ nodeId, preview, kind, mdPath? }, ...] }
```

Notes:
- `images` is ordered with `bragiImageOrder` / drag order applied.
- `textRefs` is ordered with `bragiTextOrder` / drag order applied and is the best view for text / `.md` reference ordering.
- `prompts` is a raw quick view from the edge parser; `.md` refs may appear as `__md__:<path>` and are not the authoritative final prompt. Generation resolves ordered text and `.md` refs internally before calling the provider.
- Upstream audio and PDF files can be consumed by text generation where supported; use `audios` / `pdfs` to inspect those refs before calling `generate`.

### `generate`
Trigger a generation. Returns immediately once the placeholder is created; the provider call runs in the background.

**Params**
- `nodeId` — must contain (or have upstream) prompt text
- `modelId` — from `list_models`
- `mode?` — pass a mode from the selected model's `modes` in `list_models`; common video modes include `"text-to-video" | "first-frame" | "first-last-frame" | "image-ref" | "video-ref" | "video-extend"`, and audio modes include `"tts" | "music" | "sound-effect"` — defaults to the model's first mode
- `params?` — model-specific
- `batchCount?` — 1–4, default 1

**Returns**
```
{ status: "generation_started",
  modelId, provider, mode,
  placeholderIds: ["<id1>", "<id2>", ...],    // one per batchCount
  expectedOutputType: "image" | "video" | "text" | "audio",
  hint: "<what to do next>" }
```

**How to track completion:**
- For `image`/`text`/`audio`: call `get_node(placeholderId)` after a short delay. A file/text node = success. A red node with error text = failure.
- For `video`: call `list_pending_tasks` or `get_task_status(taskId)`. When the task disappears, inspect the placeholder as above.

### `list_pending_tasks`
No params. Returns all currently pending async tasks (video only today):
```
[{ taskId, modelName, providerName, sourceNodeId,
   placeholderNodeId, canvasPath, elapsedMs }, ...]
```
Empty array means no async work in flight.

### `get_task_status`
**Params** `{ taskId }`
**Returns**
- `{ status: "pending", taskId, modelName, ..., elapsedMs }` — still running
- `{ status: "not_found", taskId }` — completed, failed, or never existed. Inspect `placeholderNodeId` on the canvas to see the actual outcome.

**Note:** Tasks are removed from the queue the moment they complete (success or failure). "not_found" isn't an error — it's the signal that the placeholder is now the authoritative source of truth.
