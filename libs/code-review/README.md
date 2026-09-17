# code-review

Private tool of this monorepo. `yarn review <target>` runs a LangGraph.js pipeline that turns
probabilistic AI work into a deterministic flow: small segments, checks without AI after every agent
step, and retry loops that pass earlier results back into the prompt.

```
yarn review                                   # asks for everything
yarn review apps/playground/src/stores/todos.ts
yarn review playground --goal 85 --yes        # nx project, accept defaults
yarn review changes                           # staged + unstaged + untracked files
yarn review --help
```

## Pipeline

```
configureProvider ─► chooseTarget ─► selectRules ─► executeRules (one rule at a time) ─► summarize
```

| Segment | AI | What it does |
| --- | --- | --- |
| Provider setup | no | Finds `claude`, `codex` or `kiro-cli` (PATH + known install locations), checks version and auth, recommends one, uses its fastest model and suggests an edit mode from your provider permission settings. Saved in `.review/config.json`. |
| Target selection | no | Detects a file, folder, glob, Nx project, commit or `changes`, then resolves it to source files. |
| Rules | per rule | Each rule is its own graph, registered in `src/segments/rules/ruleRegistry.ts`. |
| Summary | no | Terminal tables plus `.review/runs/<timestamp>/` (`summary.md`, `events.jsonl`, every prompt and response). |

**Permissions are never bypassed.** Headless edits run with your provider's own settings, and denied edits are
reported (retrying stops, since it can't change the outcome). Interactive mode opens the provider's session so you
can approve edits there.

**The review target is not an edit boundary.** The agent may change any file the work needs.
Every file changed outside the targets is listed in the summary.

## Retry loops: is it worth trying again?

Every loop built with `createRetryLoop` runs `attempt → evaluate → assessFailure`. After a failed evaluation (when attempts
are left), `assessFailure` uses code-only checks from `src/graph/retryChecks.ts` to decide whether another attempt could
change the outcome. The first check that says "stop" ends the loop, and its reason becomes the file's result in the summary.

| Check | Stops when |
| --- | --- |
| `stopWhenFailureRepeats` (always on) | the exact same failure repeats and no file changed |
| `stopWhenProviderUnavailable` | the agent's own error shows auth, rate/usage limits, an unknown model or invalid CLI options |
| `stopWhenBlockedByPermissions` | your provider permissions denied every edit |
| `stopWhenNothingChangesTwice` | the agent changed no file in two attempts in a row |
| `stopWhenScoresStagnate` | the measured scores (coverage %, tests passing) did not move in two attempts |

Rules add their own checks through `retryChecks` (each is a small function that returns a verdict or `undefined`).

## Rule: `test-coverage`

```
askOptions → discardUntestableFiles → captureMetadataPerProject → measureInitialCoverage
  → (chooseNaming → homologateFileDomains) → increaseCoverage → reviewQuality → buildReport
```

1. **Discard** files that aren't testable, using the TypeScript AST: types-only modules, barrels, tests, configs, stories, bootstrap entries.
2. **Metadata**: AI runs once per project and returns the runner, include globs and a coverage command template. The command is validated (allowed runner, no shell operators) and proven by a real dry run before it's trusted.
3. **Measure** each file's coverage deterministically (`coverage-summary.json` + uncovered lines). Files that already meet the goal are skipped but still reported.
4. **Homologate** files without a test file: `x.ts` → `x/{index.ts, x.ts, x.test.ts}`. The moved file's relative imports and every reference to the old path (esbuild entries, tsconfig paths, configs, docs) are updated.
5. **Coverage loop**: agent edit → measure → compare to the goal, retrying with the history until the maximum.
6. **Quality loop**: static test signals plus AI scores against `testingGuidelines.ts` (the same guidelines the coverage prompt uses). Then decide, fix, and re-measure coverage.

## Adding a rule

1. Create `src/rules/<ruleName>/<ruleName>Rule.ts` exporting a `Rule` (`id`, `title`, `description`, `run`).
2. Build `run` as a `StateGraph`. Reuse `createRetryLoop` for "attempt → deterministic evaluation → retry with
   history" and `createSequentialLoop` for one-file-at-a-time processing. Use `analyzeStructured` for AI answers
   validated with zod, and `runAgentEdit` for agent edits with change tracking.
3. Return a `RuleReport`: one `FileResult` per file (`details` become table columns), plus `notes` and
   `changedOutsideTargets`.
4. Register it in `src/segments/rules/ruleRegistry.ts`.

## Development

```
yarn test code-review
yarn lint code-review
yarn ts-check code-review
yarn review <target> --provider fake --yes   # runs the pipeline without AI (edits are no-ops)
```
