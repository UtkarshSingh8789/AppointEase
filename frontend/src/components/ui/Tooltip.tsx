import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/utils/cn';

interface TooltipProps {
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
  delayDuration?: number;
}

/** Accessible tooltip using Radix UI with animation */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  side = 'top',
  children,
  delayDuration = 300,
}) => {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={cn(
              'z-50 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md shadow-md',
              'animate-fade-in',
              'select-none'
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-gray-900 dark:fill-gray-100" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};
