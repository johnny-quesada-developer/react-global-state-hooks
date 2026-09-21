import { RenderCount } from '../shared/RenderCount';
import { useProfile } from './store';

export function NameCard() {
  // Subscribes to `name` only: role and click changes never re-render this component.
  const [name, setProfile] = useProfile((profile) => profile.name);

  return (
    <section className="demo-card" aria-label="Name card">
      <RenderCount />
      <label>
        Name
        <input
          value={name}
          onChange={(event) => setProfile((profile) => ({ ...profile, name: event.target.value }))}
        />
      </label>
    </section>
  );
}
