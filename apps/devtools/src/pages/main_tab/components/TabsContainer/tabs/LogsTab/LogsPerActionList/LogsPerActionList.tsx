import React from 'react';
import type { ActionId } from '@src/shared/schema';
import { logsFilter$, selectedActionHeader$ } from '../_hooks';
import { focusActionStepsList, logsPerActionListClass } from '@src/pages/main_tab/util/listFocusBridge';
import { ActionLogListItem, actionLogListItemClass } from '../ActionLogListItem';
import { isEqualRoot } from '@src/pages/main_tab/hooks/globalStates/hooks/useActionsHeaders';
import selectedGlobalStateId$ from '@src/pages/main_tab/hooks/selectedGlobalStateId';
import { UnsubscribeCallback } from 'react-hooks-global-states';
import { actionIdsByStateId$, actionsById$ } from '@src/pages/main_tab/hooks/globalStates';
import { ManualDomListShell, ManualDomRow, useManualDomList } from '../_manualDomList';

export type LogsPerActionListProps = React.HTMLAttributes<HTMLDivElement>;

export const LogsPerActionList: React.FC<LogsPerActionListProps> = ({
  className = '',
  ...props
}: LogsPerActionListProps) => {
  const [logsFilter] = logsFilter$();
  const filter = logsFilter?.trim().toLowerCase() ?? '';

  const { mainListRef, recordsCountRef, emptyLegendRef } = useManualDomList({
    rowClass: actionLogListItemClass,
    dependencies: [logsFilter],

    getSelectedId: () => selectedActionHeader$.getState(),
    selectById: (actionId) => selectedActionHeader$.setState(actionId as ActionId),
    onArrowRight: focusActionStepsList,

    subscribe: (controller) => {
      let isFirstRender = true;
      let previousLastActionId: ActionId | null = null;
      let totalCount = 0;
      let renderedCount = 0;
      let unsubscribeActions: UnsubscribeCallback | undefined;

      const reset = () => {
        controller.dropAll();
        totalCount = 0;
        renderedCount = 0;
        isFirstRender = true;
        previousLastActionId = null;
        controller.updateCounts({ total: 0, rendered: 0, hasFilter: filter !== '' });
      };

      const appendAction = (actionId: ActionId, parent: Node) => {
        const action = actionsById$.getState().get(actionId);
        if (!action) return;

        totalCount += 1;
        if (filter && !action.action.toLowerCase().includes(filter)) return;

        renderedCount += 1;
        controller.appendItem(
          <ManualDomRow isFirst={renderedCount === 1}>
            <ActionLogListItem actionId={actionId} index={renderedCount} />
          </ManualDomRow>,
          parent,
        );
      };

      reset();

      // The selected store changing drops the whole list; actions are only ever
      // appended within a store, never deleted individually.
      const unsubscribeSelected = selectedGlobalStateId$.subscribe((selectedStateId) => {
        unsubscribeActions?.();
        reset();

        if (!selectedStateId) return;

        unsubscribeActions = actionIdsByStateId$.subscribe(
          (actionIdsByStateId) => {
            const actionIds = actionIdsByStateId.get(selectedStateId);
            if (!actionIds?.size) return reset();

            const lastActionId = Array.from(actionIds).at(-1)!;
            if (lastActionId === previousLastActionId) return;
            previousLastActionId = lastActionId;

            if (isFirstRender) {
              isFirstRender = false;
              const fragment = document.createDocumentFragment();
              for (const actionId of actionIds) appendAction(actionId, fragment);
              controller.listEl.appendChild(fragment);
            } else {
              appendAction(lastActionId, controller.listEl);
            }

            controller.updateCounts({ total: totalCount, rendered: renderedCount, hasFilter: filter !== '' });
          },
          {
            isEqualRoot: isEqualRoot(selectedStateId),
          },
        );
      });

      return () => {
        unsubscribeActions?.();
        unsubscribeSelected?.();
      };
    },
  });

  return (
    <ManualDomListShell
      className={className}
      containerClass={logsPerActionListClass}
      mainListRef={mainListRef}
      recordsCountRef={recordsCountRef}
      emptyLegendRef={emptyLegendRef}
      {...props}
    />
  );
};

export default LogsPerActionList;
