import React from 'react';
import { cn } from '@src/shared/tools/cn';

export type ErrorBannerProps = React.HTMLAttributes<HTMLDivElement> & {
  messageError: string;
};

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  className = '',
  messageError,
  ...props
}: ErrorBannerProps) => {
  return (
    <div className={cn('flex h-full', className)} {...props}>
      <div className="flex-1 flex flex-col gap-2 border-l h-full px-4 py-4 bg-gray-200">
        <div className="text-sm flex flex-col gap-2">
          <p className="text-red-500">{messageError}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorBanner;
