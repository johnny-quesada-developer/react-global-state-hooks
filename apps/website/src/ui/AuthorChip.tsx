import { links, withBase } from '../lib/site';

export function AuthorChip() {
  return (
    <div className="author">
      <a
        className="author__photo"
        href={links.githubProfile}
        rel="noopener"
        aria-label="Johnny Quesada on GitHub"
      >
        <img
          src={withBase('img/johnny-256.png')}
          srcSet={`${withBase('img/johnny-256.png')} 256w, ${withBase('img/johnny-512.png')} 512w`}
          sizes="88px"
          width={88}
          height={104}
          alt="Portrait of Johnny Quesada"
          decoding="async"
        />
      </a>
      <p className="author__text">
        <strong>Johnny Quesada</strong>
        <span>Senior product engineer at Vonage. Author and maintainer of this library.</span>
      </p>
    </div>
  );
}
