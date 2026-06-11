import React from 'react';

interface IllustrationProps {
  className?: string;
}

/** A person with a magnifying glass searching — used on provider listings empty state */
export const SearchIllustration: React.FC<IllustrationProps> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 240 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label="Person searching illustration"
    >
      <style>{`
        @keyframes searchSway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(3deg); }
        }
        .search-person { animation: searchSway 3s ease-in-out infinite; transform-origin: 100px 200px; }
      `}</style>

      <g className="search-person">
        {/* Shadow */}
        <ellipse cx="100" cy="210" rx="35" ry="7" fill="currentColor" opacity="0.08" />

        {/* Body */}
        <path d="M80 140 C80 128, 120 128, 120 140 L123 200 L77 200 Z" fill="currentColor" opacity="0.15" />
        
        {/* Head */}
        <circle cx="100" cy="105" r="22" fill="currentColor" opacity="0.18" />
        
        {/* Hair */}
        <path d="M78 100 C80 82, 120 82, 122 100" fill="currentColor" opacity="0.25" />
        
        {/* Face - looking to the right */}
        <circle cx="95" cy="103" r="2" fill="currentColor" opacity="0.3" />
        <circle cx="107" cy="103" r="2" fill="currentColor" opacity="0.3" />
        <path d="M96 113 Q100 115, 104 113" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.2" />

        {/* Arm holding magnifying glass */}
        <path d="M120 145 Q140 135, 155 120" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.15" />
        
        {/* Other arm */}
        <path d="M80 145 Q65 155, 60 170" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.12" />

        {/* Legs */}
        <rect x="85" y="195" width="12" height="18" rx="4" fill="currentColor" opacity="0.12" />
        <rect x="103" y="195" width="12" height="18" rx="4" fill="currentColor" opacity="0.12" />
      </g>

      {/* Magnifying glass */}
      <circle cx="175" cy="95" r="28" fill="currentColor" opacity="0.05" stroke="currentColor" strokeWidth="3" />
      <line x1="155" y1="115" x2="140" y2="130" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.2" />
      
      {/* Shine on glass */}
      <path d="M165 78 Q170 75, 168 82" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.15" />

      {/* Search result dots inside magnifying glass */}
      <circle cx="170" cy="88" r="2" fill="currentColor" opacity="0.15" />
      <circle cx="180" cy="95" r="2" fill="currentColor" opacity="0.1" />
      <circle cx="172" cy="102" r="2" fill="currentColor" opacity="0.12" />

      {/* Decorative elements */}
      <circle cx="210" cy="60" r="3" fill="currentColor" opacity="0.1" />
      <circle cx="30" cy="100" r="4" fill="currentColor" opacity="0.06" />
      <path d="M220 130 L223 127 L226 130 L223 133 Z" fill="currentColor" opacity="0.1" />
      <path d="M25 150 L28 147 L31 150 L28 153 Z" fill="currentColor" opacity="0.08" />
    </svg>
  );
};
