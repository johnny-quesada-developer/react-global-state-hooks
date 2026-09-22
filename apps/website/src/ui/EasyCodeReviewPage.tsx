import { links } from '../lib/site';
import { Callout } from './Callout';

export function EasyCodeReviewPage() {
  return (
    <div className="container about ecr">
      <header>
        <p className="about__eyebrow">
          AI code review <span className="badge badge--beta">Beta</span>
        </p>
        <h1>easy-code-review</h1>
        <p className="about__lede">
          Turn coverage goals and review rules into focused code improvements. Run your coding agent through
          a repeatable pipeline that measures results, feeds failures back into the next attempt and saves a
          detailed report of every run.
        </p>
        <p className="ecr__availability" role="note">
          <strong>Try the beta from source.</strong> The <code>code-review</code> workspace package lives in{' '}
          <a href={`${links.repo}/tree/master/libs/code-review`} rel="noopener">
            this repository
          </a>
          . Follow the setup below to run it on a file, a project or your current changes.
        </p>
      </header>

      <section className="about__section" aria-labelledby="does">
        <h2 id="does">From review goals to verified changes</h2>
        <ul className="ecr__list">
          <li>
            <strong>Provider setup.</strong> Finds an installed and authenticated agent CLI (Claude, Codex,
            Kiro or Copilot) and uses a fast model for scoring and a capable model for edits.
          </li>
          <li>
            <strong>Targets.</strong> A file, folder, glob, Nx project, commit or <code>changes</code>.
          </li>
          <li>
            <strong>Rules.</strong> The built-in <code>test-coverage</code> rule measures coverage, has the
            agent write tests and scores test quality. Add your own review criteria with prompt-based rules
            and configurable rubrics.
          </li>
          <li>
            <strong>Measured progress.</strong> Your test runner measures coverage after edits. Retry loops
            give the agent concrete failure details and stop on repeated failures, stalled progress or your
            configured attempt limit.
          </li>
          <li>
            <strong>Reviewable reports.</strong> Each run saves per-file results, an event log, usage and every
            prompt and response.
          </li>
        </ul>
      </section>

      <section className="about__section" aria-labelledby="example">
        <h2 id="example">Review a project with one command</h2>
        <p>
          Set a coverage goal and point the pipeline at a project. This repository configures coverage reviews
          for the playground, so you can start with:
        </p>
        <pre
          className="ecr__terminal"
          aria-label="Project review command"
        >{`yarn review playground --goal 85`}</pre>
        <p>
          The pipeline measures existing coverage, targets files below the goal, checks the updated tests
          and reports the result for each file. Inspect the generated diff alongside the run summary in{' '}
          <code>.review/runs/</code>.
        </p>
      </section>

      <section className="about__section" aria-labelledby="setup">
        <h2 id="setup">Prerequisites and setup</h2>
        <ul className="ecr__list">
          <li>
            Node.js, installed workspace dependencies and a configured test runner. This repository uses
            Vitest.
          </li>
          <li>One installed, signed-in agent CLI. Runs use that provider&rsquo;s own quota or billing.</li>
          <li>
            A <code>review.config.json</code> at the workspace root pointing at a folder with{' '}
            <code>settings.ts</code> and optional <code>rules/</code>.
          </li>
        </ul>
        <p>From the react-global-state-hooks repository root:</p>
        <pre className="ecr__terminal">{`yarn install
yarn workspace code-review build
yarn review playground --goal 85
yarn review rule create`}</pre>
      </section>

      <section className="about__section" aria-labelledby="changes">
        <h2 id="changes">Keep control of each review</h2>
        <Callout type="note" title="Inspect the diff before keeping changes">
          Start from a clean working tree and choose the agent&rsquo;s edit permissions. The review target
          selects what to check; the granted permissions determine which files the agent can edit, including
          supporting files. Changes remain available for inspection with <code>git diff</code>, and files
          that still fail receive a <code>{'// [TODO] code-review(<rule>): <reason>'}</code> comment.
        </Callout>
      </section>

      <section className="about__section" aria-labelledby="limits">
        <h2 id="limits">Checks and provider support</h2>
        <ul className="ecr__list">
          <li>
            <strong>Tests and review scores.</strong> Coverage and test results come from your runner. Model
            scores assess your rubric and complement those checks and your final code review.
          </li>
          <li>
            <strong>Provider permissions.</strong> Kiro and Copilot adapters use workspace-wide write access;
            folder-level restrictions are unavailable through those adapters. Claude also reports blocked
            edits directly to the pipeline.
          </li>
          <li>
            <strong>Beta releases.</strong> Check the package README for configuration and CLI updates when
            upgrading.
          </li>
        </ul>
      </section>

      <section className="about__section" aria-labelledby="feedback">
        <h2 id="feedback">Feedback</h2>
        <p>
          Share a review workflow, request a rule or report an issue in{' '}
          <a href={`${links.repo}/issues`} rel="noopener">
            the repository&rsquo;s issue tracker
          </a>
          .
        </p>
      </section>
    </div>
  );
}
