import { links, withBase } from '../lib/site';
import { ButtonLink } from './ButtonLink';

export function TryDevTools() {
  return (
    <aside
      className="my-8 rounded-sm border border-l-4 border-line border-l-primary bg-bg p-[clamp(1.25rem,3vw,2rem)]"
      aria-label="Try DevTools on this website"
    >
      <div>
        <p className="mb-2 text-sm font-bold text-primary">Live on this website</p>
        <h3 className="mb-3 text-[clamp(1.25rem,2.5vw,1.65rem)] leading-heading">This website is your DevTools playground.</h3>
        <p>
          The demos are already connected. Add the Chrome extension and explore their real stores,
          actions, and state changes. No project setup or library installation needed.
        </p>
      </div>
      <ol className="my-4 space-y-2 pl-6">
        <li>Install the extension using the link below.</li>
        <li>Open Chrome DevTools on a demo page and select the react-global-state-hooks panel.</li>
        <li>Reload with the panel open, then interact with the demo and watch its state change.</li>
      </ol>
      <div className="flex flex-wrap items-center gap-4">
        <ButtonLink href={links.chromeStore} target="_blank" rel="noopener noreferrer">
          Install the Chrome extension
          <span className="sr-only"> (opens in a new tab)</span>
        </ButtonLink>
        <a href={`${withBase('docs/devtools/')}#try-it-on-this-website`}>Show me how</a>
      </div>
    </aside>
  );
}
