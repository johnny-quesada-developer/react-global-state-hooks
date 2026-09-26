import { withBase } from '../../lib/site';
import { ButtonLink } from '../Button';
import { CodeBlock } from '../CodeBlock';
import { Eyebrow, SectionHead } from '../Eyebrow';
import { Badge } from '../Badge';
import { Icon } from '../Icon';
import { MiniNode, Panel, PanelTop } from '../Panel';
import { RowLink, RowLinks } from '../RowLinks';
import { StripCta } from '../StripCta';

export interface HubPage {
  id: string;
  title: string;
  description: string;
}

export interface HubSection {
  title: string;
  pages: HubPage[];
}

const mentalModel = `const useCount = createGlobalState(0);\n\nconst [count, setCount] = useCount();`;

/** The documentation hub: introduction and search, starting points, grouped topics, next step. */
export function DocsHub({ sections }: { sections: HubSection[] }) {
  return (
    <div className="wrap">
      <section className="grid grid-cols-[1.15fr_1fr] items-center gap-[70px] pt-[74px] pb-12 max-3xl:gap-[35px] max-xl:gap-[30px] max-md:grid-cols-[minmax(0,1fr)] max-md:gap-[25px] max-md:pt-[43px] max-md:pb-[30px]">
        <div className="min-w-0">
          <Eyebrow className="mb-[21px]">Documentation</Eyebrow>
          <h1 className="max-xl:text-[46px] max-md:text-[43px] max-xs:text-38">
            Small API.
            <br />
            Clear mental model.
          </h1>
          <p className="mb-7 max-w-[560px] text-17 leading-[1.7] max-md:text-15">
            Start with a shared store. Add precision, structure and visibility as your application grows.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ButtonLink variant="primary" icon="arrow" href={withBase('docs/getting-started/')}>
              Start building
            </ButtonLink>
            <ButtonLink icon="arrow" href={withBase('docs/global-state-api/')}>
              API reference
            </ButtonLink>
          </div>
          <button
            type="button"
            className="mt-3 flex w-full max-w-[460px] items-center gap-3 rounded-control border border-line bg-paper px-4 py-[13px] text-left text-12 text-muted hover:border-[#b4c1b8]"
            data-dialog="search"
          >
            <Icon name="search" />
            <span>Find a concept or API…</span>
            <kbd className="ml-auto" aria-hidden="true">
              ⌘ K
            </kbd>
          </button>
        </div>
        <Panel tone="soft">
          <PanelTop>
            <Eyebrow>The mental model</Eyebrow>
            <Badge>01 / 03</Badge>
          </PanelTop>
          <div className="overflow-hidden rounded-[9px] border border-line bg-paper shadow-code [&_.code-block]:m-0 [&_.code-block]:border-0 [&_.line]:before:hidden [&_pre]:text-11">
            <CodeBlock code={mentalModel} lang="tsx" title="counter.tsx" />
          </div>
          <div className="flex items-center justify-center gap-3">
            <MiniNode tone="accent" className="min-h-[60px] flex-1 justify-center text-center text-10">
              One store
            </MiniNode>
            <Icon name="arrow" />
            <MiniNode className="min-h-[60px] flex-1 justify-center text-center text-10">Any component</MiniNode>
          </div>
          <p className="mt-6 mb-0 text-13">
            A hook for components.
            <br />A state API for everything else.
          </p>
        </Panel>
      </section>

      <section>
        <RowLinks>
          <RowLink href={withBase('docs/getting-started/')} kicker={<span className="font-mono text-12 text-green">01</span>} title="New to the library?" text="Build your first shared counter." />
          <RowLink href={withBase('docs/global-state-api/')} kicker={<span className="font-mono text-12 text-green">02</span>} title="Know what you need?" text="Go directly to the API." />
          <RowLink href={withBase('examples/')} kicker={<span className="font-mono text-12 text-green">03</span>} title="Prefer to try it?" text="Explore five interactive examples." />
        </RowLinks>
      </section>

      <section>
        <SectionHead kicker="Find your way" title="A guide for every layer." />
        {sections.map((section) => (
          <div className="grid grid-cols-[200px_1fr] gap-[25px] border-t border-line py-[26px] max-xl:grid-cols-[145px_1fr] max-md:grid-cols-1 max-md:gap-2 max-md:py-[23px]" key={section.title}>
            <h3 className="mt-3 text-17 max-md:mt-0 max-md:mb-[5px] max-md:text-18">{section.title}</h3>
            <div className="grid grid-cols-2 gap-x-7 gap-y-[6px] max-xl:gap-x-[10px] max-xl:gap-y-[5px] max-md:grid-cols-1">
              {section.pages.map((page) => (
                <a className="group block min-w-0 rounded-[8px] px-3 pt-3 pb-[17px] hover:bg-soft max-md:px-1" href={withBase(`docs/${page.id}/`)} key={page.id}>
                  <h4 className="mb-2 flex justify-between gap-[10px] text-15 group-hover:text-green max-md:text-16">
                    {page.title}
                    <Icon name="arrow" className="size-[14px]" />
                  </h4>
                  <p className="m-0 text-12 leading-[1.65]">{page.description}</p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </section>

      <StripCta
        title="When the state is the evidence."
        text="Connect your browser, terminal and coding agent."
        action={
          <ButtonLink icon="arrow" href={withBase('agentic-devtools/')}>
            Explore DevTools
          </ButtonLink>
        }
      />
    </div>
  );
}
