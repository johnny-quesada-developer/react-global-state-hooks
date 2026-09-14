import React from 'react';
import { cn } from '@src/shared/tools/cn';
import { CiSearch } from 'react-icons/ci';
import { useDebounce } from '@src/shared/hooks';

export type SimpleFilterProps = React.HTMLAttributes<HTMLDivElement> & {
  debounceDelay?: number;
  inputProps: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  };
};

export const SimpleFilter: React.FC<SimpleFilterProps> = ({
  className = '',
  debounceDelay = 300,
  inputProps: { placeholder = 'Search...', onChange, ...inputProps },
  ...props
}: SimpleFilterProps) => {
  const onChangeDebounced = useDebounce(onChange, debounceDelay);

  return (
    <div {...props} className={cn('SimpleFilter relative', className)}>
      <CiSearch className="absolute top-3 left-2" />

      <input
        className="indent-6 w-full p-2"
        {...inputProps}
        onChange={onChangeDebounced}
        placeholder={placeholder ?? 'Search...'}
      />
    </div>
  );
};

export default SimpleFilter;
