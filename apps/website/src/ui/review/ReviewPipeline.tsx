import { useState } from 'react';
import { Badge } from '../Badge';
import { Eyebrow } from '../Eyebrow';

const stages = [
  {
    title: 'Measure',
    short: 'Establish the baseline.',
    heading: 'Measure the starting point.',
    text: 'Your test runner measures coverage before the agent changes the target. A baseline makes the next result comparable, and the built-in test-coverage rule targets the files below your goal.',
  },
  {
    title: 'Review',
    short: 'Give the agent the target.',
    heading: 'Give the agent a concrete task.',
    text: 'A target is a file, folder, glob, Nx project, commit or your current changes. The pipeline passes the configured rules to the selected provider: the built-in test-coverage rule has the agent write tests, and prompt-based rules with configurable rubrics add your own review criteria. Its output is a proposal until executable checks and a diff support it.',
  },
  {
    title: 'Validate',
    short: 'Run configured checks.',
    heading: 'Run the checks, not just a second opinion.',
    text: 'Your test runner measures coverage after edits and a fast model scores test quality against the rubric. Retry loops give the agent concrete failure details and stop on repeated failures, stalled progress or your configured attempt limit. Test results and rubric scores stay separate kinds of evidence.',
  },
  {
    title: 'Report',
    short: 'Record the outcome.',
    heading: 'Keep a record you can inspect.',
    text: 'Each run saves per-file results, an event log, usage and every prompt and response under .review/runs/. Files that still fail receive a // [TODO] code-review(<rule>): <reason> comment. Inspect changes across the entire workspace before accepting the work.',
  },
];

/** The four pipeline stages; selecting one changes the explanation beneath. */
export function ReviewPipeline() {
  const [index, setIndex] = useState(0);
  const stage = stages[index];

  return (
    <section>
      <div className="my-[35px] grid grid-cols-4 gap-[15px] max-md:grid-cols-2 max-md:gap-[22px]" role="group" aria-label="Review pipeline">
        {stages.map((item, position) => (
          <button
            type="button"
            className="rounded-none border-t-2 border-line bg-paper pt-4 text-left text-ink aria-pressed:border-green"
            aria-pressed={index === position}
            onClick={() => setIndex(position)}
            key={item.title}
          >
            <span className="mb-3 block font-mono text-12 text-green">0{position + 1}</span>
            <h3 className="mb-[9px] text-17">{item.title}</h3>
            <p className="m-0 text-12">{item.short}</p>
          </button>
        ))}
      </div>
      <div className="rounded-panel border border-line bg-soft p-7 max-md:p-5" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-[22px]">
          <div>
            <Eyebrow>Selected stage</Eyebrow>
            <h3 className="mt-[14px] mb-0 text-22">{stage.heading}</h3>
          </div>
          <Badge>Deterministic workflow</Badge>
        </div>
        <p className="mt-[14px] mb-0 text-14 text-muted">{stage.text}</p>
      </div>
    </section>
  );
}
