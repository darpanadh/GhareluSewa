import React, { useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const Input = React.forwardRef(({
  label,
  error,
  success,
  help,
  type = 'text',
  className,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          type={inputType}
          className={clsx(
            'w-full pl-4 py-2.5 rounded-xl border-2 transition-all duration-200 text-xs sm:text-sm',
            'text-slate-900 placeholder-slate-400 font-medium',
            'focus:outline-none',
            isPassword || success
              ? 'pr-10'
              : 'pr-4',
            error
              ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : success
              ? 'border-emerald-500 bg-emerald-50/20 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
              : 'border-slate-200 focus:border-[#07535f] focus:ring-2 focus:ring-[#07535f]/20',
            className
          )}
          {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {success && !isPassword && (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 pointer-events-none" />
          )}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-slate-400 hover:text-slate-700 focus:outline-none p-1 rounded-md transition-colors cursor-pointer"
              tabIndex={-1}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-500 font-semibold flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
          {error}
        </p>
      )}
      {help && !error && (
        <p className="mt-1 text-xs text-slate-500">{help}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;


