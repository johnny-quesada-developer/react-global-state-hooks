import data from '../data/devtools-showcase.json';
import { withBase } from '../lib/site';

type Id =
  | 'whole-screen'
  | 'app'
  | 'store-list'
  | 'logs-list'
  | 'state-changes'
  | 'time-logs'
  | 'restore-dialog'
  | 'state-tab'
  | 'action-groups'
  | 'actions-tab';

const copy: Record<Id, { title: string; caption: string; alt: string }> = {
  'whole-screen': {
    title: 'The whole DevTools window',
    caption:
      'The extension lives in its own DevTools panel. Stores on the left, the logs of the selected store in the middle, and what one change did on the right.',
    alt: 'The whole Chrome DevTools window in the light theme, with the react-global-state-hooks panel open on the counter store: the store list, its logs, and the details of one change.',
  },
  app: {
    title: 'The app being inspected',
    caption: 'The playground in this repository. Every card is backed by a global store or a context.',
    alt: 'The playground app, a page of cards for the counter, todos and other stores that the panel is connected to.',
  },
  'store-list': {
    title: 'Every store, in one list',
    caption:
      'All global states and contexts in the app, numbered so you can jump to them. Contexts are labelled.',
    alt: 'The panel’s numbered list of global states and contexts, with the counter store selected.',
  },
  'logs-list': {
    title: 'Logs of the selected store',
    caption:
      'The initialize step and each setState call, in order, with timestamps. Restore, copy or download a state from a row’s menu.',
    alt: 'The logs list of the counter store: the initialize record and four setState records.',
  },
  'state-changes': {
    title: 'What a change did',
    caption: 'Select a log to see the resulting state and how the state changed compared with before.',
    alt: 'The details pane for a selected log, showing the resulting state and how the state changed.',
  },
  'time-logs': {
    title: 'Logs in time order',
    caption:
      'Switch the display from groups to time logs to read everything that happened, oldest to newest.',
    alt: 'The logs pane with the display set to time logs, listing the records in time order.',
  },
  'restore-dialog': {
    title: 'Restore an earlier state',
    caption: 'Restoring asks for confirmation, then sets the app back to that saved state.',
    alt: 'The “Restore this state?” confirmation dialog with Cancel and Restore buttons.',
  },
  'state-tab': {
    title: 'View and edit the state',
    caption: 'The State tab shows the current value of the store and lets you set a new one from an editor.',
    alt: 'The State tab of the counter store: the current state and the editor used to set a new state.',
  },
  'action-groups': {
    title: 'Actions, by name',
    caption:
      'For a store with actions, changes are grouped under the action that made them, such as add on the todos store.',
    alt: 'The logs of the todos store grouped by action, showing the add action.',
  },
  'actions-tab': {
    title: 'The Actions tab',
    caption: 'The actions of the selected store, ready to run from the panel.',
    alt: 'The Actions tab of the todos store.',
  },
};

function Shot({ id, className = '' }: { id: Id; className?: string }) {
  const shot = data.shots.find((item) => item.id === id);
  if (!shot) throw new Error(`No showcase image "${id}". Run scripts/capture-devtools-showcase.mjs.`);
  const text = copy[id];

  return (
    <figure className={`m-0 ${className}`.trim()}>
      <img
        className="block h-auto w-full rounded-md border border-line-strong bg-bg shadow-sm"
        src={withBase(`devtools/showcase/${shot.file}`)}
        width={shot.width}
        height={shot.height}
        alt={text.alt}
        loading="lazy"
        decoding="async"
      />
      <figcaption className="mt-2 max-w-[46rem] text-sm text-text-muted">
        <strong>{text.title}.</strong> {text.caption}
      </figcaption>
    </figure>
  );
}

/** A tour of the extension: the whole window first, then each section as its own capture. */
export function DevToolsShowcase() {
  return (
    <div className="my-6 grid gap-8">
      <Shot id="whole-screen" />

      <div className="grid items-start gap-6 wider:grid-cols-[minmax(0,0.8fr)_minmax(0,0.75fr)_minmax(0,1.4fr)]">
        <Shot id="store-list" />
        <Shot id="logs-list" />
        <Shot id="state-changes" />
      </div>

      <div className="grid items-start gap-6 wider:grid-cols-[repeat(2,minmax(0,1fr))]">
        <Shot id="state-tab" />
        <Shot id="time-logs" />
        <Shot id="action-groups" />
        <Shot id="actions-tab" />
      </div>

      <div className="grid items-start gap-6 wider:grid-cols-[repeat(2,minmax(0,1fr))]">
        <Shot id="restore-dialog" />
        <Shot id="app" />
      </div>

      <p className="m-0 text-sm text-text-muted">
        Captured from the live playground with the extension, in the light theme, against library version{' '}
        {data.capturedWith.libraryVersion}.
      </p>
    </div>
  );
}
