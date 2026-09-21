import { withBase } from '../lib/site';

export function AuthorChip() {
  return (
    <div className="author">
      <a className="author__photo" href={withBase('about/')} aria-label="About Johnny Quesada">
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
        <strong>
          <a href={withBase('about/')}>Johnny Quesada</a>
        </strong>
        <span>Senior product engineer at Vonage. Author and maintainer of this library.</span>
      </p>
    </div>
  );
}
