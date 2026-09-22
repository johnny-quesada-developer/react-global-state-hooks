import { RenderCount } from '../shared/RenderCount';
import { useProfile } from './store';

export function WholeStateCard() {
  // No selector: subscribes to the whole state, so every change re-renders this component.
  const [profile] = useProfile();

  return (
    <section className="demo-card demo-card--whole" aria-label="Whole state card">
      <RenderCount />
      <span>Whole state</span>
      <pre className="demo-json">{JSON.stringify(profile, null, 2)}</pre>
    </section>
  );
}
