import React from 'react';
import { cn } from '@src/shared/tools/cn';
import styles from './MainTab.module.scss';
import { NavBar, GlobalStateList, TabsContainer, LoadMismatchModal } from '@main_tab/components';
import { Resizable } from '@shared/components/Resizable';
import { useBuildType } from '@main_tab/context';

export type MainTabProps = React.HTMLAttributes<HTMLDivElement>;

export const MainTab: React.FC<MainTabProps> = ({ className = '', ...props }: MainTabProps) => {
  const [buildType] = useBuildType();

  return (
    <div
      {...props}
      className={cn(
        'h-screen overflow-hidden grid bg-white dark:bg-eighties',
        styles.griDefinition,
        className,
      )}
    >
      <h1 className="font-medium text-gray-500 dark:text-gray-300 border-b border-gray-400 align-middle p-2">
        GLOBAL STATES{' '}
        <span className="text-xs">
          {chrome?.devtools?.inspectedWindow?.tabId ?? buildType?.toLowerCase()}
        </span>
      </h1>

      <div
        className={cn('border-b border-gray-400 align-middle min-h-10', 'flex items-center justify-between')}
      >
        <NavBar className="h-full flex-1 " />
      </div>

      <Resizable className="col-span-2" initialLeft="25%">
        <GlobalStateList className="h-full" />

        <TabsContainer className="h-full" />
      </Resizable>

      <LoadMismatchModal />
    </div>
  );
};
