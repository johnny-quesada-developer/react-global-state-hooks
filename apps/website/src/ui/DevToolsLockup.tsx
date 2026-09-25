import { withBase } from '../lib/site';

/** The DevTools mark next to its name. The mark is decorative: the text carries the name. */
export function DevToolsLockup() {
  return (
    <div className="flex max-w-[34rem] items-center gap-4 rounded-md border border-[#c3dfef] bg-sky px-4 py-3">
      <img
        className="flex-none rounded-md bg-bg"
        src={withBase('img/devtools-logo.png')}
        width={72}
        height={72}
        alt=""
        decoding="async"
      />
      <div className="flex flex-col">
        <strong>React Global States DevTools</strong>
        <span className="text-sm text-sky-text">Chrome extension for react-global-state-hooks</span>
      </div>
    </div>
  );
}
