
import React from 'react';

interface ControlButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  'aria-label': string;
  className?: string;
}

const ControlButton: React.FC<ControlButtonProps> = ({ onClick, children, 'aria-label': ariaLabel, className }) => {
  const baseClasses = "rounded-full w-20 h-20 flex items-center justify-center shadow-lg transform transition-transform duration-150 active:scale-95 active:shadow-inner focus:outline-none focus:ring-4 focus:ring-amber-300 focus:ring-opacity-75";
  
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${baseClasses} ${className}`}
    >
      {children}
    </button>
  );
};

export default ControlButton;
