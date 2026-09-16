import React, { useEffect, useRef, useState } from 'react';
import styles from './JsonCodeViewer.module.scss';
import { cn } from '@src/shared/tools/cn';
import { BsChevronBarExpand, BsArrowsCollapse } from 'react-icons/bs';
import { FiCopy, FiCheck, FiCode } from 'react-icons/fi';
import { VscJson } from 'react-icons/vsc';
import useMountEffect from '@src/pages/main_tab/hooks/useMountEffect';
import { CodeViewer, JsonViewer } from './components';
import { isNumber } from 'json-storage-formatter';
import { codeViewer$ } from './stores';

export type JsonCodeViewerProps = React.HTMLAttributes<HTMLDivElement> & {
  src: unknown;
  collapsed?: boolean | number;
  defaultView?: 'json' | 'code';
  onEdit?: <T>(stateWrapper: T) => void;
};

export const JsonCodeViewer: React.FC<JsonCodeViewerProps> = React.memo(
  ({
    className = '',
    collapsed: collapsedArg = 3,
    defaultView = 'code',
    onEdit,
    src,
    ...props
  }: JsonCodeViewerProps) => {
    const [viewType, setViewType] = useState<'json' | 'code'>(defaultView ?? 'json');
    const [collapsed, setCollapsed] = useState(collapsedArg);
    const [copied, setCopied] = useState(false);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const toggleViewType = () => setViewType((value) => (value === 'code' ? 'json' : 'code'));
    const toggleCollapsed = () => setCollapsed((value) => (isNumber(value) ? true : !value));

    const copyValue = () => {
      const text = JSON.stringify(src, null, 4);

      void navigator.clipboard?.writeText(text).then(() => {
        setCopied(true);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), 1500);
      });
    };

    useMountEffect(function copyTimeoutCleanup() {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    });

    useEffect(
      function syncCollapsed() {
        setCollapsed(collapsedArg);
      },
      [collapsedArg]
    );

    useEffect(
      function syncViewType() {
        setViewType(defaultView ?? 'json');
      },
      [defaultView]
    );

    const isCollapsed = isNumber(collapsed) ? collapsed > 0 : collapsed;

    const toolbar = (
      <div className="absolute top-1 right-1 z-10 flex items-center gap-1">
        <div title="Toggle collapsed" className="z-10 w-4" onClick={toggleCollapsed}>
          {isCollapsed && <BsChevronBarExpand className="text-blue-400 hover:scale-110" />}
          {!isCollapsed && <BsArrowsCollapse className="text-blue-400 hover:scale-110" />}
        </div>

        <button
          type="button"
          title={viewType === 'code' ? 'Switch to JSON tree view' : 'Switch to code view'}
          aria-label={viewType === 'code' ? 'Switch to JSON tree view' : 'Switch to code view'}
          onClick={toggleViewType}
          className="flex h-5 w-5 items-center justify-center rounded"
        >
          {viewType === 'code' ? (
            <VscJson className="text-blue-400 hover:scale-110 transition-transform" />
          ) : (
            <FiCode className="text-blue-400 hover:scale-110 transition-transform" />
          )}
        </button>

        <button
          type="button"
          title={copied ? 'Copied!' : 'Copy value'}
          aria-label={copied ? 'Copied' : 'Copy value'}
          onClick={copyValue}
          className="flex h-5 w-5 items-center justify-center rounded"
        >
          {copied ? (
            <FiCheck className="text-green-500" />
          ) : (
            <FiCopy className="text-blue-400 hover:scale-110 transition-transform" />
          )}
        </button>
      </div>
    );

    return (
      <codeViewer$.Provider
        value={{
          viewType,
          collapsed,
          copied,
          src,
        }}
        onRender={({ metadata }) => {
          metadata.onEdit = onEdit;
        }}
      >
        <div className={cn(styles.reactJsonContainer, 'relative pr-5 flex flex-col', className)} {...props}>
          {viewType === 'code' && <CodeViewer className="h-full flex-1 min-h-0">{toolbar}</CodeViewer>}
          {viewType === 'json' && <JsonViewer>{toolbar}</JsonViewer>}
        </div>
      </codeViewer$.Provider>
    );
  }
);

export default JsonCodeViewer;
