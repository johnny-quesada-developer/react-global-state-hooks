import React from 'react';
import { cn } from '@src/shared/tools/cn';
import CodeEditorForState from './components/CodeEditorForState/CodeEditorForState';
import { StateViewer } from './components/StateViewer';
import { Resizable } from '@src/shared/components';

export type StateTabProps = React.HTMLAttributes<HTMLDivElement> & {};

export const StateTab: React.FC<StateTabProps> = ({ className = '', ...props }: StateTabProps) => {
  return (
    <Resizable initialLeft="30%" className={cn('StateTab dark:bg-eighties', className)} {...props}>
      <StateViewer />

      <CodeEditorForState />
    </Resizable>
  );
};

export default StateTab;
