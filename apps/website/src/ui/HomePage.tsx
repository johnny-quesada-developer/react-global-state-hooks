import type { ReactNode } from 'react';
import { links, withBase } from '../lib/site';
import { AuthorChip } from './AuthorChip';
import { CodeBlock } from './CodeBlock';

interface HomePageProps {
  storeSource: string;
  nameCardSource: string;
  /**
   * Interactive islands, passed from the Astro page as named slots (`slot="install"` becomes the
   * `install` prop at render time). Astro's type checker cannot see slots, so they are optional here.
   */
  install?: ReactNode;
  video?: ReactNode;
  demo?: ReactNode;
}

export function HomePage({ storeSource, nameCardSource, install, video, demo }: HomePageProps) {
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

            <AuthorChip />
          </div>

          <div className="hero__video">{video}</div>
        </div>
      </section>

      <section className="section container" aria-labelledby="code-heading">
        <h2 id="code-heading">A store is one call. A component is one line.</h2>
        <p className="section__lede">
          These are the exact files behind the live demo below, not a separate illustration.
        </p>
        <div className="code-pair">
          <CodeBlock code={storeSource} lang="ts" title="store.ts" />
          <CodeBlock code={nameCardSource} lang="tsx" title="NameCard.tsx" />
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

      <section className="section container" aria-labelledby="learn-heading">
        <h2 id="learn-heading">Keep learning</h2>
        <ul className="learn">
          <li>
            <a href={gettingStarted}>Getting started</a> Install, create a store, select, act, persist.
          </li>
          <li>
            <a href={withBase('examples/')}>Examples</a> Task list, async loading and retry, persistence and
            scoped state, each with live source.
          </li>
          <li>
            <a href={links.videoTutorial} rel="noopener">
              Video tutorial
            </a>{' '}
            Walkthrough on YouTube.
          </li>
          <li>
            <a href={links.liveDemo} rel="noopener">
              Live demo app
            </a>{' '}
            A larger example app on GitHub Pages.
          </li>
          <li>
            <a href={links.chromeStore} rel="noopener">
              DevTools extension
            </a>{' '}
            Inspect, edit and time-travel your stores in Chrome.
          </li>
        </ul>
      </section>

      <section className="section container other" aria-labelledby="other-heading">
        <h2 id="other-heading">Other projects</h2>
        <p>
          <a href={links.easyWebWorker} rel="noopener">
            easy-web-worker
          </a>{' '}
          runs functions in Web Workers without separate worker files. It lives in its own repository.
        </p>
        <p>
          <a href={withBase('easy-code-review/')}>easy-code-review</a> (beta, not published yet) runs an AI
          coding agent in small, verified steps.
        </p>
      </section>
    </>
  );
}
