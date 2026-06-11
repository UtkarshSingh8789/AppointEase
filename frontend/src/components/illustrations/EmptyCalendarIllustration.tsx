import React from 'react';

interface IllustrationProps {
  className?: string;
}

/** A sad/empty calendar for empty states — muted colors, friendly expression */
export const EmptyCalendarIllustration: React.FC<IllustrationProps> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label="Empty calendar illustration"
    >
      <style>{`
        @keyframes gentleBob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        .bob-group { animation: gentleBob 4s ease-in-out infinite; }
      `}</style>

      <g className="bob-group">
        {/* Calendar body */}
        <rect x="50" y="40" width="140" height="130" rx="12" fill="currentColor" opacity="0.06" stroke="currentColor" strokeWidth="1.5" />
        
        {/* Calendar top bar */}
        <rect x="50" y="40" width="140" height="35" rx="12" fill="currentColor" opacity="0.1" />
        
        {/* Calendar rings */}
        <rect x="85" y="32" width="6" height="16" rx="3" fill="currentColor" opacity="0.2" />
        <rect x="120" y="32" width="6" height="16" rx="3" fill="currentColor" opacity="0.2" />
        <rect x="155" y="32" width="6" height="16" rx="3" fill="currentColor" opacity="0.2" />

        {/* Sad face on calendar */}
        <circle cx="105" cy="115" r="3" fill="currentColor" opacity="0.2" />
        <circle cx="135" cy="115" r="3" fill="currentColor" opacity="0.2" />
        <path d="M105 140 Q120 133, 135 140" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.2" />

        {/* Empty grid lines (dashed to show emptiness) */}
        <line x1="70" y1="90" x2="170" y2="90" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.1" />
        <line x1="70" y1="105" x2="170" y2="105" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.1" />
        <line x1="70" y1="150" x2="170" y2="150" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.1" />
      </g>

      {/* Floating question marks */}
      <text x="185" y="55" fontSize="16" fill="currentColor" opacity="0.15" fontFamily="sans-serif">?</text>
      <text x="35" y="80" fontSize="12" fill="currentColor" opacity="0.1" fontFamily="sans-serif">?</text>

      {/* Decorative dots */}
      <circle cx="200" cy="80" r="3" fill="currentColor" opacity="0.08" />
      <circle cx="30" cy="120" r="4" fill="currentColor" opacity="0.06" />
      <circle cx="210" cy="140" r="2" fill="currentColor" opacity="0.08" />
    </svg>
  );
};
