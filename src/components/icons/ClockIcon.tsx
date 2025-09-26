import React from 'react';

interface ClockIconProps {
  className?: string;
}

export const ClockIcon: React.FC<ClockIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="4"
      stroke="currentColor"
      strokeWidth="2"
      className="fill-yellow-400/20"
    />
    <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" className="fill-none" />
    <path
      d="M12 7v5l3 3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
