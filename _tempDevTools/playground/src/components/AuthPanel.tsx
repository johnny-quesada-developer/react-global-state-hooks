import { useState } from 'react';
import { useAuth } from '../stores/auth';
import { Panel, btn, input } from './Panel';

export function AuthPanel() {
  const [auth, actions] = useAuth();
  const { isLoading, lastError } = useAuth.getMetadata();

  const [email, setEmail] = useState('john@example.com');
  const [password, setPassword] = useState('secret');

  return (
    <Panel title="Auth (sync + async actions · react-global-state-hooks)">
      {auth.user ? (
        <div>
          <p>
            Signed in as <strong>{auth.user.name}</strong> ({auth.user.email})
          </p>
          <p style={{ wordBreak: 'break-all', color: '#777' }}>token: {auth.token}</p>
          <button style={btn} onClick={() => actions.refreshToken()}>
            refresh token (async)
          </button>
          <button style={btn} onClick={() => actions.logout()}>
            logout
          </button>
        </div>
      ) : (
        <div>
          <div>
            <input
              style={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
            />
          </div>
          <div>
            <input
              style={input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
            />
          </div>
          <button style={btn} disabled={isLoading} onClick={() => actions.login(email, password)}>
            {isLoading ? 'logging in…' : 'login (async)'}
          </button>
          <button style={btn} disabled={isLoading} onClick={() => actions.login(email, '')}>
            login with bad password (async reject-ish)
          </button>
          {lastError && <p style={{ color: '#c0392b' }}>{lastError}</p>}
        </div>
      )}
    </Panel>
  );
}
