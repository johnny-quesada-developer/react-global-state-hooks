# code-review

The `code-review` workspace package powers easy-code-review. `yarn review <target>` runs a LangGraph.js pipeline that turns
AI-assisted reviews into a repeatable workflow: focused edits, measured coverage, rubric scoring and
retry loops that feed previous results into the next attempt. Runs stop on repeated failures, stalled
progress or configured limits.

```
yarn review                                   # asks for everything
yarn review apps/playground/src/stores/todos.ts
yarn review playground --goal 85 --yes        # nx project, accept defaults
yarn review changes --concurrency 3           # staged + unstaged + untracked files, 3 files at a time
yarn review playground --max-files 20         # abort if the target resolves to more files
yarn review playground --allow-dirty          # run despite uncommitted changes (refused by default)
yarn review playground --fail-on-issues       # exit code 1 when a file fails or a rule crashes (CI)
yarn review rule create                       # wizard: new prompt-based rule
yarn review rule list
yarn review provider create                   # wizard: adapt a new AI CLI, proven live before it's saved
yarn review provider list
yarn review --help
```

## Configuration

Run `yarn review init` to create a connector and configuration folder in a new workspace. In this repository,
settings live in `qa/settings.ts` and review rules in `qa/rules/`.

| File | Committed | Holds |
| --- | --- | --- |
| `review.config.json` (workspace root) | yes | Connector with `schemaVersion: 1` and `configurationDirectory` (this repository uses `./qa`). |
| `<configurationDirectory>/settings.ts` | yes | Workspace and project settings, per-provider models (`fast`, `capable`), `permissions.bash` and `agent` limits. |
| `<configurationDirectory>/rules/*.rule.{json,ts}` | yes | custom rules (see below) |
| `.review/config.json` | no | the last configuration (provider, models, permission scope, coverage options, test naming, concurrency); the next run offers to reuse it |
| `.review/cache/metadata/` | no | per-project test metadata, reused while the project's config files are unchanged |
| `.review/cache/results/<rule>/` | no | files that passed a rule, keyed by content hash; unchanged files are skipped next run |
| `.review/runs/<timestamp>/` | no | `summary.md`, `events.jsonl`, `usage.jsonl`, every prompt and agent response |

## Starting a run

When a previous run saved its choices, the pipeline first asks **Reuse the last configuration** (shown inline:
`claude · sonnet for edits · haiku for scoring · workspace edit permissions · coverage goal 80% · 3/2 attempts`)
or **Configure step by step**. `--reuse` / `--fresh` skip the question, `--yes` reuses, and any flag you pass
(`--model`, `--goal`, `--permissions`, …) overrides the saved value. Every decision a segment makes is saved as it
happens, so an interrupted run still leaves a reusable configuration.

## Pipeline

```
decideConfiguration ─► configureProvider ─► chooseTarget ─► grantPermissions ─► selectRules ─► executeRules (one rule at a time) ─► summarize
```

| Segment | AI | What it does |
| --- | --- | --- |
| Provider setup | no | Finds `claude`, `codex`, `kiro-cli` or `copilot` (PATH + known install locations), plus any custom provider dropped in `<configurationDirectory>/providers/` (see [Adding a provider](#adding-a-provider)), checks version and auth, recommends one. Models come in two tiers: **fast** (metadata, scoring, rubric drafting) and **capable** (edits); defaults per provider, overridable in `settings.ts` or with `--model` / `--fast-model`. |
| Target selection | no | Detects a file, folder, glob, Nx project, commit or `changes`, then resolves it to source files. |
| Permissions | no | Asks every run which edit scope to grant (**whole workspace**, recommended, or only the target projects) and passes it through the provider's own mechanism: `--allowedTools Edit,Write,Bash(yarn vitest *),…` for Claude, `--sandbox workspace-write` for Codex, `--trust-tools` for Kiro, `--allow-tool write,shell(…)` for Copilot. Nothing is bypassed and no settings file is written. Not every provider can scope writes to a folder (Kiro and Copilot can't yet — `describeGrant` says so up front) or report which edits its own permissions blocked (`reportsPermissionDenials`; only Claude does today) — the pipeline uses the permission and retry controls supported by each adapter. |
| Rules | per rule | Built-in rules plus the ones in `<configurationDirectory>/rules/`; each rule is its own graph. |
| Summary | no | Terminal tables (cost and time per file) plus the run folder, and the run's AI usage totals (calls, cost, time) for agent edits and fast-model analysis. Lists every file changed outside the review targets. |

Everything runs headless. Single-file runs (or `--verbose`) stream the agent's tool calls
(`↳ Read …`, `↳ Edit …`, `↳ Bash …`) so you can watch what it does; multi-file runs show one line per attempt with turns, cost and duration.

**The review target is not an edit boundary.** The agent may change any file the work needs
(inside the granted scope). Files that still fail after every attempt keep the agent's changes and get a
`// [TODO] code-review(<rule>): <reason>` comment at the top so they're easy to find.

**Pipeline guards:** a dirty working tree (outside `.review/`) is refused unless `--allow-dirty`, so agent edits stay
separable in source control; `--max-files <n>` aborts oversized targets; `--fail-on-issues` sets exit code 1 when any
file fails or a rule crashes. A rule can be switched off without deleting its file: `createTestCoverageRule({ disabled: true })`
(it stays listed by `rule list`, is skipped at run time, and errors if requested with `--rule`).

**Previewing a run before you keep it:** there's no `--dry-run` flag — commit or stash first, run for
real, then `git diff` to see what the agent did and `git checkout -- . && git clean -fd` (or `git stash`)
to discard it if you don't want it. That's exactly as precise as an automated revert (the working tree
was clean going in, so `HEAD` already is the "before" state) but lets you actually look at the result
before deciding, instead of a flag that force-discards unconditionally.

## How the pipeline keeps AI work cheap and fast

| Mechanism | Where | Effect |
| --- | --- | --- |
| **One session per file, delta retries** | coverage → quality loops, prompt-rule fixes | The first attempt opens a provider session (`--session-id`); every retry `--resume`s it with a short measured delta ("attempt 1 → 71.7%, uncovered 97–119") instead of re-sending the file, the guidelines and the history. The provider's prompt cache serves the rest. The quality fix continues the same session the coverage agent used. Providers without sessions (Codex, Kiro today) fall back to full prompts. |
| **Pre-seeded first prompt** | coverage | The source, the current test and an example test from the project are in the prompt, with the exact verify commands. The agent is told to write the whole test file in one call and verify once. |
| **Stable system prompt** | every AI call | Guidelines, rubrics and working rules go in `--append-system-prompt`, byte-identical across calls, so the provider caches them. Only the per-file part changes. |
| **Slim scoring input** | quality and rule scoring | The scorer gets the test file plus the source's exported signatures (TypeScript AST), not the whole source. `--effort low` on fast-model calls. |
| **Deterministic short-circuits** | quality | Static signals (globals not restored, fake timers left on) skip the AI scorer and go straight to the fix; the metadata call is cached per project; files that passed and are unchanged are skipped from the result cache. |
| **Batch scoring** | quality and rules, multi-file runs | Files that need scoring are scored several per fast-model call (`agent.scoreBatchSize`); a rejected batch falls back to one call per file. |
| **Budget and time limits** | every agent attempt | `--max-budget-usd` per attempt and a per-attempt timeout from `agent.*`; a timed-out attempt is reported and assessed like any other failure. |
| **Concurrency** | coverage, quality, rules | `--concurrency N` (or `agent.concurrency`) processes files in waves; only files in different folders run together. The "changed files" attribution of concurrent agents may include a sibling's files. |

## Retry loops: is it worth trying again?

Every loop built with `createRetryLoop` runs `attempt → evaluate → assessFailure`. After a failed evaluation (when
attempts are left), `assessFailure` uses code-only checks from `src/graph/retryChecks.ts` to decide whether another
attempt could change the outcome. The first check that says "stop" ends the loop, and its reason becomes the file's
result in the summary.

| Check | Stops when |
| --- | --- |
| `stopWhenFailureRepeats` (always on) | the exact same failure repeats and no file changed |
| `stopWhenProviderUnavailable` | the agent's own error shows auth, rate/usage limits, an unknown model or invalid CLI options |
| `stopWhenBlockedByPermissions` | the granted permissions denied every edit |
| `stopWhenNothingChangesTwice` | the agent changed no file in two attempts in a row |
| `stopWhenScoresStagnate` | the measured scores (coverage %, tests passing) did not move in two attempts |

## Rule: `test-coverage` (built in)

```
askOptions → discardUntestableFiles → skipUnchangedPasses → captureMetadataPerProject → measureInitialCoverage
  → (chooseNaming → homologateFileDomains) → increaseCoverage → scoreQualityInBatches → reviewQuality → finishFiles → buildReport
```

1. **Discard** files that aren't testable, using the TypeScript AST: types-only modules, barrels, tests, configs, stories, bootstrap entries. Files that passed before and are unchanged are skipped from the result cache.
2. **Metadata**: the fast model runs once per project and returns the runner, include globs and a coverage command template. The command is validated (allowed runner, no shell operators), proven by a real dry run, then cached.
3. **Measure** each file's coverage deterministically (`coverage-summary.json` + uncovered lines, reported even when tests fail). Files that already meet the goal are skipped but still reported.
4. **Homologate** files without a test file: `x.ts` → `x/{index.ts, x.ts, x.test.ts}`. The moved file's relative imports and every reference to the old path (esbuild entries, tsconfig paths, configs, docs) are updated.
5. **Coverage loop**: the capable model edits in a per-file session → measure → compare to the goal, retrying with measured deltas.
6. **Quality loop**: static signals first, then fast-model scores (batched across files) against `testingGuidelines.ts`; the fix continues the coverage session and coverage is re-measured after it.

## Custom rules: prompt-based, made deterministic

`yarn review rule create` asks for an id, a plain-language description, a file scope, whether the agent may fix
violations and how many attempts it gets. The fast model turns the description into a rubric (2–6 scored criteria,
blocking flags, fix instructions), you confirm it, the wizard proves the rubric on a sample file, and saves:

- `rules/<id>.rule.json` (recommended) — data only, runs through the generic prompt-rule runner
- `rules/<id>.rule.ts` — same definition wrapped in `createPromptRule(...)`, replace it with your own `Rule` when the rule needs deterministic steps beyond scoring and fixing

At run time every prompt rule does: **score** all in-scope files (batched, fast model, structured output validated with zod) →
**deterministic threshold** (every criterion ≥ `passThreshold`, no blocking flag) → **fix** (capable model, one session per file) →
re-score, with the same retry checks as the coverage rule. Unchanged files that passed before are skipped.

## Adding a rule in code

1. Create `src/rules/<ruleName>/<ruleName>Rule.ts` exporting a `Rule` (`id`, `title`, `description`, `run`), or drop a
   `<id>.rule.ts` in the rules directory.
2. Build `run` as a `StateGraph`. Reuse `createRetryLoop` for "attempt → deterministic evaluation → assess → retry",
   `createConcurrentLoop` for file processing (sequential at concurrency 1), `analyzeStructured` / `scoreInBatches` for AI answers validated with zod,
   and `runAgentEdit` (`src/segments/rules/agentEdit.ts`) with `createAgentSession()` for agent edits with change and usage tracking.
3. Return a `RuleReport`: one `FileResult` per file (`details` become table columns), plus `notes` and
   `changedOutsideTargets`.
4. Built-in rules are registered in `src/segments/rules/ruleRegistry.ts`.

## Adding a provider

Every provider — built in or your own — is one `ProviderDefinition`: a binary to find, an auth check, a command to
build for a one-shot analyze call, a command for an edit call, and a line parser for the edit call's streamed
output. Nothing above this layer (rules, retry loops, scoring) knows or cares which provider is running; it only
ever talks to the `AgentProvider` interface (`analyze` / `edit`) that a `ProviderDefinition` produces.

**The fast path — `yarn review provider create`:** a wizard that asks for the provider's id, binary name(s), and
either pasted `--help` output or a path to a file containing it; drafts `authCheckArgs` / `analyzeArgs` / `editArgs`
with the fast model of whichever provider you already have configured; **proves the draft with one real
`analyze()` call against the actual binary on your machine** before saving anything — a failure feeds back into
another draft round instead of being trusted on schema validity alone. Saves `providers/<id>.provider.ts`. The
generated adapter is intentionally minimal (no sessions, no permission scoping, no structured event parsing) —
proven to work for one prompt, meant to be extended by hand once you've confirmed the CLI's fuller behavior.

**By hand:** implement `ProviderDefinition` (exported from `code-review`, optionally wrapped in `defineProvider(...)`
for autocomplete — same pattern as `defineSettings`) and drop it at `<configurationDirectory>/providers/<id>.provider.ts`. It's discovered purely by being present — no registry to edit —
and merged with the built-in catalog; a custom id can't shadow a built-in one. `runCommand` is exported from
`code-review` for `checkAuthentication` and anything else that needs to shell out directly.

Set `reportsPermissionDenials: true` only if the CLI's output genuinely exposes which edits its own permission
model blocked (today, only Claude's does); otherwise leave it `false` and the pipeline falls back to
"stop retrying once two attempts changed nothing" instead of wrongly concluding nothing was ever denied.

## Development

```
yarn test code-review
yarn lint code-review
yarn ts-check code-review
yarn review <target> --provider fake --yes   # runs the pipeline without AI (edits are no-ops)
```
