import React, { forwardRef, useId } from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/** Reusable textarea component with label and error support */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const autoId = useId();
    const textareaId = id || autoId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            w-full px-3 py-2 border rounded-lg text-sm
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors duration-200 resize-none
            ${error ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'}
            ${className}
          `}
          rows={4}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
