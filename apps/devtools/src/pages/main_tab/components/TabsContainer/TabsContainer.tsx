import React from 'react';
import { cn } from '@src/shared/tools/cn';
import { LogsTab, ActionsTab } from './tabs';
import { MessagesTab } from './tabs/MessagesTab';
import selectedGlobalStateId$ from '../../hooks/selectedGlobalStateId';
import { selectedTab$ } from '../../hooks/selectedTab';
import { StateTab } from './tabs/StateTab';

export type TabsContainerProps = React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;

export const TabsContainer: React.FC<TabsContainerProps> = ({ className = '', ...props }: TabsContainerProps) => {
  const [isSomeStoreSelected] = selectedGlobalStateId$((state) => state !== null);
  const [selectedTab] = selectedTab$();

  return (
    <div className={cn('', className)} {...props}>
      {isSomeStoreSelected && selectedTab === 'logs' && <LogsTab />}
      {isSomeStoreSelected && selectedTab === 'actions' && <ActionsTab />}
      {isSomeStoreSelected && selectedTab === 'state' && <StateTab />}

      {process.env.NODE_ENV === 'development' && selectedTab === 'messages' && <MessagesTab />}
    </div>
  );
};

export default TabsContainer;
