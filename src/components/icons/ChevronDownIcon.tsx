import React from 'react';

interface ChevronDownIconProps {
  className?: string;
}

export const ChevronDownIcon: React.FC<ChevronDownIconProps> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
