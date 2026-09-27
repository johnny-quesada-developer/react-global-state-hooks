import { useRef } from 'react';
import { Icon } from '../Icon';
import { useSequence } from './useSequence';

// 2.2 / 2.4 / 2.2 s per step (reference home agent sequence).
const DURATIONS = [2200, 2400, 2200] as const;

const steps = [
  { title: 'Inspect the runtime', text: 'Read stores, state, and available actions.' },
  { title: 'Run the action', text: 'Observe the exact paths that changed.' },
  { title: 'Verify the result', text: 'Check the outcome against live state.' },
];

type Line = { kind: 'command' | 'output' | 'accent' | 'success' | 'blank'; text: string };

// Output shapes follow libs/monkey_patch/src/cli/format.ts; the session itself is illustrative.
const terminals: Line[][] = [
  [
    { kind: 'command', text: 'npx rgsh --list' },
    { kind: 'output', text: 'todos' },
    { kind: 'output', text: '  state: {"todos":[{"text":"Write the docs","done":true},…' },
    { kind: 'output', text: '  actions: add, toggle, remove' },
    { kind: 'command', text: 'npx rgsh state todos todos[1].done' },
    { kind: 'output', text: '[todos] state at todos[1].done:' },
    { kind: 'accent', text: 'false' },
    { kind: 'success', text: 'Runtime inspected. Ready to act.' },
  ],
  [
    { kind: 'command', text: 'npx rgsh action todos toggle 2' },
    { kind: 'output', text: '10:42:07.118 [todos] toggle(2)' },
    { kind: 'output', text: '  state:' },
    { kind: 'accent', text: '    todos[1].done: false → true' },
    { kind: 'output', text: '  duration: 6ms' },
    { kind: 'success', text: 'Action observed. State changed.' },
  ],
  [
    { kind: 'command', text: 'npx rgsh state todos todos[1].done' },
    { kind: 'output', text: '[todos] state at todos[1].done:' },
    { kind: 'accent', text: 'true' },
    { kind: 'blank', text: '' },
    { kind: 'output', text: '// The path the action changed, read back from the running app.' },
    { kind: 'success', text: 'Verified against the resulting state.' },
  ],
];

const todos = ['Write the docs', 'Ship the examples', 'Review the release'];

/** Inspect → act → verify on the home page: one sequence state drives the sample app and the terminal. */
export function HomeAgentWorkflow() {
  const stage = useRef<HTMLDivElement>(null);
  const sequence = useSequence(DURATIONS, stage);
  const reduced = sequence.reduced;
  const step = sequence.index;
  const done = step > 0;

  const onRun = () => {
    if (reduced) sequence.next();
    else sequence.toggle();
  };

  const runLabel = reduced
    ? { icon: 'chevron' as const, text: 'Next step' }
    : sequence.running
      ? { icon: 'pause' as const, text: 'Pause workflow' }
      : sequence.started && !sequence.finished
        ? { icon: 'play' as const, text: 'Resume workflow' }
        : { icon: 'play' as const, text: 'Run the workflow' };

  const onStepKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (step + (event.key === 'ArrowRight' ? 1 : -1) + 3) % 3;
    sequence.select(next);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus({ preventScroll: true });
  };

  return (
    <div ref={stage}>
      <div className="overflow-hidden rounded-[11px] border border-line bg-[#f7f9f5]">
        <div className="flex items-center justify-between gap-[15px] border-b border-[#e4e8df] px-5 py-3 max-sm:px-3 max-sm:py-[11px]">
          <div className="flex items-center gap-[9px] font-mono text-10 text-[#66755e] max-sm:gap-[6px] max-sm:text-9">
            <Icon name="terminal" className="size-[15px] max-sm:size-3" />
            A feedback loop, not a guess.
          </div>
          <div className="flex items-center gap-[14px] max-sm:gap-[5px]">
            <button
              type="button"
              className="inline-flex size-[29px] items-center justify-center rounded-[5px] text-muted hover:bg-[#eef1ed] hover:text-ink"
              aria-label="Reset the agent workflow"
              onClick={() => sequence.stop()}
            >
              <Icon name="replay" />
            </button>
            <button
              type="button"
              className="inline-flex min-h-[38px] items-center gap-2 rounded-control border border-line bg-paper px-[14px] text-12 font-[550] whitespace-nowrap hover:border-[#b7c2ba] hover:bg-soft max-sm:min-h-8 max-sm:gap-[6px] max-sm:px-[9px] max-sm:text-9"
              onClick={onRun}
            >
              <Icon name={runLabel.icon} className="max-sm:size-[11px]" />
              <span>{runLabel.text}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_70px_1.25fr] items-center p-[31px] max-2xl:grid-cols-[1fr_44px_1.2fr] max-2xl:p-[25px] max-lg:grid-cols-[.95fr_35px_1.1fr] max-lg:p-5 max-sm:flex max-sm:flex-col max-sm:px-4 max-sm:py-[18px]" role="tabpanel" aria-labelledby={`agent-tab-${step}`}>
          <div className="min-w-0 overflow-hidden rounded-[9px] border border-[#dfe5d9] bg-paper shadow-[0_2px_4px_#273b2903,0_8px_20px_#273b2904] max-sm:w-full">
            <div className="flex items-center justify-between border-b border-[#ecf0e5] bg-[#fdfefb] px-4 py-3 font-mono text-9 text-[#656c60] max-sm:px-[15px] max-sm:py-[10px]">
              <span>app.local / release</span>
              <Icon name="scope" className="size-[13px]" />
            </div>
            <div className="px-[25px] pt-[23px] pb-5 max-lg:px-[17px] max-lg:py-[18px] max-sm:px-5 max-sm:py-[18px]">
              <h3 className="flex items-center gap-[9px] text-17 font-[550] tracking-[-0.4px] max-lg:text-14 max-sm:text-16">
                <Icon name="list" className="text-[#5c6b53]" />
                Release checklist
              </h3>
              <p className="mt-[5px] mb-[21px] text-10 text-[#656c5f] max-sm:mb-[15px]">A small app. An observable state change.</p>
              {todos.map((todo, index) => {
                const checked = index === 0 || (index === 1 && done);
                return (
                  <div className="flex items-center gap-[10px] border-t border-[#edf0e7] py-[13px] text-12 max-lg:text-10 max-sm:py-[11px] max-sm:text-11" key={todo}>
                    <span className={`grid size-4 shrink-0 place-items-center rounded-[4px] border transition-[background,border-color] duration-[180ms] ${checked ? 'border-[#6e8961] bg-[#6e8961] text-white' : 'border-[#c9d3c0] bg-paper text-transparent'}`}>
                      <Icon name="check" className="size-[11px] stroke-2" />
                    </span>
                    <span className={checked ? 'text-[#656c60] line-through' : ''}>{todo}</span>
                    {index === 1 && (
                      <span className={`ml-auto rounded-[3px] bg-[#eef4e8] px-[5px] py-[3px] font-mono text-8 text-[#507043] max-lg:hidden max-sm:inline ${done ? 'visible' : 'invisible'}`}>updated</span>
                    )}
                  </div>
                );
              })}
              <div className="mt-4 flex items-center gap-[11px] font-mono text-9 text-[#646d5d]">
                <span>{done ? 2 : 1} of 3 complete</span>
                <div className="h-[3px] flex-1 overflow-hidden rounded-[3px] bg-[#edf0e7]">
                  <span className="block h-full bg-[#98ad89] transition-[width] duration-[400ms]" style={{ width: done ? '66.667%' : '33.333%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center text-[#728468] before:absolute before:inset-x-0 before:h-px before:bg-[#cbd7c1] before:content-[''] max-sm:h-[42px] max-sm:w-[30px] max-sm:before:inset-x-auto max-sm:before:left-1/2 max-sm:before:h-full max-sm:before:w-px" aria-hidden="true">
            <span className="z-[1] grid size-7 place-items-center rounded-full border border-[#cbd7c1] bg-[#f6f9f2] max-sm:size-[25px] max-sm:rotate-90">
              <Icon name="arrow" className="size-[13px]" />
            </span>
          </div>

          <div className="min-w-0 self-stretch overflow-hidden rounded-[9px] border border-[#2d3731] bg-terminal text-[#dce6db] shadow-[0_5px_15px_#1d291410] max-sm:min-h-[287px] max-sm:w-full">
            <div className="flex items-center justify-between gap-2 border-b border-[#354035] px-4 py-3 font-mono text-9 text-[#a5b19e]">
              <div className="flex items-center gap-2">
                <Icon name="terminal" className="size-[13px]" />
                coding-agent / terminal
              </div>
              <span className="flex items-center gap-[6px] text-8 text-[#bbcfab]">
                <span className="size-1 rounded-full bg-[#a7c08d]" />
                WORKFLOW PREVIEW
              </span>
            </div>
            <div className="px-[23px] py-6 font-mono text-12 leading-[1.85] max-2xl:px-[18px] max-2xl:py-[22px] max-2xl:text-[calc(9.5px*var(--type-scale))] max-lg:px-[14px] max-lg:py-[19px] max-lg:text-[calc(8.5px*var(--type-scale))] max-sm:px-[18px] max-sm:py-5 max-sm:text-10" aria-label="Illustrative agent terminal output" key={step}>
              {terminals[step].map((line, index) =>
                line.kind === 'success' ? (
                  <span className={`mt-[18px] inline-flex items-center gap-[7px] rounded-[5px] border border-[#495b3d] bg-[#2c3827] px-[9px] py-[5px] font-mono text-9 text-[#c2d4ad] max-lg:text-8 ${reduced ? '' : 'line-enter'}`} style={{ animationDelay: `${Math.min(index * 30, 150)}ms` }} key={index}>
                    <Icon name="check" className="size-3" />
                    {line.text}
                  </span>
                ) : (
                  <span
                    className={`block min-h-5 [overflow-wrap:anywhere] whitespace-pre-wrap ${line.kind === 'command' ? '[&+&]:mt-0 [.block+&]:mt-[18px]' : ''} ${line.kind === 'output' ? 'text-[#9caa93]' : line.kind === 'accent' ? 'text-[#c4dbaa]' : ''} ${reduced ? '' : 'line-enter'}`}
                    style={{ animationDelay: `${Math.min(index * 30, 150)}ms` }}
                    key={index}
                  >
                    {line.kind === 'command' && <span className="mr-2 text-[#99b384]">$</span>}
                    {line.text}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-[#e1e7db] bg-paper" role="tablist" aria-label="Agent workflow steps" onKeyDown={onStepKey}>
          {steps.map((item, index) => (
            <button
              type="button"
              role="tab"
              id={`agent-tab-${index}`}
              className="flex items-start gap-[13px] rounded-none px-6 py-[22px] text-left transition-[background] duration-200 hover:bg-[#fafcf7] aria-selected:bg-[#f6f9f1] max-lg:gap-[9px] max-lg:p-[17px] max-sm:block max-sm:px-[10px] max-sm:py-3 [&+&]:border-l [&+&]:border-line"
              aria-selected={step === index}
              aria-controls="agent-panel"
              tabIndex={step === index ? 0 : -1}
              key={item.title}
              onClick={() => sequence.select(index)}
            >
              <span className="pt-[2px] font-mono text-10 text-[#656d5b] max-sm:mb-[5px] max-sm:block max-sm:pt-0 max-sm:text-8">0{index + 1}</span>
              <span>
                <strong className="block text-12 font-[550] text-[#4a5942] max-sm:text-10">{item.title}</strong>
                <small className="mt-1 block text-10 text-[#636d5a] max-lg:text-9 max-sm:text-8 max-sm:leading-[1.6]">{item.text}</small>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-[17px] flex items-start justify-between gap-5 text-10 text-[#646d5d] max-lg:flex-col max-lg:gap-[9px] max-sm:text-9">
        <details className="max-w-[530px] [&[open]_summary_.icon]:rotate-90">
          <summary className="flex cursor-pointer items-center gap-[7px] text-11 text-[#5e6b54]">
            <Icon name="chevron" className="size-[13px]" />
            How the connection works
          </summary>
          <p className="m-0 pt-[13px] text-11 leading-[1.8]">
            Coding agent → <code className="text-10 text-[#576e4a]">rgsh</code> CLI → local WebSocket → open Chrome DevTools panel → your
            application. Setup requires the Chrome extension, <code className="text-10 text-[#576e4a]">ws</code> as a development dependency,
            and the debug import before your stores are created. Keep that import out of production. The preview above is
            illustrative; it does not connect to an app or run shell commands.
          </p>
        </details>
        <span>Illustrative workflow. No live agent or extension connected.</span>
      </div>
    </div>
  );
}
