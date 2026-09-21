import { useState } from 'react';
import '../shared/demo.css';
import './async.css';
import { RenderCount } from '../shared/RenderCount';
import { useServer, useUsers } from './fakeApi';

function UsersPanel() {
  const [{ status, users, error, attempts }, actions] = useUsers();

  return (
    <section className="demo-card" aria-label="Users">
      <RenderCount />
      <p className="async-status" role="status">
        {status === 'idle' && 'Nothing loaded yet.'}
        {status === 'loading' && 'Loading users…'}
        {status === 'success' && `Loaded ${users.length} users.`}
        {status === 'error' && `Failed: ${error}`}
      </p>
      {status === 'success' && (
        <ul className="async-users">
          {users.map((user) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
      <div className="async-actions">
        <button type="button" onClick={() => actions.load()} disabled={status === 'loading'}>
          {status === 'error' ? 'Retry' : status === 'success' ? 'Reload' : 'Load users'}
        </button>
        <span className="async-attempts">attempts: {attempts}</span>
      </div>
    </section>
  );
}

function ServerSwitch() {
  const [failing, setServer] = useServer((server) => server.failing);

  return (
    <section className="demo-card demo-card--whole" aria-label="Server">
      <label className="async-switch">
        <input
          type="checkbox"
          checked={failing}
          onChange={() => setServer((server) => ({ ...server, failing: !server.failing }))}
        />
        <span>Simulate a failing server</span>
      </label>
    </section>
  );
}

export function AsyncDemo() {
  const [epoch, setEpoch] = useState(0);

  const reset = () => {
    useUsers.reset({ status: 'idle', users: [], error: null, attempts: 0 }, { latestRequest: 0 });
    useServer.reset({ failing: false }, {});
    setEpoch((current) => current + 1);
  };

  return (
    <div className="demo">
      <div className="demo-grid demo-grid--wide" key={epoch}>
        <UsersPanel />
        <ServerSwitch />
      </div>
      <button type="button" className="demo-reset" onClick={reset}>
        Reset demo
      </button>
    </div>
  );
}
