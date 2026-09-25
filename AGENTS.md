# Bragi Canvas skill maintenance

- Keep the skill host-neutral and English. Work on a branch; use a matching suffix for a coupled plugin change and link the companion PR/commit.
- Tool names change: update the `SKILL.md` index and `references/tools.md`. Fields, defaults and results change: update `references/tools.md`.
- Models/providers change: update `references/models.md`. Prompt, connection, error or recovery behavior changes: update gotchas/workflows as affected.
- Review the website's MCP/setup/recovery docs for the same change. In the PR, list companion updates or explain why a surface needs no update; do not make empty edits.
- State the compatible plugin version. Run `npm run verify` and, when using the coordination workspace, its `sync:check` with the actual plugin/skill/website directories. Review field and behavior differences manually; the local checks do not prove API compatibility.
- Verify both plugin/skill candidates before merging a coupled change. A plugin release may precede the website, but keep its website follow-up and target date in the release PR/task until deployed.
