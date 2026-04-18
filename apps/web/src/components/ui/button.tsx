'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800',
        secondary:
          'bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200 active:bg-gray-300',
        destructive:
          'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800',
        outline:
          'border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100',
        ghost:
          'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-9 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
