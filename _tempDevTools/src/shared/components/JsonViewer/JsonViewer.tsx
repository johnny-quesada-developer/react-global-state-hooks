import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './JsonViewer.module.scss';
import { cn } from '@src/shared/tools/cn';
import ReactJson, { InteractionProps } from 'react-json-view';
import { BsChevronBarExpand } from 'react-icons/bs';
import { theme$ } from '@src/pages/main_tab/hooks/theme';
import uniqueId from 'react-global-state-hooks/uniqueId';
import useStableRef from '@src/pages/main_tab/hooks/useStableRef';

export type JsonViewerProps = React.HTMLAttributes<HTMLDivElement> & {
  src: Record<string, unknown>;
  collapsed?: boolean | number;
  name?: string | false;
  onEdit?: <T>(stateWrapper: { value: T }) => void;
};

export const JsonViewer: React.FC<JsonViewerProps> = ({
  className = '',
  collapsed: collapsedArg = true,
  name = false,
  onEdit,
  src,
  ...props
}: JsonViewerProps) => {
  const [theme] = theme$();
  const jsonViewerTheme = theme === 'dark' ? 'eighties' : 'rjv-default';

  const [collapsed, setCollapsed] = useState(collapsedArg);
  const toggleCollapsed = useCallback(() => setCollapsed((value) => Boolean(!value)), []);

  useEffect(() => {
    setCollapsed(collapsedArg);
  }, [collapsedArg]);

  const buildOnEdit = () => {
    if (!onEdit) return undefined;

    return (edit: InteractionProps) => {
      onEdit(edit.updated_src as { value: unknown });
    };
  };

  const onEditRef = useRef<ReturnType<typeof buildOnEdit>>(null);
  onEditRef.current = buildOnEdit();

  const onEditWrapper = useCallback((edit: InteractionProps) => {
    onEditRef.current?.(edit);
  }, []);

  const srcKey = useStableRef(() => uniqueId('src:'), [src]).current;

  return (
    <div className={cn(styles.reactJsonContainer, 'relative pr-5', className)} {...props}>
      <div title="Toggle collapsed" className="absolute top-0 right-0 z-10 w-4" onClick={toggleCollapsed}>
        <BsChevronBarExpand className="text-blue-400 hover:scale-110" />
      </div>

      <ReactJson
        key={srcKey}
        src={src}
        indentWidth={4}
        collapsed={collapsed}
        collapseStringsAfterLength={120}
        sortKeys={true}
        name={name}
        quotesOnKeys={false}
        displayDataTypes={false}
        iconStyle="circle"
        theme={jsonViewerTheme}
        onEdit={onEdit ? onEditWrapper : undefined}
      />
    </div>
  );
};

export default JsonViewer;
