import { RenderCount } from '../shared/RenderCount';
import { useProfile } from './store';

export function WholeStateCard() {
  // No selector: subscribes to the whole state, so every change re-renders this component.
  const [profile] = useProfile();

  return (
    <section className="demo-card demo-card--wide" aria-label="Whole state card">
      <RenderCount />
      <span>Whole state</span>
      <pre className="demo-json">{JSON.stringify(profile, null, 2)}</pre>
      <p className="demo-caption">No selector: this card subscribes to the whole store and renders for every change.</p>
    </section>
  );
}
