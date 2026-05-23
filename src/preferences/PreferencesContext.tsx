import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export type Density = 'compact' | 'cozy' | 'comfortable';
export type BubbleShape = 'sharp' | 'rounded' | 'pill';
export type FontScale = 'sm' | 'md' | 'lg' | 'xl';
export type FontFamily = 'system' | 'inter' | 'serif' | 'mono' | 'rounded';
export type ChatWallpaper =
  | { kind: 'none' }
  | { kind: 'gradient'; id: string }
  | { kind: 'solid'; color: string }
  | { kind: 'image'; url: string }
  | { kind: 'pattern'; id: string };

export interface Preferences {
  accentOverride: string | null;
  density: Density;
  bubbleShape: BubbleShape;
  fontScale: FontScale;
  fontFamily: FontFamily;
  reduceMotion: boolean;
  messageAnimations: boolean;
  sendOnEnter: boolean;
  showAvatars: boolean;
  glassEffect: boolean;
  wallpaper: ChatWallpaper;
}

const DEFAULTS: Preferences = {
  accentOverride: null,
  density: 'cozy',
  bubbleShape: 'rounded',
  fontScale: 'md',
  fontFamily: 'inter',
  reduceMotion: false,
  messageAnimations: true,
  sendOnEnter: true,
  showAvatars: true,
  glassEffect: true,
  wallpaper: { kind: 'none' },
};

const STORAGE_KEY = 'app-preferences-v1';

const loadPrefs = (): Preferences => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
};

const hexToRgb = (hex: string): [number, number, number] | null => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
};

const shiftHex = (hex: string, deltaPct: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map((c) =>
    Math.min(255, Math.max(0, Math.round(c + (255 - c) * deltaPct))),
  );
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

export const FONT_STACKS: Record<FontFamily, string> = {
  system:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  inter:
    '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Roboto, sans-serif',
  serif: '"Iowan Old Style", Georgia, "Times New Roman", serif',
  mono: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
  rounded:
    '"SF Pro Rounded", "Nunito", "Quicksand", "Helvetica Neue", system-ui, sans-serif',
};

export const WALLPAPER_GRADIENTS: { id: string; label: string; bg: string }[] =
  [
    {
      id: 'aurora',
      label: 'Aurora',
      bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    },
    {
      id: 'sunset',
      label: 'Sunset',
      bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
    {
      id: 'mint',
      label: 'Mint',
      bg: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    },
    {
      id: 'cosmic',
      label: 'Cosmic',
      bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    },
    {
      id: 'peach',
      label: 'Peach',
      bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    },
    {
      id: 'iris',
      label: 'Iris',
      bg: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    },
    {
      id: 'forest',
      label: 'Forest',
      bg: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    },
    {
      id: 'ocean',
      label: 'Ocean',
      bg: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
    },
  ];

export const PATTERN_OPTIONS: { id: string; label: string; css: string }[] = [
  {
    id: 'dots',
    label: 'Dots',
    css: 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.15) 1px, transparent 0) 0 0/22px 22px',
  },
  {
    id: 'grid',
    label: 'Grid',
    css: 'linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px) 0 0/24px 24px',
  },
  {
    id: 'diagonal',
    label: 'Lines',
    css: 'repeating-linear-gradient(45deg, rgba(99,102,241,0.04) 0 2px, transparent 2px 14px)',
  },
];

export const ACCENT_PALETTE: { id: string; color: string; label: string }[] = [
  { id: 'indigo', color: '#6366f1', label: 'Indigo' },
  { id: 'violet', color: '#8b5cf6', label: 'Violet' },
  { id: 'pink', color: '#ec4899', label: 'Pink' },
  { id: 'rose', color: '#f43f5e', label: 'Rose' },
  { id: 'amber', color: '#f59e0b', label: 'Amber' },
  { id: 'emerald', color: '#10b981', label: 'Emerald' },
  { id: 'cyan', color: '#06b6d4', label: 'Cyan' },
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'purple', color: '#a855f7', label: 'Purple' },
  { id: 'teal', color: '#14b8a6', label: 'Teal' },
];

interface PrefsContextValue {
  prefs: Preferences;
  update: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
  applyAccent: (hex: string | null) => void;
}

const PreferencesContext = createContext<PrefsContextValue>({
  prefs: DEFAULTS,
  update: () => {},
  reset: () => {},
  applyAccent: () => {},
});

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [prefs, setPrefs] = useState<Preferences>(loadPrefs);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore quota */
    }

    const root = document.documentElement;

    if (prefs.accentOverride) {
      const main = prefs.accentOverride;
      const second = shiftHex(main, -0.15);
      const rgb = hexToRgb(main) ?? [99, 102, 241];
      root.style.setProperty('--accent', main);
      root.style.setProperty('--accent-2', second);
      root.style.setProperty('--accent-rgb', rgb.join(', '));
    }

    root.setAttribute('data-density', prefs.density);
    root.setAttribute('data-bubble', prefs.bubbleShape);
    root.setAttribute('data-font-scale', prefs.fontScale);
    root.setAttribute('data-font-family', prefs.fontFamily);
    root.setAttribute('data-reduce-motion', String(prefs.reduceMotion));
    root.setAttribute('data-glass', String(prefs.glassEffect));
    root.setAttribute('data-show-avatars', String(prefs.showAvatars));
    root.setAttribute(
      'data-msg-anim',
      String(prefs.messageAnimations && !prefs.reduceMotion),
    );

    root.style.setProperty('--app-font-family', FONT_STACKS[prefs.fontFamily]);
  }, [prefs]);

  const update = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
      setPrefs((p) => ({ ...p, [key]: value })),
    [],
  );

  const reset = useCallback(() => setPrefs(DEFAULTS), []);

  const applyAccent = useCallback(
    (hex: string | null) => {
      if (!hex) {
        const root = document.documentElement;
        root.style.removeProperty('--accent');
        root.style.removeProperty('--accent-2');
        root.style.removeProperty('--accent-rgb');
      }
      update('accentOverride', hex);
    },
    [update],
  );

  const value = useMemo(
    () => ({ prefs, update, reset, applyAccent }),
    [prefs, update, reset, applyAccent],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);

export const getWallpaperBackground = (
  wallpaper: ChatWallpaper,
): string | undefined => {
  switch (wallpaper.kind) {
    case 'gradient': {
      const w = WALLPAPER_GRADIENTS.find((g) => g.id === wallpaper.id);
      return w?.bg;
    }
    case 'pattern': {
      const p = PATTERN_OPTIONS.find((x) => x.id === wallpaper.id);
      return p?.css;
    }
    case 'solid':
      return wallpaper.color;
    case 'image':
      return `url(${wallpaper.url}) center/cover no-repeat fixed`;
    default:
      return undefined;
  }
};
