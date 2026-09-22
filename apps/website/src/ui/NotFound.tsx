import { withBase } from '../lib/site';

export function NotFound() {
  return (
    <div className="container not-found">
      <h1>Page not found</h1>
      <p>The page you asked for does not exist or has moved.</p>
      <p>
        <a className="button button--primary" href={withBase()}>
          Back to the home page
        </a>
        <a className="button button--secondary" href={withBase('docs/')}>
          Browse the docs
        </a>
      </p>
    </div>
  );
}
