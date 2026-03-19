/**
 * gestures-page.js — Gesture Mappings Page Controller
 *
 * Renders all gesture cards with metadata from the gesture registry
 * and provides search/filter functionality.
 */

// ── Gesture Data ──────────────────────────────────────────────
const GESTURES = [
  {
    word: 'HELLO',
    id: 113,
    description: 'Open hand wave near forehead, palm facing outward',
    handShape: 'Open (5 fingers)',
    zone: 'Face',
    hands: 1,
    icon: '👋',
    details: [
      'Raise dominant hand to forehead level',
      'Spread all 5 fingers wide',
      'Palm should face outward / away from you',
      'Wrist must be above shoulder line',
    ],
  },
  {
    word: 'MOM',
    id: 145,
    description: 'Open hand, thumb tip touches chin area',
    handShape: 'Open (5 fingers)',
    zone: 'Face',
    hands: 1,
    icon: '👩',
    details: [
      'Open hand with all fingers spread',
      'Bring thumb to chin / mouth area',
      'Thumb tip should be below index finger MCP',
      'Wrist near mouth height',
    ],
  },
  {
    word: 'DAD',
    id: 55,
    description: 'Open hand, thumb tip touches forehead',
    handShape: 'Open (5 fingers)',
    zone: 'Face',
    hands: 1,
    icon: '👨',
    details: [
      'Open hand with all fingers spread',
      'Bring hand near forehead',
      'Thumb tip should be above wrist',
      'Similar to MOM but higher position',
    ],
  },
  {
    word: 'HAPPY',
    id: 105,
    description: 'Flat hand brushes upward on chest (B-hand)',
    handShape: 'Open (flat)',
    zone: 'Body',
    hands: 1,
    icon: '😊',
    details: [
      'Open flat hand near chest area',
      'Fingers pointing upward',
      'Brush hand upward on chest',
      'Circular motion repeated',
    ],
  },
  {
    word: 'NOW',
    id: 157,
    description: 'Both hands bend down at wrists, palms up',
    handShape: 'Bent hands',
    zone: 'Body',
    hands: 2,
    icon: '⏳',
    details: [
      'Both hands required',
      'Position below shoulder line',
      'Wrists bent — fingers level with wrists',
      'Palms facing upward',
    ],
  },
  {
    word: 'PLEASE',
    id: 173,
    description: 'Flat hand circles on chest, palm facing body',
    handShape: 'Open (flat)',
    zone: 'Body',
    hands: 1,
    icon: '🙏',
    details: [
      'Open flat hand on chest',
      'Palm facing inward toward body',
      'Circular rubbing motion',
      'Thumb side toward body (inward)',
    ],
  },
  {
    word: 'GIVE',
    id: 95,
    description: 'Both hands open, extended forward from body',
    handShape: 'Open (5 fingers)',
    zone: 'Body',
    hands: 2,
    icon: '🤲',
    details: [
      'Both hands must be open',
      'Extend forward from body',
      'Hands at mid-body level',
      'Below shoulder line',
    ],
  },
  {
    word: 'MILK',
    id: 142,
    description: 'Squeeze hand repeatedly — open/close fist motion',
    handShape: 'Squeeze (partial)',
    zone: 'Body',
    hands: 1,
    icon: '🥛',
    details: [
      'Hand at mid-body level',
      'Alternating open and close',
      '2–4 fingers extended during squeeze',
      'Mimics milking motion',
    ],
  },
  {
    word: 'THANK YOU',
    id: 214,
    description: 'Flat hand (B-hand) from chin moves outward',
    handShape: 'Open (flat)',
    zone: 'Face',
    hands: 1,
    icon: '🙂',
    details: [
      'Open flat hand near face / chin',
      'Move hand outward from face',
      'Fingertips should move away from nose',
      'Similar to blowing a kiss motion',
    ],
  },
  {
    word: 'YES',
    id: 244,
    description: 'Fist nods — S-hand with wrist bobbing',
    handShape: 'Fist (S-hand)',
    zone: 'Face',
    hands: 1,
    icon: '✅',
    details: [
      'Make a fist (all fingers curled)',
      'Position near face level',
      'Nod the wrist up and down',
      'Like the fist is "nodding yes"',
    ],
  },
  {
    word: 'NO',
    id: 153,
    description: 'Index + middle finger tap thumb',
    handShape: 'Modified pinch',
    zone: 'Neutral',
    hands: 1,
    icon: '❌',
    details: [
      'Extend index and middle finger',
      'Thumb also extended',
      'Ring and pinky curled',
      'Index and middle snap toward thumb',
    ],
  },
  {
    word: 'DOG',
    id: 58,
    description: 'Snap fingers — pinch index + thumb, hand at side',
    handShape: 'Pinch',
    zone: 'Body',
    hands: 1,
    icon: '🐕',
    details: [
      'Pinch index finger and thumb together',
      'Hand at mid-body level',
      'Between shoulder and hip height',
      'Like snapping + patting thigh',
    ],
  },
  {
    word: 'CAT',
    id: 38,
    description: 'Pinch near cheek, pull outward (whiskers)',
    handShape: 'Pinch',
    zone: 'Face',
    hands: 1,
    icon: '🐈',
    details: [
      'Pinch fingers near cheek area',
      'Hand at cheek / nose level',
      'Pull outward from face',
      'Mimics tracing cat whiskers',
    ],
  },
  {
    word: 'DRINK',
    id: 63,
    description: 'C-hand shape raises toward mouth',
    handShape: 'C-shape',
    zone: 'Face',
    hands: 1,
    icon: '🥤',
    details: [
      'Curved hand — C-shape',
      'Thumb extended outward',
      '1–3 fingers partially curled',
      'Raise hand toward mouth',
    ],
  },
  {
    word: 'GO',
    id: 97,
    description: 'Both index fingers point forward, then arc',
    handShape: 'Index pointing',
    zone: 'Neutral',
    hands: 2,
    icon: '➡️',
    details: [
      'Both hands with index finger only',
      'Point both indexes forward',
      'Hands should be spread apart',
      'Arc motion outward',
    ],
  },
  {
    word: 'OUTSIDE',
    id: 163,
    description: 'Flat O-hand pulls out of non-dominant hand',
    handShape: 'O-shape',
    zone: 'Body',
    hands: 1,
    icon: '🏞️',
    details: [
      'Fingertips bunched together (O-shape)',
      'Small tip spread — all near each other',
      'Hand at mid-body level',
      'Pull outward from body',
    ],
  },
  {
    word: 'BOY',
    id: 29,
    description: 'Grab brim of hat at forehead — open/close',
    handShape: 'Pinch / partial',
    zone: 'Face',
    hands: 1,
    icon: '👦',
    details: [
      'Hand near forehead level',
      'Pinch or partial open hand',
      '2–4 fingers extended',
      'Open-close motion at forehead',
    ],
  },
  {
    word: 'GIRL',
    id: 94,
    description: 'Thumb traces jawline downward (A-hand)',
    handShape: 'Fist + thumb',
    zone: 'Face',
    hands: 1,
    icon: '👧',
    details: [
      'Make a fist with thumb extended (A-hand)',
      'Position near face / jaw area',
      'Thumb traces along jawline',
      'Move downward along jaw',
    ],
  },
  {
    word: 'WATER',
    id: 234,
    description: 'W-handshape taps lips — index, middle, ring extended',
    handShape: 'W-shape (3 fingers)',
    zone: 'Face',
    hands: 1,
    icon: '💧',
    details: [
      'Extend index, middle, and ring fingers',
      'Pinky curled in',
      'W-handshape',
      'Tap fingers to lips / chin area',
    ],
  },
  {
    word: 'SEE',
    id: 193,
    description: 'V-hand (peace sign) points from eyes outward',
    handShape: 'V-shape (peace)',
    zone: 'Face',
    hands: 1,
    icon: '👀',
    details: [
      'V-shape — index + middle extended',
      'Ring and pinky curled',
      'Position at eye level',
      'Point fingertips outward from eyes',
    ],
  },
];

// ── Zone / hands tags for filtering ──────────────────────────
function getTags(gesture) {
  const tags = [];
  tags.push(gesture.hands === 1 ? 'one-hand' : 'two-hands');
  if (['Face'].includes(gesture.zone)) tags.push('face-zone');
  if (['Body', 'Neutral'].includes(gesture.zone)) tags.push('body-zone');
  return tags;
}

// ── Zone color mapping ───────────────────────────────────────
const ZONE_COLORS = {
  Face: { bg: 'rgba(0, 229, 204, 0.08)', border: 'rgba(0, 229, 204, 0.25)', text: '#00e5cc' },
  Body: { bg: 'rgba(124, 58, 237, 0.08)', border: 'rgba(124, 58, 237, 0.25)', text: '#a78bfa' },
  Neutral: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', text: '#f59e0b' },
};

// ── Render card ──────────────────────────────────────────────
function createCard(gesture) {
  const tags = getTags(gesture);
  const zoneStyle = ZONE_COLORS[gesture.zone] || ZONE_COLORS.Neutral;

  const card = document.createElement('div');
  card.className = 'gesture-card';
  card.dataset.tags = tags.join(' ');
  card.dataset.word = gesture.word.toLowerCase();

  card.innerHTML = `
    <div class="gesture-card-header">
      <span class="gesture-icon">${gesture.icon}</span>
      <div class="gesture-id-badge">ID ${gesture.id}</div>
    </div>
    <h2 class="gesture-word">${gesture.word}</h2>
    <p class="gesture-desc">${gesture.description}</p>
    <div class="gesture-meta">
      <span class="gesture-tag" style="background:${zoneStyle.bg};border-color:${zoneStyle.border};color:${zoneStyle.text}">
        ${gesture.zone.toUpperCase()} ZONE
      </span>
      <span class="gesture-tag hands-tag">
        ${gesture.hands === 1 ? '✋ ONE HAND' : '🤝 TWO HANDS'}
      </span>
    </div>
    <div class="gesture-shape-label">HAND SHAPE</div>
    <div class="gesture-shape">${gesture.handShape}</div>
    <div class="gesture-details-label">STEPS</div>
    <ul class="gesture-details">
      ${gesture.details.map(d => `<li>${d}</li>`).join('')}
    </ul>
  `;

  return card;
}

// ── Init ─────────────────────────────────────────────────────
const grid = document.getElementById('gestures-grid');
const searchInput = document.getElementById('gesture-search');
const filterBtns = document.querySelectorAll('.filter-btn');
let activeFilter = 'all';

// Render all cards
function renderCards() {
  grid.innerHTML = '';
  const query = searchInput.value.trim().toLowerCase();

  let visibleCount = 0;
  for (const gesture of GESTURES) {
    const tags = getTags(gesture);
    const matchesFilter = activeFilter === 'all' || tags.includes(activeFilter);
    const matchesSearch = !query || gesture.word.toLowerCase().includes(query) ||
      gesture.description.toLowerCase().includes(query) ||
      gesture.handShape.toLowerCase().includes(query);

    if (matchesFilter && matchesSearch) {
      grid.appendChild(createCard(gesture));
      visibleCount++;
    }
  }

  if (visibleCount === 0) {
    grid.innerHTML = '<div class="no-results">No gestures match your filter</div>';
  }

  document.getElementById('gesture-count').textContent = visibleCount;
}

// Filter buttons
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderCards();
  });
});

// Search
searchInput.addEventListener('input', renderCards);

// Initial render
renderCards();
