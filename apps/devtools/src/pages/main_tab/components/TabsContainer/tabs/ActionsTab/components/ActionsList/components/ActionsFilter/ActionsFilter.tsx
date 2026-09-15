import React from 'react';
import { SimpleFilter } from '@src/shared/components';
import actions$, { useActionsFilter } from '../../../../context/actionsContext';

export type ActionsFilterProps = React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;

export const ActionsFilter: React.FC<ActionsFilterProps> = ({ className = '', ...props }: ActionsFilterProps) => {
  const { setFilter } = actions$.use.actions();
  const ActionsFilter = useActionsFilter();

  return (
    <SimpleFilter
      {...props}
      className={className}
      inputProps={{
        defaultValue: ActionsFilter,
        placeholder: 'Search Actions...',
        onChange: (event) => {
          setFilter(event.target.value);
        },
      }}
    />
  );
};

export default ActionsFilter;
