import React, { ComponentProps } from 'react';
import ReactJson, { InteractionProps } from 'react-json-view';
import { theme$ } from '@src/pages/main_tab/hooks/theme';
import useStableCallback from '@src/pages/main_tab/hooks/useStableCallback';
import useStableRef from '@src/pages/main_tab/hooks/useStableRef';
import { uniqueId } from 'react-global-state-hooks';
import { codeViewer$ } from '../../stores';
import { cn } from '@src/shared/tools';

export const JsonViewer: React.FC<ComponentProps<'div'>> = ({ className, children, ...props }) => {
  const { metadata } = codeViewer$.use.api();

  const src = codeViewer$.use.select(
    ({ src }) => ({
      value: src,
    }),
    {
      isEqualRoot: (a, b) => a.src === b.src,
    }
  );

  const collapsed = codeViewer$.use.select(({ collapsed }) => collapsed);

  const [theme] = theme$();
  const jsonViewerTheme = theme === 'dark' ? 'eighties' : 'rjv-default';

  const srcKey = useStableRef(() => uniqueId('src:'), [src]).current;

  const onEditWrapper = useStableCallback((edit: InteractionProps) => {
    metadata.onEdit?.(edit.updated_src);
  });

  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      <ReactJson
        key={srcKey}
        src={src}
        indentWidth={4}
        collapsed={collapsed}
        collapseStringsAfterLength={120}
        sortKeys={true}
        name={false}
        quotesOnKeys={false}
        displayDataTypes={false}
        iconStyle="circle"
        theme={jsonViewerTheme}
        onEdit={metadata.onEdit ? onEditWrapper : undefined}
      />
      {children}
    </div>
  );
};

export default JsonViewer;
