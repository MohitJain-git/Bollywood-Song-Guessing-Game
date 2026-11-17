/**
 * Modern Game Tech Utilities:
 * 1. Hinglish Phonetic & Levenshtein Fuzzy Song Matcher
 * 2. View Transitions API Wrapper with Mandatory Accessibility Focus Routing
 * 3. Era-Dynamic Ambient Theme Tokens
 */

export const ERA_THEMES = {
  all: {
    id: 'all',
    label: '🌟 All Eras',
    tagline: '60 Years of Iconic Bollywood Cinema',
    primary: '#fbbf24',
    secondary: '#f43f5e',
    accent: '#c084fc',
    glow1: '#e11d48',
    glow2: '#8b5cf6'
  },
  Classics: {
    id: 'Classics',
    label: '📻 Golden Classics',
    tagline: 'Evergreen Melodies of the 60s, 70s & 80s',
    primary: '#f59e0b',
    secondary: '#d97706',
    accent: '#fde68a',
    glow1: '#d97706',
    glow2: '#92400e'
  },
  '90s': {
    id: '90s',
    label: '📼 90s Nostalgia',
    tagline: 'Cassette Tapes, Chiffon Sarees & Swiss Alps Romance',
    primary: '#f472b6',
    secondary: '#06b6d4',
    accent: '#a855f7',
    glow1: '#ec4899',
    glow2: '#0891b2'
  },
  '2000s': {
    id: '2000s',
    label: '🎧 2000s Golden',
    tagline: 'Y2K Anthems, Sufi Rock & Blockbuster Grandeur',
    primary: '#38bdf8',
    secondary: '#fbbf24',
    accent: '#818cf8',
    glow1: '#2563eb',
    glow2: '#d97706'
  },
  '2010s': {
    id: '2010s',
    label: '🔥 2010s Blockbusters',
    tagline: 'Acoustic Heartbreak, Soulful Arijit & Party Bangers',
    primary: '#34d399',
    secondary: '#fb7185',
    accent: '#fbbf24',
    glow1: '#059669',
    glow2: '#e11d48'
  },
  '2020s': {
    id: '2020s',
    label: '✨ 2020s Trending',
    tagline: 'Modern Chartbusters, Synth-Pop & Viral Reels',
    primary: '#c084fc',
    secondary: '#f43f5e',
    accent: '#38bdf8',
    glow1: '#9333ea',
    glow2: '#e11d48'
  },
  latest: {
    id: 'latest',
    label: '🆕 Daily Latest (10/Day)',
    tagline: '10 Fresh Latest Bollywood Chartbusters Added Daily for Both Games',
    primary: '#34d399',
    secondary: '#fbbf24',
    accent: '#38bdf8',
    glow1: '#059669',
    glow2: '#0284c7'
  }
};

/**
 * Applies era-specific CSS custom properties to document root
 */
export function applyEraTheme(era = 'all') {
  if (typeof document === 'undefined') return;
  const theme = ERA_THEMES[era] || ERA_THEMES.all;
  const root = document.documentElement;
  root.style.setProperty('--era-primary', theme.primary);
  root.style.setProperty('--era-secondary', theme.secondary);
  root.style.setProperty('--era-accent', theme.accent);
  root.style.setProperty('--era-glow-1', theme.glow1);
  root.style.setProperty('--era-glow-2', theme.glow2);
}

/**
 * Normalizes Romanized Hindi (Hinglish) phonetic variations so players aren't
 * penalized for spelling "Kal Ho Na Ho" vs "Kal Ho Naa Ho" or "Chaiya" vs "Chaiyya".
 */
export function normalizeHinglish(str = '') {
  return str
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '') // Strip parenthetical suffixes
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(the|from|song|track)\b/g, '')
    .replace(/aa+/g, 'a')
    .replace(/ee+/g, 'i')
    .replace(/oo+/g, 'u')
    .replace(/yy+/g, 'y')
    .replace(/nn+/g, 'n')
    .replace(/mm+/g, 'm')
    .replace(/ll+/g, 'l')
    .replace(/ss+/g, 's')
    .replace(/ph/g, 'f')
    .replace(/sh/g, 's')
    .replace(/chh/g, 'ch')
    .replace(/z/g, 'j')
    .replace(/w/g, 'v')
    .replace(/toh\b/g, 'to')
    .replace(/hai\b/g, 'he')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Computes Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a = '', b = '') {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Evaluates a user's song guess against the target song title with Hinglish phonetic
 * normalization and fuzzy typo tolerance.
 */
export function matchBollywoodSongGuess(userGuess = '', targetSong = '') {
  const rawGuess = userGuess.toLowerCase().replace(/[^a-z0-9]/g, '');
  const rawTarget = targetSong.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (!rawGuess || !rawTarget) {
    return { isMatch: false, isClose: false, similarity: 0 };
  }

  // 1. Direct alphanumeric match or significant prefix/substring match
  if (
    rawGuess === rawTarget ||
    (rawTarget.includes(rawGuess) && rawGuess.length >= Math.min(5, rawTarget.length))
  ) {
    return { isMatch: true, isClose: false, similarity: 1 };
  }

  // 2. Phonetic Hinglish match
  const phonGuess = normalizeHinglish(userGuess);
  const phonTarget = normalizeHinglish(targetSong);

  if (
    phonGuess === phonTarget ||
    (phonTarget.includes(phonGuess) && phonGuess.length >= Math.min(5, phonTarget.length))
  ) {
    return { isMatch: true, isClose: false, similarity: 0.98 };
  }

  // 3. Levenshtein similarity check
  const dist = levenshteinDistance(phonGuess, phonTarget);
  const maxLen = Math.max(phonGuess.length, phonTarget.length, 1);
  const similarity = 1 - dist / maxLen;

  if (similarity >= 0.8 || (phonTarget.length >= 7 && dist <= 2)) {
    return { isMatch: true, isClose: false, similarity };
  }

  if (similarity >= 0.58 || (phonTarget.length >= 6 && dist <= 3)) {
    return { isMatch: false, isClose: true, similarity };
  }

  return { isMatch: false, isClose: false, similarity };
}

/**
 * Runs a state update inside the View Transitions API with mandatory accessibility focus routing
 */
export function triggerViewTransition(updateCallback, focusSelector = null) {
  const routeFocus = () => {
    if (!focusSelector || typeof document === 'undefined') return;
    requestAnimationFrame(() => {
      const el = document.querySelector(focusSelector);
      if (el && typeof el.focus === 'function') {
        el.focus({ preventScroll: true });
      }
    });
  };

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (typeof document === 'undefined' || !document.startViewTransition || prefersReducedMotion) {
    updateCallback();
    routeFocus();
    return;
  }

  const transition = document.startViewTransition(() => {
    updateCallback();
  });

  transition.finished.finally(() => {
    routeFocus();
  });
}

/**
 * Safely loads persisted session state from localStorage so page reloads
 * preserve the active song, clue level, score, streak, and team state.
 */
export function loadSessionState(storageKey, fallback = {}) {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? { ...fallback, ...parsed } : fallback;
  } catch (e) {
    return fallback;
  }
}

/**
 * Safely saves session state to localStorage
 */
export function saveSessionState(storageKey, stateObj) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(stateObj));
  } catch (e) {
    // Ignore storage quota errors
  }
}

/**
 * Builds a structured Song Title Word Pattern clue (first letter of each word + underscores)
 */
export function buildWordPatternClue(title = '') {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const maskedWords = words.map((w) => {
    const clean = w.replace(/[^a-zA-Z0-9]/g, '');
    if (clean.length <= 1) return clean.toUpperCase();
    return clean[0].toUpperCase() + ' ' + '_ '.repeat(clean.length - 1).trim();
  });
  return {
    titleMask: maskedWords.join('   •   '),
    wordCount: words.length,
    letterCounts: words.map((w) => w.replace(/[^a-zA-Z0-9]/g, '').length)
  };
}
