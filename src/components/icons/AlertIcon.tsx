import React from 'react';

interface AlertIconProps {
  className?: string;
}

export const AlertIcon: React.FC<AlertIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="4"
      stroke="currentColor"
      strokeWidth="2"
      className="fill-blue-400/20"
    />
    <path
      d="M12 8v4M12 16h.01"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
