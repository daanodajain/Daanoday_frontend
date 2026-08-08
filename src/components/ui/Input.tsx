import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>((
  { label, error, helperText, className, id, type, ...props }, ref
) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-secondary-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={clsx(
            'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm',
            isPassword ? 'pr-10' : '',
            error
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-secondary-300 focus:ring-primary-500 focus:border-primary-500',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-secondary-500">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
