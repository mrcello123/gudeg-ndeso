// Inline SVG icons (currentColor) so they can be recolored with CSS.
const svg = (vb, body, extra = '') => `<svg viewBox="${vb}" fill="currentColor" aria-hidden="true" ${extra}>${body}</svg>`;

export const icons = {
  menu: svg('0 0 27 20', '<path d="M0 1h27M0 10h27M0 19h27" stroke="currentColor" stroke-width="1.2" fill="none"/>', 'width="27" height="20"'),
  cart: svg('0 0 24 24', '<path d="M7 18a2 2 0 100 4 2 2 0 000-4zM1 2v2h2l3.6 7.6-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42a.25.25 0 01-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0020 4H5.21l-.94-2H1zm16 16a2 2 0 100 4 2 2 0 000-4z"/>', 'width="32" height="32"'),
  dineIn: svg('0 0 24 24', '<circle cx="6" cy="4.8" r="2.2"/><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8.5v5.5h5.5V21M6 10.2l5 1.3M13 12h9M14.5 12v9M20.5 12v9"/></g>'),
  takeAway: svg('0 0 24 24', '<path fill-rule="evenodd" d="M6 2.5h12l1.7 4.5H4.3L6 2.5zM4 8.5h16V21.5H4V8.5zm4.5 3v3.2h7v-3.2h-7z"/>'),
  clock: svg('0 0 24 24', '<path fill-rule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 4.5h2v5.6l3.6 2.1-1 1.7L11 13V6.5z"/>'),
  check: svg('0 0 12 12', '<path d="M2.2 6.4l2.6 2.6 5-5.6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  chevron: svg('0 0 8 12', '<path d="M1.5 1.2L6.3 6l-4.8 4.8" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  minus: svg('0 0 19 19', '<rect x="3.5" y="3.5" width="12" height="12" rx="3" fill="none" stroke="#2d1608" stroke-width="1.4"/><path d="M6.8 9.5h5.4" stroke="#2d1608" stroke-width="1.4" stroke-linecap="round"/>', 'width="19" height="19"'),
  plus: svg('0 0 19 19', '<rect x="3.5" y="3.5" width="12" height="12" rx="3" fill="none" stroke="#2d1608" stroke-width="1.4"/><path d="M6.8 9.5h5.4M9.5 6.8v5.4" stroke="#2d1608" stroke-width="1.4" stroke-linecap="round"/>', 'width="19" height="19"'),
};

export const SERVICES = {
  'dine-in': { label: 'Makan di Tempat (Dine In)', short: 'DINE IN', icon: 'dineIn' },
  'take-away': { label: 'Bawa Pulang (Take Away)', short: 'TAKE AWAY', icon: 'takeAway' },
  'pre-order': { label: 'Pre-Order', short: 'PRE-ORDER', icon: 'clock' },
};
