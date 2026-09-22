import { links, withBase } from '../lib/site';

export function TryDevTools() {
  return (
    <aside className="try-devtools" aria-label="Try DevTools on this website">
      <div>
        <p className="try-devtools__eyebrow">Live on this website</p>
        <h3>This website is your DevTools playground.</h3>
        <p>
          The demos are already connected. Add the Chrome extension and explore their real stores,
          actions, and state changes. No project setup or library installation needed.
        </p>
      </div>
      <ol className="try-devtools__steps">
        <li>Install the extension using the link below.</li>
        <li>Open Chrome DevTools on a demo page and select the react-global-state-hooks panel.</li>
        <li>Reload with the panel open, then interact with the demo and watch its state change.</li>
      </ol>
      <div className="try-devtools__actions">
        <a className="button button--primary" href={links.chromeStore} target="_blank" rel="noopener noreferrer">
          Install the Chrome extension
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <a href={`${withBase('docs/devtools/')}#try-it-on-this-website`}>Show me how</a>
      </div>
    </aside>
  );
}
