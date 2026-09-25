import { useState } from 'react';
import { withBase } from '../lib/site';
import { usePreferences, useMiniMeHidden } from '../state/preferences';

/**
 * A small illustrated character walking along a strip at the end of the page. Its head is the
 * author's avatar illustration on a simple body. The strip is in normal flow (never overlays content), can be paused or
 * hidden (the choice is remembered), and stays still when the visitor prefers reduced motion (see
 * site.css).
 */
const control =
  'cursor-pointer rounded-sm border border-line-strong bg-bg px-2 py-0 font-sans text-xs font-normal text-text';

export function MiniMe() {
  const hidden = useMiniMeHidden();
  const [paused, setPaused] = useState(false);

  const setHidden = (value: boolean) =>
    usePreferences.setState((preferences) => ({ ...preferences, miniMeHidden: value }));

  if (hidden) {
    return (
      <button type="button" className={`minime-show mt-0 mr-4 mb-3 ml-auto block md:mr-6 ${control}`} onClick={() => setHidden(false)}>
        Show the walking character
      </button>
    );
  }

  return (
    <div
      className="minime relative overflow-hidden border-t border-line bg-sky [contain:layout_paint]"
      data-paused={paused}
    >
      <div className="absolute top-1 right-4 z-1 flex gap-2 md:right-6">
        <button
          type="button"
          className={control}
          data-minime-pause
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? 'Play' : 'Pause'}
        </button>
        <button type="button" className={control} onClick={() => setHidden(true)}>
          Hide
        </button>
      </div>
      <div className="[container-type:inline-size] relative h-15" aria-hidden="true">
        <div className="minime__walker absolute bottom-[0.4rem] left-0 will-change-transform motion-reduce:left-4">
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
