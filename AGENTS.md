# Code navigation

- Prefer the `codegraphcontext` MCP tools for symbol and caller/callee searches.
- Keep queries scoped to relevant paths and verify results against source.
- If the index is stale, run `sh scripts/codegraph.sh update .`; if unavailable, use `rg`.
- Leave existing Git-ignored files alone.
