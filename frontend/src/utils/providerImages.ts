/**
 * Cartoon-style colorful provider avatars.
 * These are generated SVG data URIs so the public UI shows
 * consistent illustrated avatars instead of real face photos.
 */

const SHAPES = [
  { bg: ['#ffb4a2', '#e76f51'], accent: '#ffffff' },
  { bg: ['#a0c4ff', '#4361ee'], accent: '#f8f9fa' },
  { bg: ['#caffbf', '#2a9d8f'], accent: '#fefae0' },
  { bg: ['#ffd6a5', '#f4a261'], accent: '#fff3b0' },
  { bg: ['#bdb2ff', '#9b5de5'], accent: '#f8f7ff' },
  { bg: ['#9bf6ff', '#00b4d8'], accent: '#edf6f9' },
  { bg: ['#ffc6ff', '#ff5d8f'], accent: '#fff0f6' },
  { bg: ['#fdffb6', '#f77f00'], accent: '#fffef5' },
];

function hashSeed(value: string | number): number {
  const input = String(value);
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildAvatarSvg(seed: number): string {
  const palette = SHAPES[seed % SHAPES.length];
  const headTilt = (seed % 7) - 3;
  const cheek = seed % 2 === 0 ? '16' : '22';
  const mouthY = seed % 3 === 0 ? '64' : '66';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="Provider avatar">
      <defs>
        <linearGradient id="bg-${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.bg[0]}" />
          <stop offset="100%" stop-color="${palette.bg[1]}" />
        </linearGradient>
        <linearGradient id="hair-${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2d2a32" />
          <stop offset="100%" stop-color="#111827" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="128" fill="url(#bg-${seed})" />
      <circle cx="46" cy="58" r="20" fill="rgba(255,255,255,0.22)" />
      <circle cx="204" cy="42" r="10" fill="rgba(255,255,255,0.18)" />
      <circle cx="214" cy="192" r="18" fill="rgba(255,255,255,0.12)" />
      <circle cx="68" cy="204" r="16" fill="rgba(255,255,255,0.14)" />
      <g transform="translate(128 136) rotate(${headTilt})">
        <ellipse cx="0" cy="-6" rx="52" ry="60" fill="#f8d6b5" />
        <path d="M-58 -22 C-48 -78, 48 -78, 58 -22 C38 -52, -38 -52, -58 -22Z" fill="url(#hair-${seed})" />
        <path d="M-28 -12 C-20 -32, 20 -32, 28 -12 C10 -20, -10 -20, -28 -12Z" fill="#6d4c41" opacity="0.35" />
        <circle cx="-18" cy="-2" r="5" fill="#1f2937" />
        <circle cx="18" cy="-2" r="5" fill="#1f2937" />
        <path d="M-8 12 Q0 18 8 12" fill="none" stroke="#1f2937" stroke-width="4" stroke-linecap="round" />
        <circle cx="-24" cy="${cheek}" r="6" fill="rgba(255,255,255,0.35)" />
        <circle cx="24" cy="${cheek}" r="6" fill="rgba(255,255,255,0.35)" />
        <path d="M-10 ${mouthY} Q0 ${Number(mouthY) + 6} 10 ${mouthY}" fill="none" stroke="#9d4edd" stroke-width="4" stroke-linecap="round" />
      </g>
      <circle cx="186" cy="76" r="18" fill="${palette.accent}" opacity="0.45" />
      <circle cx="80" cy="82" r="12" fill="${palette.accent}" opacity="0.35" />
    </svg>
  `;
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

/**
 * Get a consistent colorful cartoon avatar URL based on provider ID or index.
 */
export function getProviderImage(providerIdOrIndex: string | number): string {
  const seed = hashSeed(providerIdOrIndex);
  return svgToDataUri(buildAvatarSvg(seed));
}

/**
 * Service-specific cover images for provider detail pages.
 */
export const SERVICE_COVER_IMAGES: Record<string, string> = {
  healthcare: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&h=400&fit=crop',
  beauty: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&h=400&fit=crop',
  fitness: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=400&fit=crop',
  wellness: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&h=400&fit=crop',
  education: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=400&fit=crop',
  legal: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=400&fit=crop',
  finance: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=400&fit=crop',
  technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=400&fit=crop',
  default: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=400&fit=crop',
};
