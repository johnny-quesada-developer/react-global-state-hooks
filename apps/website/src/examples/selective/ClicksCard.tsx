import { RenderCount } from '../shared/RenderCount';
import { useProfile } from './store';

export function ClicksCard() {
  const [clicks, setProfile] = useProfile((profile) => profile.clicks);

  return (
    <section className="demo-card" aria-label="Clicks card">
      <RenderCount />
      <span>Clicks</span>
      <button
        type="button"
        onClick={() => setProfile((profile) => ({ ...profile, clicks: profile.clicks + 1 }))}
      >
        Clicked {clicks} times
      </button>
    </section>
  );
}
