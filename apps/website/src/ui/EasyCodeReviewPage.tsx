import { links } from '../lib/site';
import type { ReactNode } from 'react';
import { Badge } from './Badge';
import { Section, SectionTitle } from './Section';
import { PageShell } from './PageShell';
import { Callout } from './Callout';

const prose = 'max-w-[46rem]';
const terminal =
  'my-3 max-w-[60rem] overflow-x-auto rounded-md border border-line-strong bg-bg p-4 text-[0.8rem] leading-[1.5]';

function Steps({ children }: { children: ReactNode }) {
  return <ul className="mt-3 mr-0 mb-0 ml-0 max-w-[46rem] space-y-2 pl-[1.2rem]">{children}</ul>;
}

export function EasyCodeReviewPage() {
  return (
    <PageShell className="pt-8 pb-0">
      <header>
        <p className="mt-0 mr-0 mb-1 ml-0 text-sm font-bold text-primary">
          AI code review <Badge>Beta</Badge>
        </p>
        <h1 className="text-3xl leading-heading">easy-code-review</h1>
        <p className="my-3 max-w-[44rem] text-lg text-text-muted">
          Turn coverage goals and review rules into focused code improvements. Run your coding agent through
          a repeatable pipeline that measures results, feeds failures back into the next attempt and saves a
          detailed report of every run.
        </p>
        <p className="mt-4 mr-0 mb-0 ml-0 max-w-[46rem] rounded-md border border-[#ecd98a] bg-yellow px-4 py-3" role="note">
          <strong>Try the beta from source.</strong> The <code>code-review</code> workspace package lives in{' '}
          <a href={`${links.repo}/tree/master/libs/code-review`} rel="noopener">
            this repository
          </a>
          . Follow the setup below to run it on a file, a project or your current changes.
        </p>
      </header>

      <Section shell={false} aria-labelledby="does">
        <SectionTitle id="does">From review goals to verified changes</SectionTitle>
        <Steps>
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
        </Steps>
      </Section>

      <Section shell={false} aria-labelledby="example">
        <SectionTitle id="example">Review a project with one command</SectionTitle>
        <p className={prose}>
          Set a coverage goal and point the pipeline at a project. This repository configures coverage reviews
          for the playground, so you can start with:
        </p>
        <pre
          className={terminal}
          aria-label="Project review command"
        >{`yarn review playground --goal 85`}</pre>
        <p className={prose}>
          The pipeline measures existing coverage, targets files below the goal, checks the updated tests
          and reports the result for each file. Inspect the generated diff alongside the run summary in{' '}
          <code>.review/runs/</code>.
        </p>
      </Section>

      <Section shell={false} aria-labelledby="setup">
        <SectionTitle id="setup">Prerequisites and setup</SectionTitle>
        <Steps>
          <li>
            Node.js, installed workspace dependencies and a configured test runner. This repository uses
            Vitest.
          </li>
          <li>One installed, signed-in agent CLI. Runs use that provider&rsquo;s own quota or billing.</li>
          <li>
            A <code>review.config.json</code> at the workspace root pointing at a folder with{' '}
            <code>settings.ts</code> and optional <code>rules/</code>.
          </li>
        </Steps>
        <p>From the react-global-state-hooks repository root:</p>
        <pre className={terminal}>{`yarn install
yarn workspace code-review build
yarn review playground --goal 85
yarn review rule create`}</pre>
      </Section>

      <Section shell={false} aria-labelledby="changes">
        <SectionTitle id="changes">Keep control of each review</SectionTitle>
        <Callout type="note" title="Inspect the diff before keeping changes" className="mt-3 max-w-[46rem]">
          Start from a clean working tree and choose the agent&rsquo;s edit permissions. The review target
          selects what to check; the granted permissions determine which files the agent can edit, including
          supporting files. Changes remain available for inspection with <code>git diff</code>, and files
          that still fail receive a <code>{'// [TODO] code-review(<rule>): <reason>'}</code> comment.
        </Callout>
      </Section>

      <Section shell={false} aria-labelledby="limits">
        <SectionTitle id="limits">Checks and provider support</SectionTitle>
        <Steps>
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
        </Steps>
      </Section>

      <Section shell={false} aria-labelledby="feedback">
        <SectionTitle id="feedback">Feedback</SectionTitle>
        <p className={prose}>
          Share a review workflow, request a rule or report an issue in{' '}
          <a href={`${links.repo}/issues`} rel="noopener">
            the repository&rsquo;s issue tracker
          </a>
          .
        </p>
      </Section>
    </PageShell>
  );
}
