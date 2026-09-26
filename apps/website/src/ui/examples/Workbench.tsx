import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Badge } from '../Badge';
import { Eyebrow } from '../Eyebrow';
import { Icon } from '../Icon';
import { announce } from '../../state/toast';
import { watchDemo, type DemoKind } from '../../examples/logs';
import { SelectiveDemo, resetSelectiveDemo } from '../../examples/selective/SelectiveDemo';
import { TasksDemo, resetTasksDemo } from '../../examples/tasks/TasksDemo';
import { AsyncDemo, resetAsyncDemo } from '../../examples/async/AsyncDemo';
import { PreferencesDemo, resetPreferencesDemo } from '../../examples/persistence/PreferencesDemo';
import { ScopedDemo } from '../../examples/scoped/ScopedDemo';

const demos: Record<DemoKind, { Demo: () => JSX.Element; reset: () => void }> = {
  selective: { Demo: SelectiveDemo, reset: resetSelectiveDemo },
  tasks: { Demo: TasksDemo, reset: resetTasksDemo },
  async: { Demo: AsyncDemo, reset: resetAsyncDemo },
  persistence: { Demo: PreferencesDemo, reset: resetPreferencesDemo },
  scoped: { Demo: ScopedDemo, reset: () => {} },
};

export interface SourceFile {
  title: string;
  /** Build-time highlighted HTML (see CodeBlock / highlight). */
  html: string;
  code: string;
}

interface WorkbenchProps {
  title: string;
  demo: DemoKind;
  files: SourceFile[];
  outcome: string;
  points: string[];
}

const tab =
  'rounded-none border-b-2 border-transparent px-2 py-[14px] text-11 text-muted aria-selected:border-green aria-selected:font-[550] aria-selected:text-green';

/**
 * The interactive example frame: the real, tested demo on the left; its source and the behaviours to
 * try on the right; a status line from the demo's own store at the bottom. Reset touches this example only.
 */
export function Workbench({ title, demo, files, outcome, points }: WorkbenchProps) {
  const { Demo, reset } = demos[demo];
  const [epoch, setEpoch] = useState(0);
  const [pane, setPane] = useState<'code' | 'behavior'>('code');
  const [file, setFile] = useState(0);
  const [log, setLog] = useState('Ready. Make a change to begin.');
  const tabs = useRef<HTMLDivElement>(null);

  useEffect(() => watchDemo(demo, setLog), [demo, epoch]);

  const onReset = () => {
    reset();
    setEpoch((current) => current + 1);
    setLog('Ready. Make a change to begin.');
    announce('Example reset.');
  };

  const onPreviewInput = (event: FormEvent<HTMLDivElement>) => {
    if (demo !== 'scoped') return;
    const region = (event.target as HTMLElement).closest<HTMLElement>('section[aria-label]');
    if (region) setLog(`${region.getAttribute('aria-label')} updated · other instances unchanged`);
  };

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'code' : event.key === 'End' ? 'behavior' : pane === 'code' ? 'behavior' : 'code';
    setPane(next);
    tabs.current?.querySelector<HTMLButtonElement>(`#tab-${next}`)?.focus();
  };

  return (
    <section className="workbench overflow-hidden rounded-panel border border-line bg-paper" aria-label={`${title} workbench`}>
      <div className="flex flex-wrap items-center gap-5 border-b border-line bg-surface px-5 py-3 text-11 max-md:gap-[7px] max-md:px-[14px] max-md:py-[11px] max-md:text-10">
        <div className="flex items-center gap-3">
          <Icon name="grid" />
          <strong className="font-[550] text-ink max-xs:text-12">Try it here</strong>
          <Badge tone="green" className="max-xs:hidden">
            Live example
          </Badge>
        </div>
        <div className="ml-auto flex items-center gap-3 max-xs:ml-0">
          <button type="button" className="inline-flex items-center gap-2 text-13 font-[550] text-green hover:underline hover:underline-offset-[5px]" onClick={onReset}>
            <Icon name="reset" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid min-h-[410px] grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] max-xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] max-md:grid-cols-[minmax(0,1fr)]">
        <div className="min-w-0 bg-soft px-[30px] py-[29px] max-xl:px-[18px] max-xl:py-[22px] max-md:px-[18px] max-md:py-[21px]" onInput={onPreviewInput}>
          <div className="mb-4 flex items-center justify-between text-10 text-muted">
            <span>Application preview</span>
            <span className="inline-block size-[6px] rounded-full bg-green" aria-hidden="true" />
          </div>
          <div key={epoch}>
            <Demo />
          </div>
        </div>

        <div className="workbench-source min-w-0 border-l border-line bg-[#fcfdfa] max-md:border-t max-md:border-l-0">
          <div className="flex gap-3 border-b border-line px-4" role="tablist" aria-label="Example explanation" ref={tabs} onKeyDown={onTabKey}>
            <button type="button" role="tab" id="tab-code" className={tab} aria-selected={pane === 'code'} aria-controls="bench-code" tabIndex={pane === 'code' ? 0 : -1} onClick={() => setPane('code')}>
              Code
            </button>
            <button type="button" role="tab" id="tab-behavior" className={tab} aria-selected={pane === 'behavior'} aria-controls="bench-behavior" tabIndex={pane === 'behavior' ? 0 : -1} onClick={() => setPane('behavior')}>
              What changes
            </button>
          </div>

          <div id="bench-code" role="tabpanel" aria-labelledby="tab-code" hidden={pane !== 'code'}>
            {files.length > 1 && (
              <div className="flex flex-wrap gap-[5px] border-b border-line px-4 py-2" role="tablist" aria-label="Source file">
                {files.map((source, index) => (
                  <button
                    type="button"
                    role="tab"
                    className="rounded-[4px] px-2 py-[5px] font-mono text-10 text-muted aria-selected:bg-green-soft aria-selected:text-green"
                    aria-selected={file === index}
                    tabIndex={file === index ? 0 : -1}
                    key={source.title}
                    onClick={() => setFile(index)}
                  >
                    {source.title}
                  </button>
                ))}
              </div>
            )}
            {files[file] && (
              <figure className="code-block">
                <div className="code-head">
                  <span>
                    <Icon name="code" />
                    {files[file].title}
                  </span>
                  <button type="button" className="copy-button" data-copy={files[file].code} aria-label={`Copy ${files[file].title}`}>
                    <Icon name="copy" />
                  </button>
                </div>
                <div dangerouslySetInnerHTML={{ __html: files[file].html }} />
              </figure>
            )}
          </div>

          <div id="bench-behavior" role="tabpanel" aria-labelledby="tab-behavior" hidden={pane !== 'behavior'} className="p-7">
            <Eyebrow>Follow the state</Eyebrow>
            <h3 className="mt-5 text-22">{outcome}</h3>
            {points.map((point, index) => (
              <p className="mt-[22px] text-13" key={point}>
                <span className="font-mono text-12 text-green">0{index + 1}</span>
                <br />
                {point}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-[15px] border-t border-line px-5 py-3 text-10 text-muted max-md:flex-col max-md:items-start max-md:gap-2 max-md:px-[14px] max-md:py-[10px] max-md:text-9">
        <span className="flex min-w-0 items-center gap-2">
          <Icon name="terminal" />
          <span className="overflow-hidden font-mono text-10 text-ellipsis whitespace-nowrap text-green" role="status">
            {log}
          </span>
        </span>
        <span>Reset returns this example to its initial state.</span>
      </div>
    </section>
  );
}
