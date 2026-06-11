import React from 'react';

interface IllustrationProps {
  className?: string;
}

/** Multiple people/characters together — used in social proof section */
export const TeamIllustration: React.FC<IllustrationProps> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 300 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label="Team of people illustration"
    >
      <style>{`
        @keyframes teamFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .team-group { animation: teamFloat 4s ease-in-out infinite; }
      `}</style>

      <g className="team-group">
        {/* Shadow */}
        <ellipse cx="150" cy="185" rx="80" ry="10" fill="currentColor" opacity="0.06" />

        {/* Person 1 (left) */}
        <g>
          <circle cx="85" cy="95" r="18" fill="currentColor" opacity="0.15" />
          <path d="M67 90 C69 76, 101 76, 103 90" fill="currentColor" opacity="0.22" />
          <path d="M70 115 C70 105, 100 105, 100 115 L102 170 L68 170 Z" fill="currentColor" opacity="0.12" />
          <circle cx="79" cy="93" r="1.5" fill="currentColor" opacity="0.25" />
          <circle cx="91" cy="93" r="1.5" fill="currentColor" opacity="0.25" />
          <path d="M81 101 Q85 104, 89 101" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.2" />
          <rect x="74" y="165" width="10" height="15" rx="3" fill="currentColor" opacity="0.1" />
          <rect x="88" y="165" width="10" height="15" rx="3" fill="currentColor" opacity="0.1" />
        </g>

        {/* Person 2 (center, slightly taller) */}
        <g>
          <circle cx="150" cy="80" r="22" fill="currentColor" opacity="0.18" />
          <path d="M128 74 C130 58, 170 58, 172 74" fill="currentColor" opacity="0.25" />
          <path d="M130 105 C130 93, 170 93, 170 105 L173 170 L127 170 Z" fill="currentColor" opacity="0.15" />
          <circle cx="143" cy="78" r="2" fill="currentColor" opacity="0.28" />
          <circle cx="157" cy="78" r="2" fill="currentColor" opacity="0.28" />
          <path d="M143 89 Q150 94, 157 89" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.22" />
          <rect x="138" y="165" width="11" height="16" rx="4" fill="currentColor" opacity="0.12" />
          <rect x="153" y="165" width="11" height="16" rx="4" fill="currentColor" opacity="0.12" />
        </g>

        {/* Person 3 (right) */}
        <g>
          <circle cx="215" cy="95" r="18" fill="currentColor" opacity="0.15" />
          <path d="M197 90 C199 76, 231 76, 233 90" fill="currentColor" opacity="0.22" />
          <path d="M200 115 C200 105, 230 105, 230 115 L232 170 L198 170 Z" fill="currentColor" opacity="0.12" />
          <circle cx="209" cy="93" r="1.5" fill="currentColor" opacity="0.25" />
          <circle cx="221" cy="93" r="1.5" fill="currentColor" opacity="0.25" />
          <path d="M211 101 Q215 104, 219 101" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.2" />
          <rect x="204" y="165" width="10" height="15" rx="3" fill="currentColor" opacity="0.1" />
          <rect x="218" y="165" width="10" height="15" rx="3" fill="currentColor" opacity="0.1" />
        </g>

        {/* Connection lines between people */}
        <path d="M100 130 Q125 120, 130 130" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.1" />
        <path d="M170 130 Q195 120, 200 130" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.1" />
      </g>

      {/* Decorative elements */}
      <circle cx="40" cy="60" r="3" fill="currentColor" opacity="0.08" />
      <circle cx="260" cy="55" r="4" fill="currentColor" opacity="0.06" />
      <path d="M30 130 L33 127 L36 130 L33 133 Z" fill="currentColor" opacity="0.08" />
      <path d="M270 120 L273 117 L276 120 L273 123 Z" fill="currentColor" opacity="0.08" />
    </svg>
  );
};
