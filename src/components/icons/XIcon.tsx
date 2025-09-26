import React from 'react';

interface XIconProps {
  className?: string;
}

export const XIcon: React.FC<XIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="4"
      className="fill-red-500/20"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M8 8l8 8M8 16l8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);
