import { links, withBase } from '../lib/site';

export function AuthorNote() {
  return (
    <section className="section container" aria-labelledby="author-heading">
      <div className="author-note">
        <a className="author-note__photo" href={withBase('about/')} aria-label="About Johnny Quesada">
          <img
            src={withBase('img/johnny-256.png')}
            srcSet={`${withBase('img/johnny-256.png')} 256w, ${withBase('img/johnny-512.png')} 512w`}
            sizes="(min-width: 48rem) 208px, 160px"
            width={208}
            height={246}
            alt="Portrait of Johnny Quesada"
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="author-note__body">
          <p className="author-note__eyebrow">Who builds it</p>
          <h2 id="author-heading">Johnny Quesada</h2>
          <p className="author-note__text">
            Senior product engineer on Vonage&rsquo;s video developer platform, with twelve-plus years across
            full-stack architecture, React and TypeScript, performance and developer tooling. I write and
            maintain react-global-state-hooks.
          </p>
          <p className="author-note__links">
            <a className="button button--secondary" href={withBase('about/')}>
              About me
            </a>
            <a className="button button--secondary" href={links.githubProfile} rel="noopener">
              GitHub
            </a>
            <a className="button button--secondary" href={links.npm} rel="noopener">
              npm
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
