# Bragi Canvas Skill

Host-neutral agent skill for using the Bragi Canvas MCP server.

Bragi Canvas turns an Obsidian Canvas into a node-based AI generation pipeline. The MCP server gives agents tools to create nodes, connect references, inspect upstream inputs, list configured models, and trigger image / video / text / audio generation. This skill teaches agents how to use those tools correctly.

## What You Install

There are two separate pieces:

1. **MCP server config** — gives the agent tools.
2. **Skill install** — teaches the agent when and how to use those tools.

The skill package in this repo is:

```text
bragi-canvas/
  SKILL.md
  references/
    tools.md
    workflows.md
    models.md
    gotchas.md
```

Install coordinates:

```text
repo: nextbound/bragi-canvas-skill
path: bragi-canvas
```

## Before You Start

In Obsidian:

1. Install and enable the Bragi Canvas plugin.
2. Enable **MCP Server** in Bragi Canvas settings.
3. Keep a `.canvas` file open as the active Obsidian tab.
4. If you set an MCP access token, pass it as a bearer token in your agent's MCP config.

Default MCP URL:

```text
http://127.0.0.1:17775/mcp
```

## Codex

Step 1: add the MCP server.

```bash
codex mcp add bragi-canvas --url http://127.0.0.1:17775/mcp
```

With an MCP access token:

```bash
export BRAGI_MCP_TOKEN="paste-token-here"
codex mcp add bragi-canvas \
  --url http://127.0.0.1:17775/mcp \
  --bearer-token-env-var BRAGI_MCP_TOKEN
```

Step 2: install the skill.

Inside Codex, ask:

```text
$skill-installer install https://github.com/nextbound/bragi-canvas-skill/tree/main/bragi-canvas
```

Or install manually:

```bash
git clone https://github.com/nextbound/bragi-canvas-skill.git /tmp/bragi-canvas-skill
mkdir -p ~/.codex/skills
cp -R /tmp/bragi-canvas-skill/bragi-canvas ~/.codex/skills/bragi-canvas
```

Restart Codex after installing the skill.

## Claude Code

Step 1: add the MCP server.

```bash
claude mcp add --transport http bragi-canvas http://127.0.0.1:17775/mcp
```

With an MCP access token:

```bash
export BRAGI_MCP_TOKEN="paste-token-here"
claude mcp add --transport http bragi-canvas http://127.0.0.1:17775/mcp \
  --header "Authorization: Bearer $BRAGI_MCP_TOKEN"
```

Step 2: install the skill.

```bash
git clone https://github.com/nextbound/bragi-canvas-skill.git /tmp/bragi-canvas-skill
mkdir -p ~/.claude/skills
cp -R /tmp/bragi-canvas-skill/bragi-canvas ~/.claude/skills/bragi-canvas
```

Restart Claude Code after installing the skill.

## OpenClaw

OpenClaw loads AgentSkills-compatible `SKILL.md` folders from workspace and user skill directories.

Step 1: register the Bragi MCP server in your OpenClaw MCP/tool configuration using:

```text
name: bragi-canvas
url: http://127.0.0.1:17775/mcp
transport: streamable-http
```

If you set an MCP access token, add:

```text
Authorization: Bearer <token>
```

Step 2: install the skill folder into a location OpenClaw loads, for example:

```bash
git clone https://github.com/nextbound/bragi-canvas-skill.git /tmp/bragi-canvas-skill
mkdir -p ~/.agents/skills
cp -R /tmp/bragi-canvas-skill/bragi-canvas ~/.agents/skills/bragi-canvas
```

Then restart or refresh OpenClaw skills.

## Hermes And Other MCP-First Agents

Step 1: register the MCP server:

```text
name: bragi-canvas
url: http://127.0.0.1:17775/mcp
transport: streamable-http
```

Step 2: add `bragi-canvas/SKILL.md` as the tool-use guidance for that MCP server, or copy the `bragi-canvas/` folder into the agent's skills directory if it supports `SKILL.md` skills.

## Smoke Test

After setup, ask the agent:

```text
Use Bragi Canvas. Check the active canvas and list configured image models.
```

Expected behavior:

1. The agent calls `get_active_canvas_info`.
2. The agent calls `list_models({ type: "image" })`.
3. If no canvas is open, it tells you to open a `.canvas` file in Obsidian.

## Important Rules For Agents

- Always call `list_models` before `generate`.
- Never invent `modelId` or provider params.
- Put prompts on text / `.md` nodes; `generate` has no `prompt` parameter.
- Connect references with arrows into the prompt node.
- For video, pass `mode` explicitly when using image or video references.
- `generate` returns placeholder IDs; results land on the canvas later.
