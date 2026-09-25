import type { ReactNode } from 'react';
import { Badge } from './Badge';
import { BenefitCard, BenefitList } from './BenefitList';
import { ButtonLink } from './ButtonLink';
import { PageShell } from './PageShell';
import { ResourceItem, ResourceList } from './ResourceList';
import { Section, SectionLede, SectionTitle } from './Section';
import { links, withBase } from '../lib/site';
import { AgenticDevTools } from './AgenticDevTools';
import { AuthorNote } from './AuthorNote';
import { CodeBlock } from './CodeBlock';
import { TryDevTools } from './TryDevTools';

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
      <section className="bg-[linear-gradient(180deg,var(--color-mint)_0%,var(--color-bg)_100%)] pt-8 pb-4">
        <PageShell className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-12">
          <div className="flex flex-col items-start gap-4">
            <p className="m-0 text-sm font-bold text-primary">React state management</p>
            <h1 className="text-3xl leading-heading">
              Shared React state that works like <code className="bg-yellow text-[0.9em]">useState</code>
            </h1>
            <p className="m-0 max-w-[34rem] text-lg text-text-muted">
              Create a store with one call, use it in any component, and re-render only the components whose
              selected slice changed. No provider required.
            </p>

            {install}

            <p className="m-0 flex flex-wrap gap-3">
              <ButtonLink href={gettingStarted}>
                Get started
              </ButtonLink>
              <ButtonLink variant="secondary" href={withBase('examples/')}>
                Explore examples
              </ButtonLink>
            </p>
          </div>

          <div className="grid w-full min-w-0 gap-3">
            <a
              className="group flex items-center gap-3 border-b border-line pt-2 pb-3 text-text no-underline"
              href="#agentic-devtools"
            >
              <span
                className="grid h-10 flex-[0_0_2.5rem] place-items-center rounded-sm bg-primary text-white"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M10 3 12.5 9.5 19 12l-6.5 2.5L10 21l-2.5-6.5L1 12l6.5-2.5L10 3Z" />
                  <path d="m20 1 1.1 2.9L24 5l-2.9 1.1L20 9l-1.1-2.9L16 5l2.9-1.1L20 1Z" />
                </svg>
              </span>
              <span className="grid min-w-0 gap-[0.125rem]">
                <strong className="text-base leading-[1.3] group-hover:text-primary group-hover:underline group-hover:underline-offset-[0.2em]">
                  Agentic state management
                </strong>
                <span className="text-sm text-text-muted">
                  Live state. Real actions. Results your agent can verify.
                </span>
              </span>
              <span className="ml-auto px-2 text-[1.35rem] text-primary" aria-hidden="true">
                ↗
              </span>
            </a>
            {video}
          </div>
        </PageShell>
      </section>

      <PageShell as="section" className="py-4" aria-label="One call creates the store">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))] wide:grid-cols-[repeat(3,minmax(0,1fr))] wide:grid-rows-[auto_1fr]">
          <p className="mt-0 mr-0 mb-3 ml-0 text-xl font-bold wide:col-start-1 wide:row-start-1">
            No providers. No context boilerplate. No configuration files.
          </p>
          <CodeBlock
            className="code-block--compact wide:col-start-1 wide:row-start-2"
            code={oneLinerSource}
            lang="ts"
            title="Counter.ts"
          />
          <CodeBlock
            className="code-block--compact wide:col-start-2 wide:row-start-2"
            code={useItSource}
            lang="tsx"
            title="CounterButton.tsx"
          />
          <CodeBlock
            className="code-block--compact wide:col-start-3 wide:row-start-2"
            code={shareItSource}
            lang="tsx"
            title="Labels.tsx"
          />
        </div>
      </PageShell>

      <Section tone="tinted" shell={false} id="demo" aria-labelledby="demo-heading">
        <PageShell>
          <SectionTitle id="demo-heading">Change one field, watch which components render</SectionTitle>
          <SectionLede>
            Each card shows how many times it has rendered. Type a name: the Name card and the whole-state
            card render again, the Role and Clicks cards do not. The whole-state card has no selector, so it
            renders for every change.
          </SectionLede>
          {demo}
          <TryDevTools />
        </PageShell>
      </Section>

      <AgenticDevTools session={agenticSession} />

      <Section aria-labelledby="benefits-heading">
        <SectionTitle id="benefits-heading">What you get</SectionTitle>
        <BenefitList>
          {benefits.map((benefit) => (
            <BenefitCard title={<a href={benefit.href}>{benefit.title}</a>} key={benefit.title}>
              {benefit.body}
            </BenefitCard>
          ))}
        </BenefitList>
      </Section>

      <Section aria-labelledby="code-heading">
        <SectionTitle id="code-heading">A store is one call. A component is one line.</SectionTitle>
        <SectionLede>
          Use the same store and component code that powers the live demo above.
        </SectionLede>
        <div className="grid gap-4 wider:grid-cols-[repeat(2,minmax(0,1fr))]">
          <CodeBlock
            className="code-block--fill flex h-full flex-col"
            code={storeSource}
            lang="ts"
            title="store.ts"
          />
          <CodeBlock
            className="code-block--fill flex h-full flex-col"
            code={nameCardSource}
            lang="tsx"
            title="NameCard.tsx"
          />
        </div>
      </Section>

      <AuthorNote />

      <Section aria-labelledby="learn-heading">
        <SectionTitle id="learn-heading">Keep learning</SectionTitle>
        <SectionLede>A path from your first store to driving one from a terminal.</SectionLede>
        <ResourceList>
          {learningPath.map((resource, index) => (
            <ResourceItem
              key={resource.title}
              step={String(index + 1).padStart(2, '0')}
              title={
                <a href={resource.href} rel={resource.external ? 'noopener' : undefined}>
                  {resource.title}
                </a>
              }
            >
              {resource.body}
            </ResourceItem>
          ))}
        </ResourceList>
      </Section>

      <Section aria-labelledby="other-heading">
        <SectionTitle id="other-heading">Other projects</SectionTitle>
        <SectionLede>Developer tooling, built the same way as this library.</SectionLede>
        <ResourceList as="ul" layout="grid">
          {otherProjects.map((project) => (
            <ResourceItem
              key={project.title}
              title={
                <>
                  <a href={project.href} rel={project.external ? 'noopener' : undefined}>
                    {project.title}
                  </a>
                  {project.badge && <Badge>{project.badge}</Badge>}
                </>
              }
            >
              {project.body}
            </ResourceItem>
          ))}
        </ResourceList>
      </Section>
    </>
  );
}
