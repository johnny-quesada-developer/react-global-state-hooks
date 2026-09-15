import React from 'react';
import { cn } from '@src/shared/tools/cn';
import selectedGlobalStateId$ from '../../hooks/selectedGlobalStateId';
import useStateMeta from '../../hooks/globalStates/hooks/useStateMeta';

export type SelectedStateLabelProps = React.HTMLAttributes<HTMLLabelElement> & Record<string, unknown>;

export const SelectedStateLabel: React.FC<SelectedStateLabelProps> = ({
  className = '',
  ...props
}: SelectedStateLabelProps) => {
  const [selectedStateId] = selectedGlobalStateId$();
  const [storeName] = useStateMeta(selectedStateId, (state) => state?.name);

  if (!storeName) return null;

  return (
    <label className={cn('text-amber-900 pl-2', className)} {...props}>
      {storeName} Logs
    </label>
  );
};

export default SelectedStateLabel;
