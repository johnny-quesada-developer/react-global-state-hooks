import { watchHash } from '../data/heroVideos';
import { ButtonLink } from './ButtonLink';
import { Section, SectionTitle } from './Section';
import { PACKAGE_VERSION, withBase } from '../lib/site';

interface AgenticDevToolsProps {
  session: string;
}

const flow = [
  { name: 'Coding agent', detail: 'runs rgsh in a terminal' },
  { name: 'rgsh', detail: 'local WebSocket on 127.0.0.1:7787' },
  { name: 'DevTools panel', detail: 'the Chrome extension, open on your app' },
  { name: 'Running app', detail: "imports 'react-global-state-hooks/debug'" },
];

const abilities = [
  {
    command: 'rgsh --list',
    title: 'Discover the runtime',
    body: 'Know which stores actually exist, their current state and the actions they expose.',
  },
  {
    command: 'rgsh --store todos',
    title: 'Trace every action',
    body: 'Capture the action, its arguments, the exact state paths it changed, the result, and how long it took.',
  },
  {
    command: 'rgsh state todos todos[0].done',
    title: 'Inspect the evidence',
    body: 'Query any state path directly, instead of inferring behavior from source code, HTML or a screenshot.',
  },
  {
    command: 'rgsh action | patch | set',
    title: 'Test against the runtime',
    body: 'Run an action or write state from the terminal, so the agent can reproduce behavior and verify its own fix.',
  },
];

const parse = (session: string) =>
  session
    .trimEnd()
    .split('\n')
    .map((line) =>
      line.startsWith('$ ') ? { command: true, text: line.slice(2) } : { command: false, text: line },
    );

const flowStep =
  "relative flex flex-col rounded-md border border-line-strong bg-bg px-4 py-3 even:bg-mint not-last:after:absolute not-last:after:top-full not-last:after:left-6 not-last:after:h-6 not-last:after:border-l-2 not-last:after:border-line-strong not-last:after:content-['']";
const terminalCommand = "text-[#f3d58a] before:text-[#a9c2b8] before:content-['$_']";

export function AgenticDevTools({ session }: AgenticDevToolsProps) {
  const lines = parse(session);

  return (
    <Section id="agentic-devtools" aria-labelledby="agentic-heading">
      <div className="max-w-[48rem]">
        <p className="mt-0 mr-0 mb-1 ml-0 text-sm font-bold text-primary">Agentic DevTools</p>
        <SectionTitle id="agentic-heading">Give your coding agent the runtime trace</SectionTitle>
        <p className="my-3 text-lg text-text-muted">
          Coding agents already read source code well. The weak point is runtime behavior: without a way to
          see it directly, an agent reconstructs what happened from screenshots, DOM dumps and console output.{' '}
          <code>rgsh</code> exposes actions, exact state changes and timing as structured data it can read
          straight from the terminal.
        </p>
        <p className="mt-0 mr-0 mb-4 ml-0 border-l-[3px] border-primary pl-3 font-semibold">
          Browser automation performs the interaction. Agentic DevTools tells the agent what actually changed.
        </p>
        <p className="m-0 flex flex-wrap gap-3">
          <ButtonLink href={watchHash('runtime-debugging')}>
            Watch it debug a real run
          </ButtonLink>
          <ButtonLink
            variant="secondary"
            href={`${withBase('docs/devtools/')}#drive-it-from-a-terminal`}
          >
            Read the docs
          </ButtonLink>
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.5fr)] lg:gap-8">
        <ol className="m-0 flex list-none flex-col justify-center gap-6 p-0" aria-label="How the agent reaches the running app">
          {flow.map((step) => (
            <li className={flowStep} key={step.name}>
              <strong>{step.name}</strong>
              <span className="text-sm text-text-muted">{step.detail}</span>
            </li>
          ))}
        </ol>

        <figure className="m-0 overflow-hidden rounded-md bg-[#10231e] text-[#e6f0ec] shadow-md">
          <figcaption className="border-b border-[#27423a] px-4 py-2 text-sm text-[#a9c2b8]">
            Real output from this repository&rsquo;s playground
          </figcaption>
          <pre className="m-0 overflow-x-auto bg-transparent p-4 text-sm leading-[1.55] text-inherit" tabIndex={0}>
            <code className="bg-transparent p-0 text-inherit">
              {lines.map((line, index) => (
                <span
                  className={line.command ? terminalCommand : undefined}
                  key={index}
                >
                  {line.text}
                  {'\n'}
                </span>
              ))}
            </code>
          </pre>
        </figure>
      </div>

      <ul className="mt-8 mr-0 mb-0 ml-0 grid list-none grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4 p-0">
        {abilities.map((ability) => (
          <li className="rounded-md border border-line px-6 py-4 shadow-sm" key={ability.title}>
            <code className="inline-block max-w-full overflow-x-auto rounded-sm bg-mint px-[0.4rem] py-[0.1rem] text-[0.8125rem]">
              {ability.command}
            </code>
            <h3 className="mt-3 mr-0 mb-2 ml-0 text-lg leading-heading">{ability.title}</h3>
            <p className="m-0 text-text-muted">{ability.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 border-t border-line pt-6">
        <p className="mt-0 mr-0 mb-1 ml-0 font-bold">Runtime access without handing over everything</p>
        <p className="m-0 max-w-[48rem] text-sm text-text-muted">
          <code>rgsh</code> listens on localhost only, and commands are JSON data rather than evaluated code.
          It needs the extension open on your app&rsquo;s tab, the <code>ws</code> dev dependency, and the{' '}
          <code>react-global-state-hooks/debug</code> import in development. Part of react-global-state-hooks{' '}
          {PACKAGE_VERSION}.
        </p>
      </div>
    </Section>
  );
}
