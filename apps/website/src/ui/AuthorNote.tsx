import { links, withBase } from '../lib/site';
import { ButtonLink } from './ButtonLink';
import { Section, SectionTitle } from './Section';

export function AuthorNote() {
  return (
    <Section aria-labelledby="author-heading">
      <div className="grid overflow-hidden rounded-md border border-line bg-mint md:grid-cols-[208px_minmax(0,1fr)] md:gap-x-8 md:ps-8 md:pe-0">
        <a
          className="order-2 mt-0 mr-0 mb-0 ml-6 block w-40 self-end leading-[0] md:order-0 md:mx-0 md:mt-8 md:mb-0 md:w-52"
          href={withBase('about/')}
          aria-label="About Johnny Quesada"
        >
          <img
            src={withBase('img/johnny-256.png')}
            srcSet={`${withBase('img/johnny-256.png')} 256w, ${withBase('img/johnny-512.png')} 512w`}
            sizes="(min-width: 48rem) 208px, 160px"
            width={208}
            height={246}
            className="block h-auto w-full"
            alt="Portrait of Johnny Quesada"
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="flex flex-col items-start gap-3 p-6 md:py-12 md:ps-0 md:pe-12">
          <p className="m-0 text-sm font-bold text-primary">Who builds it</p>
          <SectionTitle className="m-0" id="author-heading">Johnny Quesada</SectionTitle>
          <p className="m-0 max-w-[40rem] text-lg text-text-muted">
            Senior product engineer on Vonage&rsquo;s video developer platform, with twelve-plus years across
            full-stack architecture, React and TypeScript, performance and developer tooling. I write and
            maintain react-global-state-hooks.
          </p>
          <p className="mt-2 mb-0 flex flex-wrap gap-3">
            <ButtonLink variant="secondary" href={withBase('about/')}>
              About me
            </ButtonLink>
            <ButtonLink variant="secondary" href={links.githubProfile} rel="noopener">
              GitHub
            </ButtonLink>
            <ButtonLink variant="secondary" href={links.npm} rel="noopener">
              npm
            </ButtonLink>
          </p>
        </div>
      </div>
    </Section>
  );
}
