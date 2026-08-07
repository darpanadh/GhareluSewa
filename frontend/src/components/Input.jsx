import React from 'react';
import clsx from 'clsx';

export const Input = React.forwardRef(({
  label,
  error,
  help,
  type = 'text',
  className,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={clsx(
          'w-full px-4 py-2.5 rounded-lg border-2 transition-colors duration-200',
          'text-gray-900 placeholder-gray-400',
          'focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200',
          error ? 'border-red-500' : 'border-gray-200',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      {help && !error && (
        <p className="mt-1 text-sm text-gray-500">{help}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
