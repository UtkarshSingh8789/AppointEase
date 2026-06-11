import React from 'react';

interface IllustrationProps {
  className?: string;
}

/** A person receiving a notification on their phone — bell icon with notification badge */
export const NotificationIllustration: React.FC<IllustrationProps> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 200 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label="Notification illustration"
    >
      <style>{`
        @keyframes bellRing {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(8deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(5deg); }
          40% { transform: rotate(-5deg); }
          50% { transform: rotate(0deg); }
        }
        .bell-icon { animation: bellRing 3s ease-in-out infinite; transform-origin: 145px 45px; }
      `}</style>

      {/* Shadow */}
      <ellipse cx="90" cy="210" rx="35" ry="7" fill="currentColor" opacity="0.08" />

      {/* Person body */}
      <path d="M70 145 C70 133, 110 133, 110 145 L113 200 L67 200 Z" fill="currentColor" opacity="0.15" />
      
      {/* Head */}
      <circle cx="90" cy="110" r="22" fill="currentColor" opacity="0.18" />
      
      {/* Hair */}
      <path d="M68 105 C70 87, 110 87, 112 105" fill="currentColor" opacity="0.25" />
      
      {/* Face - looking at phone */}
      <circle cx="84" cy="108" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="96" cy="108" r="2" fill="currentColor" opacity="0.3" />
      <path d="M86 117 Q90 119, 94 117" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.2" />

      {/* Arms */}
      <path d="M110 150 Q120 145, 125 155" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.15" />
      <path d="M70 150 Q60 155, 65 165" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.12" />

      {/* Phone in hand */}
      <rect x="118" y="145" width="28" height="45" rx="5" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1" />
      <rect x="121" y="150" width="22" height="35" rx="3" fill="currentColor" opacity="0.05" />

      {/* Notification on phone screen */}
      <rect x="123" y="153" width="18" height="10" rx="2" fill="currentColor" opacity="0.12" />
      <rect x="123" y="166" width="18" height="10" rx="2" fill="currentColor" opacity="0.08" />

      {/* Bell notification icon floating */}
      <g className="bell-icon">
        <circle cx="145" cy="45" r="18" fill="currentColor" opacity="0.08" />
        {/* Bell shape */}
        <path d="M140 50 C140 40, 150 40, 150 50 L152 55 L138 55 Z" fill="currentColor" opacity="0.25" />
        <rect x="138" y="55" width="14" height="3" rx="1.5" fill="currentColor" opacity="0.2" />
        <circle cx="145" cy="60" r="2" fill="currentColor" opacity="0.2" />
        {/* Notification badge */}
        <circle cx="153" cy="40" r="5" fill="currentColor" opacity="0.35" />
        <text x="151" y="43" fontSize="6" fill="white" fontFamily="sans-serif" fontWeight="bold">3</text>
      </g>

      {/* Signal waves from phone */}
      <path d="M150 140 Q155 135, 152 130" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.12" />
      <path d="M155 142 Q162 135, 158 127" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.08" />

      {/* Legs */}
      <rect x="76" y="195" width="12" height="18" rx="4" fill="currentColor" opacity="0.12" />
      <rect x="94" y="195" width="12" height="18" rx="4" fill="currentColor" opacity="0.12" />

      {/* Decorative */}
      <circle cx="35" cy="80" r="3" fill="currentColor" opacity="0.08" />
      <circle cx="175" cy="100" r="2" fill="currentColor" opacity="0.06" />
    </svg>
  );
};
