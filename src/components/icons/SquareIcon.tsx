import React from 'react';

interface SquareIconProps {
  className?: string;
}

export const SquareIcon: React.FC<SquareIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="4"
      stroke="currentColor"
      strokeWidth="2"
      className="hover:fill-gray-50"
    />
  </svg>
);
