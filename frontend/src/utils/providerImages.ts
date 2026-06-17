/**
 * Distinct colorful ANIMAL avatars — each animal is unique and happy-looking.
 * Generated as SVG data URIs so no external image hosting is needed.
 */

// 16 unique animals with distinct bright background palettes
const ANIMALS: Array<{
  name: string;
  bg: [string, string];
  body: string;
  draw: (id: string) => string;
}> = [
  {
    name: 'Fox', bg: ['#ff9a3c', '#ff6b35'], body: '#ff7043',
    draw: (_id) => `
      <ellipse cx="128" cy="148" rx="58" ry="62" fill="#ff7043"/>
      <polygon points="80,95 60,45 100,80" fill="#ff7043"/>
      <polygon points="176,95 196,45 156,80" fill="#ff7043"/>
      <polygon points="80,95 67,48 100,80" fill="#fff3e0"/>
      <polygon points="176,95 189,48 156,80" fill="#fff3e0"/>
      <ellipse cx="128" cy="155" rx="42" ry="46" fill="#fff3e0"/>
      <circle cx="110" cy="138" r="10" fill="#1a237e"/><circle cx="113" cy="135" r="3" fill="white"/>
      <circle cx="146" cy="138" r="10" fill="#1a237e"/><circle cx="149" cy="135" r="3" fill="white"/>
      <ellipse cx="128" cy="162" rx="10" ry="7" fill="#e64a19"/>
      <path d="M114 172 Q128 184 142 172" fill="none" stroke="#bf360c" stroke-width="4" stroke-linecap="round"/>
      <line x1="95" y1="158" x2="60" y2="150" stroke="#795548" stroke-width="3"/>
      <line x1="95" y1="163" x2="58" y2="163" stroke="#795548" stroke-width="3"/>
      <line x1="161" y1="158" x2="196" y2="150" stroke="#795548" stroke-width="3"/>
      <line x1="161" y1="163" x2="198" y2="163" stroke="#795548" stroke-width="3"/>`,
  },
  {
    name: 'Panda', bg: ['#e0f7fa', '#80deea'], body: '#fafafa',
    draw: (_id) => `
      <circle cx="128" cy="145" r="68" fill="#fafafa"/>
      <ellipse cx="94" cy="108" rx="22" ry="22" fill="#212121"/>
      <ellipse cx="162" cy="108" rx="22" ry="22" fill="#212121"/>
      <ellipse cx="94" cy="115" rx="12" ry="12" fill="#fafafa"/>
      <ellipse cx="162" cy="115" rx="12" ry="12" fill="#fafafa"/>
      <circle cx="106" cy="140" r="13" fill="#1a237e"/><circle cx="110" cy="137" r="4" fill="white"/>
      <circle cx="150" cy="140" r="13" fill="#1a237e"/><circle cx="154" cy="137" r="4" fill="white"/>
      <ellipse cx="128" cy="162" rx="14" ry="9" fill="#bdbdbd"/>
      <path d="M112 174 Q128 190 144 174" fill="none" stroke="#616161" stroke-width="5" stroke-linecap="round"/>
      <circle cx="90" cy="108" r="6" fill="#212121"/>
      <circle cx="166" cy="108" r="6" fill="#212121"/>`,
  },
  {
    name: 'Lion', bg: ['#fff9c4', '#ffd54f'], body: '#ffb300',
    draw: (_id) => `
      <circle cx="128" cy="130" r="55" fill="#e65100" opacity="0.85"/>
      <circle cx="128" cy="130" r="70" fill="none" stroke="#bf360c" stroke-width="18" stroke-dasharray="8 6" opacity="0.5"/>
      <circle cx="128" cy="130" r="50" fill="#ffcc80"/>
      <circle cx="110" cy="122" r="11" fill="#4a148c"/><circle cx="114" cy="119" r="3" fill="white"/>
      <circle cx="146" cy="122" r="11" fill="#4a148c"/><circle cx="150" cy="119" r="3" fill="white"/>
      <ellipse cx="128" cy="142" rx="13" ry="9" fill="#ffb300"/>
      <path d="M113 152 Q128 167 143 152" fill="none" stroke="#e65100" stroke-width="5" stroke-linecap="round"/>
      <line x1="100" y1="140" x2="65" y2="133" stroke="#5d4037" stroke-width="3"/>
      <line x1="100" y1="146" x2="63" y2="146" stroke="#5d4037" stroke-width="3"/>
      <line x1="156" y1="140" x2="191" y2="133" stroke="#5d4037" stroke-width="3"/>
      <line x1="156" y1="146" x2="193" y2="146" stroke="#5d4037" stroke-width="3"/>`,
  },
  {
    name: 'Elephant', bg: ['#e8eaf6', '#9fa8da'], body: '#90a4ae',
    draw: (_id) => `
      <ellipse cx="128" cy="148" rx="66" ry="62" fill="#90a4ae"/>
      <ellipse cx="92" cy="98" rx="20" ry="24" fill="#90a4ae"/>
      <ellipse cx="164" cy="98" rx="20" ry="24" fill="#90a4ae"/>
      <ellipse cx="92" cy="100" rx="12" ry="14" fill="#f8bbd9"/>
      <ellipse cx="164" cy="100" rx="12" ry="14" fill="#f8bbd9"/>
      <ellipse cx="128" cy="155" rx="46" ry="44" fill="#b0bec5"/>
      <ellipse cx="128" cy="178" rx="14" ry="22" fill="#90a4ae"/>
      <ellipse cx="128" cy="195" rx="10" ry="6" fill="#78909c"/>
      <circle cx="110" cy="143" r="11" fill="#263238"/><circle cx="114" cy="140" r="3.5" fill="white"/>
      <circle cx="146" cy="143" r="11" fill="#263238"/><circle cx="150" cy="140" r="3.5" fill="white"/>
      <path d="M113 160 Q128 174 143 160" fill="none" stroke="#455a64" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    name: 'Penguin', bg: ['#e3f2fd', '#42a5f5'], body: '#37474f',
    draw: (_id) => `
      <ellipse cx="128" cy="150" rx="56" ry="64" fill="#263238"/>
      <ellipse cx="128" cy="155" rx="34" ry="48" fill="#fafafa"/>
      <ellipse cx="92" cy="115" rx="16" ry="10" fill="#263238" transform="rotate(-30 92 115)"/>
      <ellipse cx="164" cy="115" rx="16" ry="10" fill="#263238" transform="rotate(30 164 115)"/>
      <circle cx="128" cy="112" r="38" fill="#263238"/>
      <circle cx="128" cy="112" r="26" fill="#fafafa"/>
      <circle cx="116" cy="108" r="10" fill="#1565c0"/><circle cx="120" cy="105" r="3" fill="white"/>
      <circle cx="140" cy="108" r="10" fill="#1565c0"/><circle cx="144" cy="105" r="3" fill="white"/>
      <ellipse cx="128" cy="122" rx="9" ry="5" fill="#f57f17"/>
      <path d="M116 130 Q128 142 140 130" fill="none" stroke="#e65100" stroke-width="4" stroke-linecap="round"/>`,
  },
  {
    name: 'Rabbit', bg: ['#fce4ec', '#f48fb1'], body: '#ffe0e6',
    draw: (_id) => `
      <ellipse cx="100" cy="80" rx="18" ry="42" fill="#f8bbd9"/>
      <ellipse cx="156" cy="80" rx="18" ry="42" fill="#f8bbd9"/>
      <ellipse cx="100" cy="82" rx="10" ry="32" fill="#f48fb1"/>
      <ellipse cx="156" cy="82" rx="10" ry="32" fill="#f48fb1"/>
      <circle cx="128" cy="148" r="60" fill="#ffe0e6"/>
      <circle cx="112" cy="138" r="11" fill="#1a237e"/><circle cx="116" cy="135" r="3.5" fill="white"/>
      <circle cx="144" cy="138" r="11" fill="#1a237e"/><circle cx="148" cy="135" r="3.5" fill="white"/>
      <ellipse cx="128" cy="158" rx="10" ry="7" fill="#e91e63"/>
      <path d="M113 168 Q128 180 143 168" fill="none" stroke="#ad1457" stroke-width="4" stroke-linecap="round"/>
      <line x1="105" y1="155" x2="72" y2="148" stroke="#ad1457" stroke-width="2.5"/>
      <line x1="105" y1="161" x2="70" y2="161" stroke="#ad1457" stroke-width="2.5"/>
      <line x1="151" y1="155" x2="184" y2="148" stroke="#ad1457" stroke-width="2.5"/>
      <line x1="151" y1="161" x2="186" y2="161" stroke="#ad1457" stroke-width="2.5"/>`,
  },
  {
    name: 'Tiger', bg: ['#fff3e0', '#ff8f00'], body: '#ff8f00',
    draw: (_id) => `
      <ellipse cx="128" cy="148" rx="62" ry="64" fill="#ff8f00"/>
      <ellipse cx="128" cy="162" rx="44" ry="46" fill="#ffe0b2"/>
      <ellipse cx="90" cy="100" rx="18" ry="22" fill="#ff8f00"/>
      <ellipse cx="166" cy="100" rx="18" ry="22" fill="#ff8f00"/>
      <ellipse cx="90" cy="103" rx="10" ry="13" fill="#ffd54f"/>
      <ellipse cx="166" cy="103" rx="10" ry="13" fill="#ffd54f"/>
      <path d="M110 118 Q128 108 146 118" fill="none" stroke="#4a148c" stroke-width="8"/>
      <path d="M105 132 Q128 122 151 132" fill="none" stroke="#4a148c" stroke-width="8"/>
      <path d="M118 92 Q128 82 138 92" fill="none" stroke="#4a148c" stroke-width="6"/>
      <circle cx="112" cy="138" r="12" fill="#1a237e"/><circle cx="116" cy="135" r="4" fill="white"/>
      <circle cx="144" cy="138" r="12" fill="#1a237e"/><circle cx="148" cy="135" r="4" fill="white"/>
      <ellipse cx="128" cy="162" rx="12" ry="8" fill="#e65100"/>
      <path d="M113 172 Q128 186 143 172" fill="none" stroke="#bf360c" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    name: 'Koala', bg: ['#f3e5f5', '#ce93d8'], body: '#b0bec5',
    draw: (_id) => `
      <circle cx="128" cy="145" r="65" fill="#b0bec5"/>
      <ellipse cx="84" cy="118" rx="28" ry="24" fill="#90a4ae"/>
      <ellipse cx="172" cy="118" rx="28" ry="24" fill="#90a4ae"/>
      <ellipse cx="84" cy="120" rx="20" ry="16" fill="#cfd8dc"/>
      <ellipse cx="172" cy="120" rx="20" ry="16" fill="#cfd8dc"/>
      <ellipse cx="128" cy="152" rx="46" ry="44" fill="#cfd8dc"/>
      <ellipse cx="128" cy="142" rx="18" ry="14" fill="#546e7a"/>
      <circle cx="112" cy="145" r="11" fill="#212121"/><circle cx="116" cy="142" r="3.5" fill="white"/>
      <circle cx="144" cy="145" r="11" fill="#212121"/><circle cx="148" cy="142" r="3.5" fill="white"/>
      <path d="M114 162 Q128 174 142 162" fill="none" stroke="#37474f" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    name: 'Owl', bg: ['#e8f5e9', '#66bb6a'], body: '#795548',
    draw: (_id) => `
      <ellipse cx="128" cy="148" rx="62" ry="66" fill="#795548"/>
      <ellipse cx="128" cy="152" rx="44" ry="50" fill="#a1887f"/>
      <polygon points="100,80 88,50 116,78" fill="#5d4037"/>
      <polygon points="156,80 168,50 140,78" fill="#5d4037"/>
      <circle cx="108" cy="138" r="22" fill="#fafafa"/>
      <circle cx="148" cy="138" r="22" fill="#fafafa"/>
      <circle cx="108" cy="138" r="15" fill="#f57f17"/>
      <circle cx="148" cy="138" r="15" fill="#f57f17"/>
      <circle cx="108" cy="138" r="9" fill="#1a237e"/><circle cx="111" cy="135" r="3" fill="white"/>
      <circle cx="148" cy="138" r="9" fill="#1a237e"/><circle cx="151" cy="135" r="3" fill="white"/>
      <polygon points="120,158 128,170 136,158" fill="#e65100"/>
      <path d="M108 178 Q128 192 148 178" fill="none" stroke="#4e342e" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    name: 'Frog', bg: ['#e8f5e9', '#43a047'], body: '#388e3c',
    draw: (_id) => `
      <circle cx="128" cy="148" r="64" fill="#388e3c"/>
      <ellipse cx="128" cy="158" rx="46" ry="46" fill="#66bb6a"/>
      <circle cx="96" cy="92" r="22" fill="#388e3c"/>
      <circle cx="160" cy="92" r="22" fill="#388e3c"/>
      <circle cx="96" cy="92" r="14" fill="#f5f5f5"/>
      <circle cx="160" cy="92" r="14" fill="#f5f5f5"/>
      <circle cx="96" cy="92" r="9" fill="#1b5e20"/><circle cx="99" cy="89" r="3" fill="white"/>
      <circle cx="160" cy="92" r="9" fill="#1b5e20"/><circle cx="163" cy="89" r="3" fill="white"/>
      <ellipse cx="128" cy="160" rx="38" ry="16" fill="#a5d6a7"/>
      <path d="M106 160 Q128 180 150 160" fill="none" stroke="#1b5e20" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="110" cy="165" rx="6" ry="4" fill="#ffcdd2"/>
      <ellipse cx="146" cy="165" rx="6" ry="4" fill="#ffcdd2"/>`,
  },
  {
    name: 'Bear', bg: ['#efebe9', '#a1887f'], body: '#6d4c41',
    draw: (_id) => `
      <circle cx="128" cy="148" r="64" fill="#6d4c41"/>
      <ellipse cx="90" cy="100" rx="22" ry="22" fill="#6d4c41"/>
      <ellipse cx="166" cy="100" rx="22" ry="22" fill="#6d4c41"/>
      <ellipse cx="90" cy="104" rx="14" ry="14" fill="#8d6e63"/>
      <ellipse cx="166" cy="104" rx="14" ry="14" fill="#8d6e63"/>
      <ellipse cx="128" cy="158" rx="46" ry="46" fill="#8d6e63"/>
      <ellipse cx="128" cy="170" rx="22" ry="16" fill="#a1887f"/>
      <circle cx="110" cy="142" r="12" fill="#212121"/><circle cx="114" cy="139" r="4" fill="white"/>
      <circle cx="146" cy="142" r="12" fill="#212121"/><circle cx="150" cy="139" r="4" fill="white"/>
      <ellipse cx="128" cy="162" rx="12" ry="8" fill="#4e342e"/>
      <path d="M112 172 Q128 186 144 172" fill="none" stroke="#3e2723" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    name: 'Cat', bg: ['#fff8e1', '#ffca28'], body: '#ff8f00',
    draw: (_id) => `
      <ellipse cx="128" cy="150" rx="60" ry="62" fill="#ffb300"/>
      <polygon points="88,100 70,56 106,90" fill="#ffb300"/>
      <polygon points="168,100 186,56 150,90" fill="#ffb300"/>
      <polygon points="88,100 76,60 106,90" fill="#ffe082"/>
      <polygon points="168,100 180,60 150,90" fill="#ffe082"/>
      <ellipse cx="128" cy="158" rx="44" ry="46" fill="#ffe082"/>
      <circle cx="110" cy="140" r="12" fill="#1a237e"/><circle cx="114" cy="137" r="4" fill="white"/>
      <circle cx="146" cy="140" r="12" fill="#1a237e"/><circle cx="150" cy="137" r="4" fill="white"/>
      <ellipse cx="128" cy="162" rx="10" ry="7" fill="#e65100"/>
      <path d="M113 172 Q128 184 143 172" fill="none" stroke="#bf360c" stroke-width="4" stroke-linecap="round"/>
      <line x1="100" y1="158" x2="66" y2="150" stroke="#5d4037" stroke-width="2.5"/>
      <line x1="100" y1="164" x2="64" y2="164" stroke="#5d4037" stroke-width="2.5"/>
      <line x1="156" y1="158" x2="190" y2="150" stroke="#5d4037" stroke-width="2.5"/>
      <line x1="156" y1="164" x2="192" y2="164" stroke="#5d4037" stroke-width="2.5"/>`,
  },
  {
    name: 'Monkey', bg: ['#fbe9e7', '#ff7043'], body: '#795548',
    draw: (_id) => `
      <circle cx="128" cy="148" r="64" fill="#795548"/>
      <ellipse cx="86" cy="120" rx="24" ry="22" fill="#795548"/>
      <ellipse cx="170" cy="120" rx="24" ry="22" fill="#795548"/>
      <ellipse cx="86" cy="123" rx="16" ry="14" fill="#f8bbd9"/>
      <ellipse cx="170" cy="123" rx="16" ry="14" fill="#f8bbd9"/>
      <circle cx="128" cy="148" r="50" fill="#a1887f"/>
      <ellipse cx="128" cy="168" rx="32" ry="22" fill="#d7ccc8"/>
      <circle cx="112" cy="140" r="12" fill="#1a237e"/><circle cx="116" cy="137" r="4" fill="white"/>
      <circle cx="144" cy="140" r="12" fill="#1a237e"/><circle cx="148" cy="137" r="4" fill="white"/>
      <ellipse cx="128" cy="162" rx="10" ry="7" fill="#6d4c41"/>
      <path d="M113 172 Q128 186 143 172" fill="none" stroke="#4e342e" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    name: 'Deer', bg: ['#f1f8e9', '#aed581'], body: '#8d6e63',
    draw: (_id) => `
      <ellipse cx="128" cy="152" rx="60" ry="62" fill="#8d6e63"/>
      <path d="M96 90 L80 48 L72 70 L88 85" fill="#5d4037" stroke="#5d4037" stroke-width="3" stroke-linejoin="round"/>
      <path d="M96 90 L86 46 L96 62 L106 84" fill="#5d4037" stroke="#5d4037" stroke-width="2" stroke-linejoin="round"/>
      <path d="M160 90 L176 48 L184 70 L168 85" fill="#5d4037" stroke="#5d4037" stroke-width="3" stroke-linejoin="round"/>
      <path d="M160 90 L170 46 L160 62 L150 84" fill="#5d4037" stroke="#5d4037" stroke-width="2" stroke-linejoin="round"/>
      <ellipse cx="128" cy="158" rx="44" ry="46" fill="#a1887f"/>
      <circle cx="112" cy="142" r="12" fill="#1b5e20"/><circle cx="116" cy="139" r="4" fill="white"/>
      <circle cx="144" cy="142" r="12" fill="#1b5e20"/><circle cx="148" cy="139" r="4" fill="white"/>
      <ellipse cx="128" cy="163" rx="12" ry="8" fill="#e91e63"/>
      <path d="M113 173 Q128 185 143 173" fill="none" stroke="#880e4f" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="110" cy="168" rx="7" ry="5" fill="#ffcdd2"/>
      <ellipse cx="146" cy="168" rx="7" ry="5" fill="#ffcdd2"/>`,
  },
  {
    name: 'Duck', bg: ['#e0f7fa', '#26c6da'], body: '#ffee58',
    draw: (_id) => `
      <circle cx="128" cy="148" r="64" fill="#ffee58"/>
      <ellipse cx="128" cy="155" rx="46" ry="48" fill="#fff176"/>
      <path d="M88 108 Q70 95 68 115 Q66 130 90 125 Z" fill="#66bb6a"/>
      <path d="M168 108 Q186 95 188 115 Q190 130 166 125 Z" fill="#66bb6a"/>
      <circle cx="110" cy="135" r="12" fill="#1a237e"/><circle cx="114" cy="132" r="4" fill="white"/>
      <circle cx="146" cy="135" r="12" fill="#1a237e"/><circle cx="150" cy="132" r="4" fill="white"/>
      <path d="M112 152 L128 164 L144 152 L140 148 L128 156 L116 148 Z" fill="#ff8f00"/>
      <path d="M108 168 Q128 184 148 168" fill="none" stroke="#e65100" stroke-width="4" stroke-linecap="round"/>`,
  },
  {
    name: 'Dragon', bg: ['#fce4ec', '#e040fb'], body: '#7b1fa2',
    draw: (_id) => `
      <circle cx="128" cy="148" r="64" fill="#6a1b9a"/>
      <polygon points="100,82 88,48 116,78" fill="#ce93d8"/>
      <polygon points="156,82 168,48 140,78" fill="#ce93d8"/>
      <ellipse cx="128" cy="156" rx="48" ry="50" fill="#9c27b0"/>
      <ellipse cx="128" cy="166" rx="34" ry="34" fill="#e1bee7"/>
      <circle cx="110" cy="140" r="13" fill="#f57f17"/><circle cx="115" cy="136" r="5" fill="white"/>
      <circle cx="146" cy="140" r="13" fill="#f57f17"/><circle cx="151" cy="136" r="5" fill="white"/>
      <ellipse cx="128" cy="164" rx="14" ry="9" fill="#8b0000"/>
      <path d="M110 174 Q128 192 146 174" fill="none" stroke="#4a148c" stroke-width="5" stroke-linecap="round"/>
      <circle cx="118" cy="162" r="4" fill="#ff5722"/>
      <circle cx="138" cy="162" r="4" fill="#ff5722"/>`,
  },
];

const GRADIENTS: Array<[string, string]> = [
  ['#ff9a9e', '#fad0c4'], ['#a1c4fd', '#c2e9fb'], ['#d4fc79', '#96e6a1'],
  ['#ffecd2', '#fcb69f'], ['#a18cd1', '#fbc2eb'], ['#84fab0', '#8fd3f4'],
  ['#fccb90', '#d57eeb'], ['#e0c3fc', '#8ec5fc'], ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'], ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'],
  ['#30cfd0', '#330867'], ['#667eea', '#764ba2'], ['#f7971e', '#ffd200'],
  ['#11998e', '#38ef7d'],
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

function buildAnimalAvatarSvg(seed: number): string {
  const animal = ANIMALS[seed % ANIMALS.length];
  // Multiply by 7 (coprime to 16) to decouple gradient from animal
  const gradient = GRADIENTS[(seed * 7) % GRADIENTS.length];
  const id = `av${seed}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${animal.name} avatar">
  <defs>
    <linearGradient id="bg${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gradient[0]}"/>
      <stop offset="100%" stop-color="${gradient[1]}"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="128" fill="url(#bg${id})"/>
  <circle cx="46" cy="52" r="22" fill="rgba(255,255,255,0.2)"/>
  <circle cx="210" cy="44" r="12" fill="rgba(255,255,255,0.15)"/>
  <circle cx="218" cy="198" r="18" fill="rgba(255,255,255,0.12)"/>
  ${animal.draw(id)}
</svg>`;
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

/**
 * Get a consistent colorful animal avatar URL based on provider ID or index.
 * Each seed maps deterministically to a unique animal + unique gradient background.
 */
export function getProviderImage(providerIdOrIndex: string | number): string {
  const seed = hashSeed(providerIdOrIndex);
  return svgToDataUri(buildAnimalAvatarSvg(seed));
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
