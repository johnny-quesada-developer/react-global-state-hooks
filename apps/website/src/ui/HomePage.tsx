import type { ReactNode } from 'react';
import { links, withBase } from '../lib/site';
import { AgenticDevTools } from './AgenticDevTools';
import { AuthorNote } from './AuthorNote';
import { CodeBlock } from './CodeBlock';

interface HomePageProps {
  storeSource: string;
  nameCardSource: string;
  oneLinerSource: string;
  useItSource: string;
  shareItSource: string;
  agenticSession: string;
  /**
   * Interactive islands, passed from the Astro page as named slots (`slot="install"` becomes the
   * `install` prop at render time). Astro's type checker cannot see slots, so they are optional here.
   */
  install?: ReactNode;
  video?: ReactNode;
  demo?: ReactNode;
}

export function HomePage({
  storeSource,
  nameCardSource,
  oneLinerSource,
  useItSource,
  shareItSource,
  agenticSession,
  install,
  video,
  demo,
}: HomePageProps) {
  const gettingStarted = withBase('docs/getting-started/');

  const benefits = [
    {
      title: 'Re-render only what changed',
      body: 'Select a slice of state and the component renders when that slice changes, not on every update.',
      href: `${gettingStarted}#select-a-slice`,
    },
    {
      title: 'Actions when you want structure',
      body: 'Group updates, async work and side effects behind named functions with full type inference.',
      href: `${gettingStarted}#add-actions`,
    },
    {
      title: 'Readable outside React',
      body: 'Read, update and subscribe from API clients, event handlers and tests without a hook.',
      href: `${gettingStarted}#use-state-outside-react`,
    },
    {
      title: 'localStorage in one option',
      body: 'Add a key to save and restore a store in the browser. Validation and versioning are optional.',
      href: `${gettingStarted}#persist-to-localstorage`,
    },
  ];

  const learningPath = [
    {
      title: 'Getting started',
      body: 'Install the package, create your first store, select a slice, add an action, persist it.',
      href: gettingStarted,
    },
    {
      title: 'Examples',
      body: 'Task list, async loading and retry, persistence and scoped state, each with live source.',
      href: withBase('examples/'),
    },
    {
      title: 'Agentic DevTools',
      body: 'Give a coding agent a terminal into the running app: list stores, watch actions, drive state.',
      href: `${withBase('docs/devtools/')}#drive-it-from-a-terminal`,
    },
    {
      title: 'DevTools extension',
      body: 'Inspect, edit and time-travel your stores from a Chrome panel.',
      href: links.chromeStore,
      external: true,
    },
    {
      title: 'Video tutorial',
      body: 'A walkthrough of the library on YouTube.',
      href: links.videoTutorial,
      external: true,
    },
    {
      title: 'Live demo app',
      body: 'A larger example app, deployed on GitHub Pages.',
      href: links.liveDemo,
      external: true,
    },
  ];

  const otherProjects = [
    {
      title: 'easy-web-worker',
      body: 'Runs functions in Web Workers without separate worker files, so parallel work reads like a normal async call.',
      href: links.easyWebWorker,
      external: true,
    },
    {
      title: 'json-storage-formatter',
      body: 'Serializes values that plain JSON.stringify loses — Map, Set, Date, custom classes — for storage and back.',
      href: links.jsonStorageFormatter,
      external: true,
    },
    {
      title: 'easy-code-review',
      body: 'Automates coverage improvements and custom code reviews with measured results, focused retries and detailed reports.',
      href: withBase('easy-code-review/'),
      badge: 'Beta',
    },
  ];

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__copy">
            <p className="hero__eyebrow">React state management</p>
            <h1>
              Shared React state that works like <code>useState</code>
            </h1>
            <p className="hero__lede">
              Create a store with one call, use it in any component, and re-render only the components whose
              selected slice changed. No provider required.
            </p>

            {install}

            <p className="hero__actions">
              <a className="button button--primary" href={gettingStarted}>
                Get started
              </a>
              <a className="button button--secondary" href={withBase('examples/')}>
                Explore examples
              </a>
            </p>
          </div>

          <div className="hero__video">{video}</div>
        </div>
      </section>

      <section className="proof container" aria-label="One call creates the store">
        <div className="proof__demo">
          <p className="proof__statement">No providers. No context boilerplate. No configuration files.</p>
          <CodeBlock code={oneLinerSource} lang="ts" title="Counter.ts" />
          <CodeBlock code={useItSource} lang="tsx" title="CounterButton.tsx" />
          <CodeBlock code={shareItSource} lang="tsx" title="Labels.tsx" />
        </div>
      </section>

      <section className="section section--tinted" id="demo" aria-labelledby="demo-heading">
        <div className="container">
          <h2 id="demo-heading">Change one field, watch which components render</h2>
          <p className="section__lede">
            Each card shows how many times it has rendered. Type a name: the Name card and the whole-state
            card render again, the Role and Clicks cards do not. The whole-state card has no selector, so it
            renders for every change.
          </p>
          {demo}
        </div>
      </section>

      <AgenticDevTools session={agenticSession} />

      <section className="section container" aria-labelledby="benefits-heading">
        <h2 id="benefits-heading">What you get</h2>
        <ul className="benefits">
          {benefits.map((benefit) => (
            <li className="benefit" key={benefit.title}>
              <h3>
                <a href={benefit.href}>{benefit.title}</a>
              </h3>
              <p>{benefit.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section container" aria-labelledby="code-heading">
        <h2 id="code-heading">A store is one call. A component is one line.</h2>
        <p className="section__lede">
          Use the same store and component code that powers the live demo above.
        </p>
        <div className="code-pair">
          <CodeBlock code={storeSource} lang="ts" title="store.ts" />
          <CodeBlock code={nameCardSource} lang="tsx" title="NameCard.tsx" />
        </div>
      </section>

      <AuthorNote />

      <section className="section container" aria-labelledby="learn-heading">
        <h2 id="learn-heading">Keep learning</h2>
        <p className="section__lede">A path from your first store to driving one from a terminal.</p>
        <ol className="resources">
          {learningPath.map((resource, index) => (
            <li className="resource" key={resource.title}>
              <span className="resource__step">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>
                  <a href={resource.href} rel={resource.external ? 'noopener' : undefined}>
                    {resource.title}
                  </a>
                </h3>
                <p>{resource.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="section container other" aria-labelledby="other-heading">
        <h2 id="other-heading">Other projects</h2>
        <p className="section__lede">Developer tooling, built the same way as this library.</p>
        <ul className="resources resources--grid">
          {otherProjects.map((project) => (
            <li className="resource" key={project.title}>
              <div>
                <h3>
                  <a href={project.href} rel={project.external ? 'noopener' : undefined}>
                    {project.title}
                  </a>
                  {project.badge && <span className="badge badge--beta">{project.badge}</span>}
                </h3>
                <p>{project.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
