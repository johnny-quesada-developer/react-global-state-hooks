# Code navigation

- Read `ARCHITECTURE.md` for package ownership and shared test/build conventions.
- CodeGraphContext indexes this monorepo as one graph. Distinguish projects by
  `libs/<project>/` and `apps/<project>/` paths; shared suites live in `libs/test/`.
- For symbol discovery, prefer bounded `execute_cypher_query` projections of
  names, paths and line numbers. `find_code` can return entire definitions.
- Pass the exact file path as `context` when querying callers/callees of a
  repeated symbol. Use path predicates for package-specific Cypher queries;
  `repo_path` identifies the whole repository, not an Nx project.
- Treat graph relationships as navigation hints. Verify TypeScript aliases,
  re-exports, inheritance and runtime registrations in source. Missing callers
  are not proof of dead code. Astro templates are not parsed by this setup.
- Refresh stale indexes with `sh scripts/codegraph.sh update .`. If MCP is
  unavailable, use `rg` and the architecture map; do not block work on indexing.
- Leave existing Git-ignored files alone. Media are excluded from the graph,
  not deleted from the repository.
