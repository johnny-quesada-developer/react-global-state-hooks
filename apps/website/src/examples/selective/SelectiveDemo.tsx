import { useState } from 'react';
import '../shared/demo.css';
import { ClicksCard } from './ClicksCard';
import { NameCard } from './NameCard';
import { RoleCard } from './RoleCard';
import { WholeStateCard } from './WholeStateCard';
import { useProfile } from './store';

export function SelectiveDemo() {
  // Changing the key remounts the cards, which also restarts their render counters.
  const [epoch, setEpoch] = useState(0);

  const reset = () => {
    useProfile.reset();
    setEpoch((current) => current + 1);
  };

  return (
    <div className="demo">
      <div className="demo-grid" key={epoch}>
        <NameCard />
        <RoleCard />
        <ClicksCard />
        <WholeStateCard />
      </div>
      <button type="button" className="demo-reset" onClick={reset}>
        Reset demo
      </button>
    </div>
  );
}
