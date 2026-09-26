import '../shared/demo.css';
import './async.css';
import { RenderCount } from '../shared/RenderCount';
import { useServer, useUsers } from './fakeApi';

const statuses = ['idle', 'loading', 'error', 'success'] as const;

const symbol = {
  idle: 'M2 5h7l3 3h10v13H2z',
  loading: 'M3 10a9 9 0 1 1 2 9M3 3v7h7',
  error: 'm12 3 10 18H2zm0 6v5m0 3h.01',
  success: 'm5 12 4 4L19 6',
};

function UsersPanel() {
  const [{ status, users, error, attempts }, actions] = useUsers();

  return (
    <section className="demo-card async-stage-card" aria-label="Users">
      <RenderCount />
      <div className="async-track" aria-label="Request state">
        {statuses.map((name) => (
          <span className={name === status ? 'active' : undefined} key={name}>
            {name}
          </span>
        ))}
      </div>
      <div className={`async-stage async-stage--${status}`} aria-busy={status === 'loading'}>
        <div className="async-symbol">
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d={symbol[status]} />
          </svg>
        </div>
        <p className="async-status" role="status">
          {status === 'idle' && 'Nothing loaded yet.'}
          {status === 'loading' && 'Loading users…'}
          {status === 'success' && `Loaded ${users.length} users.`}
          {status === 'error' && `Failed: ${error}`}
        </p>
        <p className="async-hint">
          {status === 'idle' && 'Load users to start the request.'}
          {status === 'loading' && 'The request is in progress.'}
          {status === 'success' && 'The same action reloads the list.'}
          {status === 'error' && 'Nothing was lost. Turn off the failing server and try again.'}
        </p>
        {status === 'success' && (
          <ul className="async-users">
            {users.map((user) => (
              <li key={user.id}>{user.name}</li>
            ))}
          </ul>
        )}
        <div className="async-actions">
          <button
            type="button"
            className={status === 'success' ? 'demo-button' : 'demo-button demo-button--primary'}
            onClick={() => actions.load()}
            disabled={status === 'loading'}
          >
            {status === 'error' ? 'Retry' : status === 'success' ? 'Reload' : status === 'loading' ? 'Loading…' : 'Load users'}
          </button>
          <span className="async-attempts">attempts: {attempts}</span>
        </div>
      </div>
    </section>
  );
}

function ServerSwitch() {
  const [failing, setServer] = useServer((server) => server.failing);
  const [status] = useUsers((state) => state.status);

  return (
    <section className="demo-card" aria-label="Server">
      <label className="async-switch">
        <input
          type="checkbox"
          checked={failing}
          disabled={status === 'loading'}
          onChange={() => setServer((server) => ({ ...server, failing: !server.failing }))}
        />
        <span>Simulate a failing server</span>
      </label>
    </section>
  );
}

/** Returns both demo stores to idle. */
export const resetAsyncDemo = () => {
  useUsers.actions.restore();
  useServer.setState({ failing: false });
};

export function AsyncDemo() {
  return (
    <div className="demo">
      <div className="demo-grid demo-grid--stack">
        <UsersPanel />
        <ServerSwitch />
      </div>
    </div>
  );
}
