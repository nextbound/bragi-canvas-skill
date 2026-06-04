---
name: bragi-canvas
description: Drive an Obsidian Canvas as a node-based AI generation pipeline via the Bragi Canvas MCP server. Use when the user wants to programmatically create/connect canvas nodes, run image/video/text/audio generation on a canvas, build storyboards, or automate content pipelines inside Obsidian. Triggers on mentions of "Bragi", "Bragi Canvas", an Obsidian `.canvas` file combined with AI generation, or any Bragi Canvas MCP tool such as `mcp__bragi_canvas__*` / `mcp__bragi-canvas__*`.
---

# Bragi Canvas

Bragi Canvas turns an Obsidian `.canvas` file into a node-based AI generation pipeline: text nodes become prompts, arrows become data flow, and calling `generate` grows a new image / video / text / audio node next to the source. This skill is how an AI agent drives that pipeline through the plugin's MCP server.

Current skill target: Bragi Canvas plugin **1.22.0**.

## When to use this skill

- User asks you to create, connect, or edit nodes on an Obsidian canvas
- User wants to run image / video / text / audio generation from within a canvas
- User wants to build a storyboard, shot list, or multi-step content pipeline on a canvas
- User mentions "Bragi", "Bragi Canvas", or a `.canvas` file in an AI-generation context
- Any Bragi Canvas MCP tool is available and relevant (`mcp__bragi_canvas__*` in hosts that normalize hyphens to underscores; `mcp__bragi-canvas__*` in hosts that preserve them)

If there is no active canvas open in Obsidian, every tool throws `No active canvas open in Obsidian` — tell the user to open a `.canvas` file first.

## Prerequisites

1. Obsidian is running with the Bragi Canvas plugin enabled
2. **MCP Server** is enabled in plugin settings (new installs default to off; default port `17775`, URL `http://127.0.0.1:17775/mcp`)
3. **The host has registered the Bragi MCP server** — see next section. Without this, the Bragi MCP tools don't appear; falling back to raw HTTP/curl works but gives up schema validation, session handling, and the nicer tool-call ergonomics.
4. A `.canvas` file is the active leaf in Obsidian
5. For `generate`: at least one provider API key is configured in plugin settings
6. If the user has set an **MCP access token** in settings, the MCP client must send `Authorization: Bearer <token>` on every request

## Host compatibility

This skill is intentionally host-neutral: it uses a plain `bragi-canvas/` folder with `SKILL.md` at the root, YAML frontmatter (`name`, `description`), and Markdown references only. Do not add Codex-only, Claude-only, OpenClaw-only, or Hermes-only frontmatter unless it is optional and safely ignored by other hosts.

For distribution, keep the install unit as:

```
bragi-canvas/
  SKILL.md
  references/
    tools.md
    workflows.md
    models.md
    gotchas.md
```

Recommended GitHub install coordinates:

```
repo: nextbound/bragi-canvas-skill
path: bragi-canvas
```

Host rules:
- **Codex / Claude Code / AgentSkills-style hosts:** install or copy the `bragi-canvas/` folder as a skill. The host should load `SKILL.md` and references on demand.
- **OpenClaw-style hosts:** this folder is AgentSkills-compatible; install it into the host's workspace/global skills location or from GitHub if the host supports skill install commands.
- **Hermes / MCP-first hosts:** if the host does not load `SKILL.md` folders directly, register the Bragi MCP server and add this `SKILL.md` as tool-use guidance/context.
- **Any MCP-aware agent:** the operational contract is the same: connect to `http://127.0.0.1:17775/mcp` with optional bearer auth, then use `list_models` before `generate` and the documented tool names rather than relying on a host-specific prefix.

## First-run setup: register the MCP server

**This skill assumes the host has the Bragi MCP server registered.** If Bragi Canvas MCP tools are missing, walk the user through registration before doing anything else.

### Claude Code

Edit `~/.claude/config.json` (or the project-local `.mcp.json`):

```jsonc
{
  "mcpServers": {
    "bragi-canvas": {
      "transport": "http",
      "url": "http://127.0.0.1:17775/mcp"
    }
  }
}
```

If the user has set an MCP access token in Bragi settings:

```jsonc
{
  "mcpServers": {
    "bragi-canvas": {
      "transport": "http",
      "url": "http://127.0.0.1:17775/mcp",
      "headers": { "Authorization": "Bearer <token from settings>" }
    }
  }
}
```

Restart Claude Code. Bragi Canvas MCP tools should now be listed; some hosts expose them as `mcp__bragi_canvas__*` while others preserve the server name as `mcp__bragi-canvas__*`.

### Codex / other MCP-aware hosts

Same URL, same optional `Authorization` header — consult the host's MCP config docs. The server speaks **StreamableHTTP** transport (not stdio, not SSE-only).

### Verification

Once registered, the first tool to call is `get_active_canvas_info` — it confirms the connection and returns `null` if no canvas is open, or `{ path, basename, nodeCount, edgeCount }` if one is.

### Fallback: raw HTTP

If the host cannot register MCP servers, you *can* POST JSON-RPC 2.0 directly to `http://127.0.0.1:17775/mcp` — but expect no schema, no session reuse, and worse errors. Always prefer registration.

## The 27 tools at a glance

Canvas read:      `list_nodes` · `get_node` · `list_edges` · `read_canvas`
Canvas write:     `create_text_node` · `update_node` · `delete_node` · `connect_nodes` · `delete_edge`
Batch write:      `create_nodes_batch` · `connect_nodes_batch` · `update_nodes_batch`
Layout / cleanup: `arrange_in_grid` · `create_group_node`
Files / assets:   `create_file_node` · `upload_image_as_node` · `set_asset_id`
Canvas switching: `get_active_canvas_info` · `list_canvases` · `open_canvas`
Selection:        `get_selection` · `select_node`
Generation:       `list_models` · `get_upstream` · `generate`
Task tracking:    `list_pending_tasks` · `get_task_status`

Full parameter schemas, return shapes, and examples live in `references/tools.md`.

## Core mental model (read this first)

**Arrows carry data.** Only single-direction arrows pointing *at* a node count as that node's upstream input. Undirected lines and bidirectional arrows are ignored. When you `connect_nodes`, the default `toEnd: "arrow"` is what you almost always want.

**Upstream defines the input, the node itself carries the prompt.** When you call `generate(nodeId, ...)`:
- the prompt text is read from the target node (its `text` if it's a text node; the file contents if it's a `.md` file node)
- any *upstream* text nodes are concatenated before that prompt (in drag-sort order)
- any *upstream* image / video / audio / PDF file nodes become reference inputs to models that support them
- the output node is created to the right of the source and auto-connected with an edge

**`generate` returns immediately with placeholder IDs.** The call returns `{ status: "generation_started", placeholderIds: [...], expectedOutputType }` before the real work starts. A shimmering placeholder node is created synchronously at each ID; the provider call continues in the background. To track progress:
- For **video** (async): use `list_pending_tasks` / `get_task_status` — they surface the TaskQueue. When a task disappears from `list_pending_tasks`, inspect the placeholder node: it's either been replaced by a real file node (success) or coloured red with an error message (failure).
- For **image / text / audio** (sync, seconds to tens of seconds): there's no task ID. Just re-read the placeholder node with `get_node(placeholderId)` after a short wait — a file/text node means success, a red node means failure.

**Models are not free text.** Always call `list_models` first to discover which models are actually connected in settings (it filters by available API keys and explicit provider-model connections), what params they accept, and—for `type: "text"`—which upstream media kinds the active provider supports via `supportedInputs` / `unsupportedInputs`. Never guess a `modelId`.

## Quickstart: generate an image from a prompt

```
1. get_selection()                              # or ask user which node
2. list_models({ type: "image" })               # pick one, note its params
3. generate({
     nodeId: "<the prompt node id>",
     modelId: "<id returned by list_models>",
     params: { /* only params listed for that model */ }
   })
4. (optional) a few seconds later: list_nodes({ type: "file" })
   to confirm the new image node appeared
```

## Quickstart: build a storyboard pipeline

```
1. create_text_node for each shot description  (x stepped by ~400, same y)
2. connect_nodes from a "style reference" image node → each shot text node
3. for each shot text node:
     generate({ nodeId, modelId: "<image model>", ... })
4. later, for each resulting image:
     generate({ nodeId: <image node id>, modelId: "<video model>",
                mode: "first-frame", ... })
```

## How to answer questions about the current canvas

Prefer `list_nodes` + `list_edges` (compact) over `read_canvas` (raw dump). Use `get_node` when you only need one. Use `get_upstream(id)` instead of manually tracing edges — it applies Bragi's arrow-direction rules and gives ordered image/text-ref views. Note that `get_upstream.prompts` is a raw quick view; final generation resolves ordered text / `.md` refs internally.

## Detailed references

Load these on demand — they are not in this file to keep SKILL.md small:

- `references/tools.md` — every tool's params, return shape, and gotchas
- `references/workflows.md` — recipes for storyboards, batch generation, video extension, audio pipelines
- `references/models.md` — which models exist, which providers back them, and which modes/params each one takes
- `references/gotchas.md` — upstream arrow rules, Asset IDs, `---SPLIT---` text splitting, async video, error messages

## Hard rules

- **Never invent `modelId` or param values.** Always derive them from `list_models`.
- **Never assume a canvas is open.** If a tool returns "No active canvas open", surface that to the user rather than retrying.
- **Don't block on `generate`.** It returns immediately; don't poll in a tight loop. If the user wants to know when it's done, tell them to watch the canvas, or re-check after a reasonable delay.
- **Don't use `read_canvas` when `list_nodes`/`get_node` suffices.** The raw JSON is large and wastes context.
- **Connect with arrows by default.** `toEnd: "arrow"` is the only edge type Bragi treats as upstream input. Omit this and your reference images won't be picked up.
- **Prompt goes on the target node, not in the `generate` call.** There is no `prompt` parameter on `generate` — put the text in the node via `create_text_node` or `update_node`, then call `generate(nodeId, ...)`.
