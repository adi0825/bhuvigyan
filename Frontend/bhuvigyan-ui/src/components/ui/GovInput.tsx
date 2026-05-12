import React from 'react';

interface GovInputProps {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
  id?: string;
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  type?: string;
  name?: string;
  disabled?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  pattern?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export default function GovInput({
  label,
  helperText,
  error,
  icon,
  required,
  multiline,
  rows,
  className = '',
  id,
  ...props
}: GovInputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-bold text-[#1a1a1a] flex items-center gap-1">
          {label}
          {required && <span className="text-[#c0392b]">*</span>}
        </label>
      )}
      
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] group-focus-within:text-primary transition-colors">
            {icon}
          </div>
        )}
        
        {multiline ? (
          <textarea
            id={inputId}
            rows={rows || 4}
            className={`
              gov-input min-h-[100px] py-3
              ${icon ? 'pl-10' : 'pl-4'}
              ${error ? 'border-[#c0392b] focus:border-[#c0392b] focus:shadow-[0_0_0_3px_rgba(192,57,43,0.12)]' : ''}
            `}
            {...(props as any)}
          />
        ) : (
          <input
            id={inputId}
            className={`
              gov-input
              ${icon ? 'pl-10' : 'pl-4'}
              ${error ? 'border-[#c0392b] focus:border-[#c0392b] focus:shadow-[0_0_0_3px_rgba(192,57,43,0.12)]' : ''}
            `}
            {...props}
          />
        )}
      </div>

      {error ? (
        <p className="text-[11px] font-medium text-[#c0392b] mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-[#6b7280] mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
}
