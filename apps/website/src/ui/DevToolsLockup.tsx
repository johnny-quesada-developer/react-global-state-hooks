import { withBase } from '../lib/site';

/** The DevTools mark next to its name. The mark is decorative: the text carries the name. */
export function DevToolsLockup() {
  return (
    <div className="mb-6 flex max-w-[34rem] items-center gap-4 rounded-panel border border-line bg-soft px-4 py-3">
      <img className="flex-none rounded-[8px] bg-paper" src={withBase('img/devtools-logo.png')} width={72} height={72} alt="" decoding="async" />
      <div className="flex flex-col">
        <strong className="text-ink">React Global States DevTools</strong>
        <span className="text-13 text-muted">Chrome extension for react-global-state-hooks</span>
      </div>
    </div>
  );
}
