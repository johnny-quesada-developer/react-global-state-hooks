import '../shared/demo.css';
import { ClicksCard } from './ClicksCard';
import { NameCard } from './NameCard';
import { RoleCard } from './RoleCard';
import { WholeStateCard } from './WholeStateCard';
import { initialProfile, useProfile } from './store';

/** Writes the initial profile back. The workbench remounts the cards afterwards, which restarts their counters. */
export const resetSelectiveDemo = () => useProfile.setState(initialProfile());

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
