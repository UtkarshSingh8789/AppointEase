import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

/** Card container component */
export const Card: React.FC<CardProps> = ({ children, className = '', padding = true }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  );
};

/** Card header section */
export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`pb-4 border-b border-gray-100 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
};

/** Card body section */
export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => {
  return (
    <div className={`py-4 ${className}`}>
      {children}
    </div>
  );
};

/** Card footer section */
export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`pt-4 border-t border-gray-100 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
};
