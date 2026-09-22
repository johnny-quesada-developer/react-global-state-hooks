import { withBase } from '../lib/site';

/** The DevTools mark next to its name. The mark is decorative: the text carries the name. */
export function DevToolsLockup() {
  return (
    <div className="devtools-lockup">
      <img src={withBase('img/devtools-logo.png')} width={72} height={72} alt="" decoding="async" />
      <div>
        <strong>React Global States DevTools</strong>
        <span>Chrome extension for react-global-state-hooks</span>
      </div>
    </div>
  );
}
