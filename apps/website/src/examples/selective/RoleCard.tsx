import { useId } from 'react';
import { RenderCount } from './RenderCount';
import { useProfile } from './store';

const roles = ['Engineer', 'Designer', 'Manager'];

export function RoleCard() {
  const [role, setProfile] = useProfile((profile) => profile.role);
  const group = useId();

  // Radio buttons instead of a <select>: the browser's native dropdown popup can take a noticeable
  // time to open, which made this card feel slower than the others. The update path is the same.
  return (
    <section className="demo-card" aria-label="Role card">
      <RenderCount />
      <fieldset className="segmented">
        <legend>Role</legend>
        {roles.map((option) => (
          <label key={option}>
            <input
              type="radio"
              name={group}
              value={option}
              checked={role === option}
              onChange={() => setProfile((profile) => ({ ...profile, role: option }))}
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
