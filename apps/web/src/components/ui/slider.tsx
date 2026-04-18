'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
  label?: string;
  showValue?: boolean;
}

function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onValueChange,
  className,
  label,
  showValue = true,
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label && <span className="text-gray-600">{label}</span>}
          {showValue && (
            <span className="font-medium text-gray-900">{value}</span>
          )}
        </div>
      )}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onValueChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-indigo-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:shadow-md"
          style={{
            background: `linear-gradient(to right, rgb(79 70 229) ${percentage}%, rgb(229 231 235) ${percentage}%)`,
          }}
        />
      </div>
    </div>
  );
}

export { Slider };
