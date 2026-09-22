import { useState } from 'react';
import { withBase } from '../lib/site';
import { usePreferences, useMiniMeHidden } from '../state/preferences';

/**
 * A small illustrated character walking along a strip at the end of the page. Its head is the
 * author's avatar illustration on a simple body. The strip is in normal flow (never overlays content), can be paused or
 * hidden (the choice is remembered), and stays still when the visitor prefers reduced motion (see
 * site.css).
 */
export function MiniMe() {
  const hidden = useMiniMeHidden();
  const [paused, setPaused] = useState(false);

  const setHidden = (value: boolean) =>
    usePreferences.setState((preferences) => ({ ...preferences, miniMeHidden: value }));

  if (hidden) {
    return (
      <button type="button" className="minime-show" onClick={() => setHidden(false)}>
        Show the walking character
      </button>
    );
  }

  return (
    <div className="minime" data-paused={paused}>
      <div className="minime__controls">
        <button type="button" data-minime-pause aria-pressed={paused} onClick={() => setPaused(!paused)}>
          {paused ? 'Play' : 'Pause'}
        </button>
        <button type="button" onClick={() => setHidden(true)}>
          Hide
        </button>
      </div>
      <div className="minime__track" aria-hidden="true">
        <div className="minime__walker">
          <div className="minime__flip">
            <svg viewBox="0 0 48 56" width="40" height="47" role="presentation">
              <g className="limb limb--back">
                <rect x="21" y="38" width="6" height="14" rx="3" fill="#20332d" />
              </g>
              <g className="limb limb--front">
                <rect x="21" y="38" width="6" height="14" rx="3" fill="#24634b" />
              </g>
              <rect
                x="14"
                y="24"
                width="20"
                height="20"
                rx="8"
                fill="#e4f2e8"
                stroke="#24634b"
                strokeWidth="2"
              />
              {/* head: the author's avatar illustration (public/icon.jpeg, converted to a transparent PNG) */}
              <image href={withBase('img/avatar-head.png')} x="10.5" y="0" width="27" height="27" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
