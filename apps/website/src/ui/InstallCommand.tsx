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
    <div className="install">
      <div className="install__tabs" role="tablist" aria-label="Package manager">
        {PACKAGE_MANAGERS.map((manager) => (
          <button
            type="button"
            role="tab"
            key={manager}
            aria-selected={manager === packageManager}
            onClick={() => select(manager)}
          >
            {manager}
          </button>
        ))}
      </div>
      <div className="install__row">
        <code className="install__command" ref={output} aria-live="polite">
          {command}
        </code>
        <button type="button" className="install__copy" onClick={copy}>
          {copied === 'copied' ? 'Copied' : copied === 'manual' ? 'Press Ctrl/Cmd+C' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
