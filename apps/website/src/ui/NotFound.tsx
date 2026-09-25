import { withBase } from '../lib/site';
import { ButtonLink } from './ButtonLink';

export function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[40rem] px-4 py-18 md:px-6">
      <h1 className="mb-4">Page not found</h1>
      <p>The page you asked for does not exist or has moved.</p>
      <p>
        <ButtonLink href={withBase()}>
          Back to the home page
        </ButtonLink>
        <ButtonLink variant="secondary" className="ml-2" href={withBase('docs/')}>
          Browse the docs
        </ButtonLink>
      </p>
    </div>
  );
}
