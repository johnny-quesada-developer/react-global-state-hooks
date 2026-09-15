import React from 'react';
import { cn } from '@src/shared/tools/cn';

export const CodeEditorElement = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        {...props}
        ref={ref}
        className={cn(
          '_editorElementRef border border-gray-300 rounded-md w-full bg-gray-100  dark:bg-gray-300 text-eighties dark:text-blue-700',
          className!
        )}
      >
        {children}
      </div>
    );
  }
);

export default CodeEditorElement;
