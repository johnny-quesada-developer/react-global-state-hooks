import data from '../data/devtools-shots.json';
import { withBase } from '../lib/site';

type ShotId = 'track-state-changes' | 'restore-the-state' | 'modify-the-state' | 'custom-actions-granularity';

const copy: Record<ShotId, { heading: string; caption: string; appAlt: string; panelAlt: string }> = {
  'track-state-changes': {
    heading: 'Track state changes',
    caption:
      'Three clicks on +1 in the app. The panel lists the store’s initialize step and each of the three setState calls, in order.',
    appAlt: 'The playground counter card showing the value 3.',
    panelAlt:
      'The DevTools panel with the counter store selected on the Logs tab, listing its initialize and three setState records.',
  },
  'restore-the-state': {
    heading: 'Restore a previous state',
    caption:
      'Restoring the second log entry from its menu puts the app back to that state: the counter returns from 3 to 1.',
    appAlt: 'The playground counter card showing the value 1 after the restore.',
    panelAlt: 'The DevTools panel on the Logs tab of the counter store after restoring the second entry.',
  },
  'modify-the-state': {
    heading: 'Edit the state',
    caption:
      'On the State tab, type a new value and apply it. The app updates immediately: the counter now shows 42.',
    appAlt: 'The playground counter card showing the value 42.',
    panelAlt:
      'The DevTools panel on the State tab of the counter store, with the value 42 applied through the state editor.',
  },
  'custom-actions-granularity': {
    heading: 'Follow actions',
    caption:
      'A store with actions logs each call by name. Adding a todo in the app shows up as the add action in the panel.',
    appAlt: 'The playground todos card with the new todo “Write the docs” added.',
    panelAlt: 'The DevTools panel on the Logs tab of the todos store, showing the add action.',
  },
};

/**
 * One scenario: the app and the DevTools panel as two separate real captures, side by side on wide screens and
 * stacked on narrow ones. They are shown together to explain the relationship, not as a single browser view.
 */
export function DevToolsShot({ id }: { id: ShotId }) {
  const shot = data.shots.find((item) => item.id === id);
  if (!shot) throw new Error(`No captured screenshot for "${id}". Run scripts/capture-devtools.mjs.`);
  const text = copy[id];

  return (
    <figure className="shot">
      <div className="shot__grid">
        <figure className="shot__item shot__item--app">
          <img
            src={withBase(`devtools/${shot.app.file}`)}
            width={shot.app.width}
            height={shot.app.height}
            alt={text.appAlt}
            loading="lazy"
            decoding="async"
          />
          <figcaption>The app</figcaption>
        </figure>
        <figure className="shot__item shot__item--panel">
          <img
            src={withBase(`devtools/${shot.panel.file}`)}
            width={shot.panel.width}
            height={shot.panel.height}
            alt={text.panelAlt}
            loading="lazy"
            decoding="async"
          />
          <figcaption>The DevTools panel</figcaption>
        </figure>
      </div>
      <figcaption className="shot__caption">
        <strong>{text.heading}.</strong> {text.caption}
      </figcaption>
    </figure>
  );
}
