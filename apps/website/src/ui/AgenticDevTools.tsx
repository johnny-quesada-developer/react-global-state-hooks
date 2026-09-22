import { watchHash } from '../data/heroVideos';
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
    body: 'When you allow it, run an action or write state, so the agent can reproduce behavior and verify its own fix.',
  },
];

const parse = (session: string) =>
  session
    .trimEnd()
    .split('\n')
    .map((line) =>
      line.startsWith('$ ') ? { command: true, text: line.slice(2) } : { command: false, text: line },
    );

export function AgenticDevTools({ session }: AgenticDevToolsProps) {
  const lines = parse(session);

  return (
    <section className="section container agentic" id="agentic-devtools" aria-labelledby="agentic-heading">
      <div className="agentic__intro">
        <p className="agentic__eyebrow">Agentic DevTools</p>
        <h2 id="agentic-heading">Give your coding agent the runtime trace</h2>
        <p className="agentic__lede">
          Coding agents already read source code well. The weak point is runtime behavior: without a way to
          see it directly, an agent reconstructs what happened from screenshots, DOM dumps and console output.{' '}
          <code>rgsh</code> exposes actions, exact state changes and timing as structured data it can read
          straight from the terminal.
        </p>
        <p className="agentic__distinction">
          Browser automation performs the interaction. Agentic DevTools tells the agent what actually changed.
        </p>
        <p className="agentic__actions">
          <a className="button button--primary" href={watchHash('runtime-debugging')}>
            Watch it debug a real run
          </a>
          <a
            className="button button--secondary"
            href={`${withBase('docs/devtools/')}#drive-it-from-a-terminal`}
          >
            Read the docs
          </a>
        </p>
      </div>

      <div className="agentic__stage">
        <ol className="agentic__flow" aria-label="How the agent reaches the running app">
          {flow.map((step) => (
            <li key={step.name}>
              <strong>{step.name}</strong>
              <span>{step.detail}</span>
            </li>
          ))}
        </ol>

        <figure className="terminal">
          <figcaption className="terminal__title">
            Real output from this repository&rsquo;s playground
          </figcaption>
          <pre className="terminal__body" tabIndex={0}>
            <code>
              {lines.map((line, index) => (
                <span
                  className={line.command ? 'terminal__line terminal__line--command' : 'terminal__line'}
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

      <ul className="agentic__abilities">
        {abilities.map((ability) => (
          <li className="ability" key={ability.title}>
            <code>{ability.command}</code>
            <h3>{ability.title}</h3>
            <p>{ability.body}</p>
          </li>
        ))}
      </ul>

      <div className="agentic__trust">
        <p className="agentic__trust-title">Runtime access without handing over everything</p>
        <p className="agentic__note">
          <code>rgsh</code> listens on localhost only, commands are JSON data rather than evaluated code, and
          changing the app stays off until you explicitly allow it in the DevTools panel, under Terminal
          connection. It needs the extension open on your app&rsquo;s tab, the <code>ws</code> dev dependency,
          and the <code>react-global-state-hooks/debug</code> import in development. Part of
          react-global-state-hooks {PACKAGE_VERSION}.
        </p>
      </div>
    </section>
  );
}
