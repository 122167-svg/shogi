
import React from 'react';

const ShogiKingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 100 110"
    className={className}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M50 0 L100 20 L95 110 L5 110 L0 20 Z" />
    <text
      x="50"
      y="80"
      fontFamily="'Sawarabi Mincho', serif"
      fontSize="70"
      textAnchor="middle"
      fill="#D4AF37"
      stroke="#44403c"
      strokeWidth="3"
    >
      王
    </text>
  </svg>
);

export default ShogiKingIcon;
