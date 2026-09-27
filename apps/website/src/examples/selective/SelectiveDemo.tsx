import '../shared/demo.css';
import { ClicksCard } from './ClicksCard';
import { NameCard } from './NameCard';
import { RoleCard } from './RoleCard';
import { WholeStateCard } from './WholeStateCard';
import { initialProfile, useProfile } from './store';

/** Writes the initial profile back. The workbench remounts the cards afterwards, which restarts their counters. */
export const resetSelectiveDemo = () => useProfile.setState(initialProfile());

/** One-line trace for the workbench status bar: which selection changed. */
export function watchSelectiveDemo(log: (line: string) => void) {
  let previous = useProfile.getState();

  return useProfile.subscribe(
    (profile) => {
      const changed = (Object.keys(profile) as (keyof typeof profile)[]).filter((key) => profile[key] !== previous[key]);
      previous = profile;
      if (changed.length) log(`profile.${changed.join(', profile.')} changed · other selections unchanged`);
    },
    { skipFirst: true },
  );
}

export function SelectiveDemo() {
  return (
    <div className="demo">
      <div className="demo-grid">
        <NameCard />
        <RoleCard />
        <ClicksCard />
        <WholeStateCard />
      </div>
    </div>
  );
}
