'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

function Toggle({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
}: ToggleProps) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <button
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
          checked ? 'bg-indigo-600' : 'bg-gray-300'
        )}
      >
        <span
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          )}
        />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

export { Toggle };
