import { useRef } from 'react';
import { Badge } from '../Badge';
import { Icon } from '../Icon';
import { useSequence } from '../home/useSequence';

// 2.2 s per step (reference product-page sequence).
const DURATIONS = [2200, 2200, 2200] as const;

const steps = [
  { title: 'Inspect', text: 'Read the current state.', status: '01 / Inspect the current state' },
  { title: 'Act', text: 'Call the store’s action.', status: '02 / Invoke the action' },
  { title: 'Verify', text: 'Read back the result.', status: '03 / Verify the outcome' },
];

const terminals = [
  `$ npx rgsh state todos\n\n{\n  "todos": [\n    { "text": "Create the store", "done": true },\n    { "text": "Compose a selector", "done": false }\n  ]\n}\n\n# The current state is the starting point.`,
  `$ npx rgsh action todos add "Write the docs"\n\n# Call the application's exposed action.\n# The store now contains the new task.\n\n+ { "text": "Write the docs", "done": false }\n\n# Read the state next to verify the outcome.`,
  `$ npx rgsh state todos\n\n{\n  "todos": [\n    { "text": "Create the store", "done": true },\n    { "text": "Compose a selector", "done": false },\n    { "text": "Write the docs", "done": false }\n  ]\n}\n\n# Expected task present. State verified.`,
];

/** The evidence loop on the product page: application state and terminal share one sequence. */
export function AgentEvidenceLoop() {
  const stage = useRef<HTMLDivElement>(null);
  const sequence = useSequence(DURATIONS, stage);
  const reduced = sequence.reduced;
  const step = sequence.index;
  const tasks = ['Create the store', 'Compose a selector', ...(step ? ['Write the docs'] : [])];

  const onPlay = () => {
    if (reduced) {
      sequence.next();
      return;
    }
    if (sequence.running) sequence.pause();
    else if (sequence.finished || step === 2) sequence.restart();
    else sequence.resume();
  };

  const play = reduced
    ? { icon: 'chevron' as const, label: 'Next step' }
    : sequence.running
      ? { icon: 'pause' as const, label: 'Pause' }
      : step === 2
        ? { icon: 'replay' as const, label: 'Replay sequence' }
        : { icon: 'play' as const, label: 'Play sequence' };

  return (
    <section aria-label="Agent workflow demonstration" ref={stage}>
      <div className="mb-[14px] flex items-center justify-between gap-3">
        <span className="eyebrow">The evidence loop</span>
        <Badge>Illustrative session</Badge>
      </div>
      <div className="grid min-h-[415px] grid-cols-[1fr_1.12fr] overflow-hidden rounded-panel border border-line max-md:grid-cols-1">
        <div className="min-w-0 bg-soft px-7 pb-6 max-md:px-[23px] max-md:pb-[25px]">
          <div className="-mx-7 mb-7 flex min-h-[45px] items-center justify-between gap-3 border-b border-line bg-surface px-[17px] py-3 text-11 text-muted max-md:-mx-[23px]">
            <span>Your application</span>
            <Badge tone="green">Todos</Badge>
          </div>
          <h3 className="mt-[35px] mb-2 text-19">A plan, made visible.</h3>
          <p className="text-13">Follow the task from action to state.</p>
          <div className="mt-[30px]" key={step}>
            {tasks.map((task, index) => (
              <div className={`flex items-center gap-[10px] border-b border-line py-3 text-12 ${index === 2 ? 'pulse' : ''}`} key={task}>
                <span className={index === 0 ? '' : 'text-muted'}>
                  <Icon name={index === 0 ? 'check' : 'plus'} />
                </span>
                <span className={index === 0 ? '' : ''}>{task}</span>
                {index === 2 && (
                  <Badge tone="green" className="ml-2">
                    New
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <div className="mt-[30px] flex items-center justify-between gap-3">
            <span className="text-13 text-muted">Selected store</span>
            <code className="text-14">todos</code>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-13 text-muted">Task count</span>
            <strong className="text-16">{step ? 3 : 2}</strong>
          </div>
        </div>
        <div className="min-w-0 bg-terminal text-terminal-text">
          <div className="flex min-h-[45px] items-center justify-between gap-3 border-b border-[#3a463d] bg-[#28322b] px-[17px] py-3 text-11 text-terminal-muted">
            <span className="flex items-center gap-3">
              <Icon name="terminal" />
              Agent terminal
            </span>
            <span className="text-10">rgsh · localhost</span>
          </div>
          <pre className="m-0 min-h-[250px] p-6 font-mono text-11 leading-[2] break-words whitespace-pre-wrap max-md:min-h-[200px] max-md:p-[22px] max-md:text-11 max-xs:text-10" tabIndex={0} aria-label="Illustrative CLI output" key={step}>
            {terminals[step].split('\n').map((line, index) => (
              <span
                className={`${line.startsWith('#') ? 'text-[#9bab9f]' : line.startsWith('+') ? 'text-[#b6d6c1]' : line.startsWith('$') ? 'text-[#b6d6c1]' : ''} ${reduced ? '' : 'line-enter'}`}
                style={{ animationDelay: `${Math.min(index * 30, 150)}ms` }}
                key={index}
              >
                {line || ' '}
                {'\n'}
              </span>
            ))}
          </pre>
          <div className="mx-6 flex items-center justify-between gap-3 border-t border-[#3a473d] py-[14px] text-10 text-[#a7b8ad] max-md:mx-[22px]">
            <span role="status">{steps[step].status}</span>
            <button type="button" className="inline-flex items-center gap-2 text-13 font-[550] text-[#c9ded1] hover:underline hover:underline-offset-[5px]" onClick={onPlay}>
              <Icon name={play.icon} />
              {play.label}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-5 flex overflow-hidden rounded-[8px] border border-line max-md:mt-[13px]" role="group" aria-label="Workflow steps">
        {steps.map((item, index) => (
          <button
            type="button"
            className="flex flex-1 items-start gap-[15px] rounded-none p-5 text-left text-12 aria-pressed:bg-green-soft max-md:flex-col max-md:gap-[7px] max-md:px-[10px] max-md:py-[15px] max-md:[&_.icon]:hidden [&+&]:border-l [&+&]:border-line"
            aria-pressed={step === index}
            key={item.title}
            onClick={() => sequence.select(index)}
          >
            <span className={`pt-[3px] font-mono text-10 ${step === index ? 'text-green' : 'text-muted'}`}>0{index + 1}</span>
            <div className="min-w-0 flex-1">
              <strong className={`block text-14 max-md:text-12 max-xs:text-11 ${step === index ? 'text-green' : ''}`}>{item.title}</strong>
              <p className="mt-[7px] mb-0 text-11 leading-[1.6] text-muted max-md:text-10">{item.text}</p>
            </div>
            <Icon name="arrow" className="mt-[2px] size-[14px]" />
          </button>
        ))}
      </div>
      <p className="mt-5 mb-0 text-11 leading-[1.8] text-muted">This is a scripted design demonstration, not a connected coding agent. The recordings below are the real thing.</p>
    </section>
  );
}
