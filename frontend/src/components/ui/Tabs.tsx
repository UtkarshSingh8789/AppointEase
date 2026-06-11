import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/utils/cn';

/** Root tabs container */
export const Tabs = TabsPrimitive.Root;

/** Tab list (the row of tab buttons) */
export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg',
      className
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

/** Individual tab trigger button */
export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
      'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
      'data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700',
      'data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100',
      'data-[state=active]:shadow-sm',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

/** Tab content panel */
export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-4 animate-fade-in focus-visible:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';
