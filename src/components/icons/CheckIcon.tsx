import React from 'react';

interface CheckIconProps {
  className?: string;
}

export const CheckIcon: React.FC<CheckIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="4"
      className="fill-emerald-400 drop-shadow-lg"
      stroke="currentColor"
      strokeWidth="1"
    />
    <path
      d="M9 12l2.5 2.5L16 10"
      stroke="white"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
