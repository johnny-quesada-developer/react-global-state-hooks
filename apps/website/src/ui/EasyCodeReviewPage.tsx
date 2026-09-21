import { links } from '../lib/site';
import { Callout } from './Callout';

export function EasyCodeReviewPage() {
  return (
    <div className="container about ecr">
      <header>
        <p className="about__eyebrow">
          Beta <span className="badge badge--beta">not published yet</span>
        </p>
        <h1>easy-code-review</h1>
        <p className="about__lede">
          A command-line pipeline that runs an AI coding agent over your files in small, checked steps. After
          every agent step, ordinary code verifies the result, and retries stop when another attempt cannot
          change the outcome.
        </p>
        <p className="ecr__availability" role="note">
          <strong>Availability:</strong> there is no public install command yet. The tool currently lives as a
          private package (<code>libs/code-review</code>) in the react-global-state-hooks repository, and the
          name <code>easy-code-review</code> is not registered on npm. This page will show the install command
          when a release exists.
        </p>
      </header>

      <section className="about__section" aria-labelledby="does">
        <h2 id="does">What it does today</h2>
        <ul className="ecr__list">
          <li>
            <strong>Provider setup.</strong> Finds an installed and authenticated agent CLI (Claude, Codex,
            Kiro or Copilot) and uses a fast model for scoring and a capable model for edits.
          </li>
          <li>
            <strong>Targets.</strong> A file, folder, glob, Nx project, commit or <code>changes</code>.
          </li>
          <li>
            <strong>Rules.</strong> One built-in rule, <code>test-coverage</code>, which measures coverage,
            has the agent write tests, then scores test quality. You can add prompt-based rules that are
            scored against a rubric.
          </li>
          <li>
            <strong>Deterministic checks.</strong> Coverage is measured by running your tests, not by asking a
            model. Retry loops feed measured results back to the agent and stop when the failure repeats or
            nothing changes.
          </li>
          <li>
            <strong>A run folder.</strong> Each run saves a summary, an event log, usage and every prompt and
            response.
          </li>
        </ul>
      </section>

      <section className="about__section" aria-labelledby="example">
        <h2 id="example">A real run</h2>
        <p>
          This is unedited output from running the pipeline on this website&rsquo;s async example with the
          built-in <code>fake</code> provider, which makes no AI calls and turns edits into no-ops. It shows
          the report format and one honest result: the workspace&rsquo;s configured <code>test-coverage</code>{' '}
          rule does not cover
          <code>apps/website</code>, so every file is reported as out of scope and nothing was reviewed.
        </p>
        <pre
          className="ecr__terminal"
          aria-label="Sample run output"
        >{`▸ target: folder apps/website/src/examples/async → 4 source file(s)
▸ [test-coverage] rule 1/1: Increase test coverage with quality tests
  [test-coverage] goal 80% · coverage attempts 3 · quality attempts 2 · concurrency 1
▸ [test-coverage] discarded 4 file(s) (out of scope or not testable), 0 left

Increase test coverage with quality tests (test-coverage)
0 passed · 4 skipped · 0 failed
  file                                                status      goal  tries
○ apps/website/src/examples/async/AsyncDemo.test.tsx  outOfScope  80%   0
○ apps/website/src/examples/async/AsyncDemo.tsx       outOfScope  80%   0
○ apps/website/src/examples/async/fakeApi.ts          outOfScope  80%   0
○ apps/website/src/examples/async/store.ts            outOfScope  80%   0

AI usage → agent edits: 0 call(s) · $0.00 · 0s · fast-model analysis: 0 call(s) · $0.00 · 0s`}</pre>
        <p>
          I have not published an AI-scored report for this site, because doing so needs the rule&rsquo;s
          scope widened and spends provider credits. The example code on this site is verified by ordinary
          tests instead.
        </p>
      </section>

      <section className="about__section" aria-labelledby="setup">
        <h2 id="setup">Prerequisites and setup</h2>
        <ul className="ecr__list">
          <li>
            Node.js and a repository with a test runner the tool can run (Vitest is what it is exercised
            with).
          </li>
          <li>One installed, signed-in agent CLI. Runs use that provider&rsquo;s own quota or billing.</li>
          <li>
            A <code>review.config.json</code> at the workspace root pointing at a folder with{' '}
            <code>settings.ts</code> and optional <code>rules/</code>.
          </li>
        </ul>
        <p>In its current home, from the react-global-state-hooks repository:</p>
        <pre className="ecr__terminal">{`yarn workspace code-review review <target> --provider fake --yes   # pipeline check, no AI
yarn workspace code-review review <target>                          # asks for everything`}</pre>
      </section>

      <section className="about__section" aria-labelledby="changes">
        <h2 id="changes">What it can change</h2>
        <Callout type="warning" title="It edits your files">
          The agent may change any file the work needs, inside the permission scope you grant, not only the
          target files. Files that still fail after every attempt keep the agent&rsquo;s changes and get a{' '}
          <code>{'// [TODO] code-review(<rule>): <reason>'}</code> comment. By default the tool refuses to run
          on a dirty working tree, so the agent&rsquo;s edits stay separable. Review them with{' '}
          <code>git diff</code>, and discard them with your usual git commands.
        </Callout>
      </section>

      <section className="about__section" aria-labelledby="limits">
        <h2 id="limits">Limitations</h2>
        <ul className="ecr__list">
          <li>
            <strong>AI judgments are probabilistic.</strong> Rubric scores come from a model. Passing them is
            not a guarantee that code is correct. Measured coverage and passing tests are the deterministic
            part.
          </li>
          <li>Only one built-in rule today. Everything else is a rule you write.</li>
          <li>
            Providers differ. Kiro and Copilot cannot yet limit writes to a folder, and only Claude reports
            which edits its permissions blocked.
          </li>
          <li>It is a beta. Names, flags and the built package layout may change before a release.</li>
        </ul>
      </section>

      <section className="about__section" aria-labelledby="feedback">
        <h2 id="feedback">Feedback</h2>
        <p>
          Tell me what works and what does not by opening an issue at{' '}
          <a href={`${links.repo}/issues`} rel="noopener">
            the repository&rsquo;s issue tracker
          </a>
          .
        </p>
      </section>
    </div>
  );
}
