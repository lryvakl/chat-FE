import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { usePreferences } from '../preferences/PreferencesContext';
import type { RootState } from '../store';

const FALLBACK_ACCENT = '#6366f1';
const FALLBACK_ACCENT_2 = '#8b5cf6';

const hexToRgb = (hex: string): [number, number, number] | null => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
};

const shiftHue = (hex: string, deltaPct: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map((c) =>
    Math.min(255, Math.max(0, Math.round(c + (255 - c) * deltaPct))),
  );
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

export const useAccentColor = () => {
  const userAccent = useSelector(
    (s: RootState) => s.auth.user?.accentColor ?? null,
  );
  const { prefs } = usePreferences();
  const accent = prefs.accentOverride ?? userAccent;

  useEffect(() => {
    const root = document.documentElement;
    const main = accent || FALLBACK_ACCENT;
    const second = accent ? shiftHue(accent, -0.15) : FALLBACK_ACCENT_2;
    const rgb = hexToRgb(main) ?? [99, 102, 241];

    root.style.setProperty('--accent', main);
    root.style.setProperty('--accent-2', second);
    root.style.setProperty('--accent-rgb', rgb.join(', '));
  }, [accent]);
};
