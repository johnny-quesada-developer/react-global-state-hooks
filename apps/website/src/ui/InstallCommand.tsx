import { useEffect, useRef, useState } from 'react';
import {
  PACKAGE_MANAGERS,
  usePackageManager,
  usePreferences,
  type PackageManager,
} from '../state/preferences';

const install: Record<PackageManager, string> = {
  npm: 'npm install',
  yarn: 'yarn add',
  pnpm: 'pnpm add',
};

interface InstallCommandProps {
  pkg?: string;
}

export function InstallCommand({ pkg = 'react-global-state-hooks' }: InstallCommandProps) {
  // The choice is stored globally, so it is shared by every install box on the site and remembered.
  const packageManager = usePackageManager();
  const [copied, setCopied] = useState<'idle' | 'copied' | 'manual'>('idle');
  const output = useRef<HTMLElement>(null);
  const command = `${install[packageManager]} ${pkg}`;

  useEffect(() => {
    if (copied === 'idle') return;

    const timer = setTimeout(() => setCopied('idle'), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const select = (choice: PackageManager) =>
    usePreferences.setState((preferences) => ({ ...preferences, packageManager: choice }));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied('copied');
    } catch {
      // clipboard blocked: select the text so the visitor can copy it manually
      const range = document.createRange();
      if (output.current) range.selectNodeContents(output.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      setCopied('manual');
    }
  };

  return (
    <div className="install max-w-[min(30rem,100%)] overflow-hidden rounded-md border border-line-strong bg-bg">
      <div className="flex border-b border-line bg-mint" role="tablist" aria-label="Package manager">
        {PACKAGE_MANAGERS.map((manager) => (
          <button
            type="button"
            role="tab"
            key={manager}
            className="cursor-pointer border-x-0 border-t-0 border-b-2 border-transparent bg-transparent px-4 py-2 font-sans text-sm font-normal text-text-muted transition duration-150 ease-out hover:text-text aria-selected:border-b-primary aria-selected:font-bold aria-selected:text-text"
            aria-selected={manager === packageManager}
            onClick={() => select(manager)}
          >
            {manager}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3 max-xs:flex-wrap max-xs:px-3">
        <code
          className="min-w-0 overflow-x-auto bg-transparent p-0 text-[0.9rem] whitespace-nowrap max-xs:flex-[1_1_100%] max-xs:[overflow-wrap:anywhere] max-xs:whitespace-normal"
          ref={output}
          aria-live="polite"
        >
          {command}
        </code>
        <button
          type="button"
          className="flex-none cursor-pointer rounded-sm border border-primary bg-bg px-3 py-1 font-sans text-sm font-semibold text-primary transition duration-150 ease-out hover:bg-mint active:scale-[0.97] max-xs:ms-auto"
          aria-live="polite"
          onClick={copy}
        >
          {copied === 'copied' ? 'Copied' : copied === 'manual' ? 'Press Ctrl/Cmd+C' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
