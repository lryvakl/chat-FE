import {
  Check,
  Image as ImageIcon,
  Moon,
  Palette,
  RotateCcw,
  Sliders,
  Sparkles,
  Sun,
  Type,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import {
  ACCENT_PALETTE,
  PATTERN_OPTIONS,
  WALLPAPER_GRADIENTS,
  usePreferences,
} from '../preferences/PreferencesContext';
import type {
  BubbleShape,
  Density,
  FontFamily,
  FontScale,
} from '../preferences/PreferencesContext';
import { useColorMode } from '../theme/ThemeContext';

interface Props {
  onClose: () => void;
}

type Tab = 'theme' | 'chat' | 'behavior';

const DENSITIES: {
  id: Density;
  labelKey: string;
  subKey: string;
}[] = [
  {
    id: 'compact',
    labelKey: 'appearance.densityCompact',
    subKey: 'appearance.densityCompactSub',
  },
  {
    id: 'cozy',
    labelKey: 'appearance.densityCozy',
    subKey: 'appearance.densityCozySub',
  },
  {
    id: 'comfortable',
    labelKey: 'appearance.densityComfortable',
    subKey: 'appearance.densityComfortableSub',
  },
];

const SHAPES: { id: BubbleShape; labelKey: string; preview: string }[] = [
  { id: 'sharp', labelKey: 'appearance.shapeSharp', preview: '8px' },
  { id: 'rounded', labelKey: 'appearance.shapeRounded', preview: '20px' },
  { id: 'pill', labelKey: 'appearance.shapePill', preview: '30px' },
];

const FONT_SCALES: { id: FontScale; label: string; px: string }[] = [
  { id: 'sm', label: 'S', px: '13px' },
  { id: 'md', label: 'M', px: '15px' },
  { id: 'lg', label: 'L', px: '17px' },
  { id: 'xl', label: 'XL', px: '19px' },
];

const FONT_FAMILIES: { id: FontFamily; labelKey: string; sample: string }[] = [
  { id: 'inter', labelKey: 'appearance.fontInter', sample: 'Aa' },
  { id: 'system', labelKey: 'appearance.fontSystem', sample: 'Aa' },
  { id: 'rounded', labelKey: 'appearance.fontRounded', sample: 'Aa' },
  { id: 'serif', labelKey: 'appearance.fontSerif', sample: 'Aa' },
  { id: 'mono', labelKey: 'appearance.fontMono', sample: 'Aa' },
];

const LANGUAGES = [
  { code: 'uk', flag: '🇺🇦', label: 'UA' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'pl', flag: '🇵🇱', label: 'PL' },
  { code: 'ja', flag: '🇯🇵', label: 'JP' },
] as const;

export const AppearanceModal = ({ onClose }: Props) => {
  const { prefs, update, reset, applyAccent } = usePreferences();
  const { mode, toggle } = useColorMode();
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>('theme');

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card appearance-card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h3>
            <Sliders size={16} style={{ marginRight: 6, opacity: 0.7 }} />
            {t('appearance.title')}
          </h3>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </header>

        <div className="appearance-tabs">
          <button
            className={`appearance-tab ${tab === 'theme' ? 'active' : ''}`}
            onClick={() => setTab('theme')}
          >
            <Palette size={14} /> {t('appearance.tabTheme')}
          </button>
          <button
            className={`appearance-tab ${tab === 'chat' ? 'active' : ''}`}
            onClick={() => setTab('chat')}
          >
            <Sparkles size={14} /> {t('appearance.tabChat')}
          </button>
          <button
            className={`appearance-tab ${tab === 'behavior' ? 'active' : ''}`}
            onClick={() => setTab('behavior')}
          >
            <Zap size={14} /> {t('appearance.tabBehavior')}
          </button>
        </div>

        <div className="modal-scroll appearance-scroll">
          {tab === 'theme' && (
            <>
              <div className="settings-section-title">
                {t('appearance.mode')}
              </div>
              <div className="appearance-mode-row">
                <button
                  className={`appearance-mode ${mode === 'light' ? 'active' : ''}`}
                  onClick={() => mode !== 'light' && toggle()}
                >
                  <Sun size={16} /> {t('appearance.light')}
                </button>
                <button
                  className={`appearance-mode ${mode === 'dark' ? 'active' : ''}`}
                  onClick={() => mode !== 'dark' && toggle()}
                >
                  <Moon size={16} /> {t('appearance.dark')}
                </button>
              </div>

              <div className="settings-section-title">
                {t('appearance.accent')}
              </div>
              <div className="accent-row">
                {ACCENT_PALETTE.map((a) => (
                  <button
                    key={a.id}
                    className={`accent-dot ${prefs.accentOverride === a.color ? 'active' : ''}`}
                    style={{ background: a.color }}
                    onClick={() => applyAccent(a.color)}
                    title={a.label}
                    aria-label={a.label}
                  />
                ))}
                <label
                  className="accent-custom"
                  title={t('appearance.customColor')}
                >
                  <input
                    type="color"
                    value={prefs.accentOverride ?? '#6366f1'}
                    onChange={(e) => applyAccent(e.target.value)}
                  />
                  <span
                    style={{ background: prefs.accentOverride ?? '#6366f1' }}
                  />
                </label>
                {prefs.accentOverride && (
                  <button
                    className="ghost-btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      borderRadius: 999,
                    }}
                    onClick={() => applyAccent(null)}
                  >
                    {t('common.reset')}
                  </button>
                )}
              </div>

              <div className="settings-section-title">
                <Type size={12} style={{ marginRight: 4 }} />{' '}
                {t('appearance.typography')}
              </div>
              <div className="font-row">
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.id}
                    className={`font-card ${prefs.fontFamily === f.id ? 'active' : ''}`}
                    style={{
                      fontFamily:
                        f.id === 'inter'
                          ? 'Inter, sans-serif'
                          : f.id === 'system'
                            ? '-apple-system, system-ui, sans-serif'
                            : f.id === 'serif'
                              ? 'Georgia, serif'
                              : f.id === 'mono'
                                ? 'Menlo, monospace'
                                : 'SF Pro Rounded, Nunito, sans-serif',
                    }}
                    onClick={() => update('fontFamily', f.id)}
                  >
                    <span className="font-card-sample">{f.sample}</span>
                    <span className="font-card-label">{t(f.labelKey)}</span>
                  </button>
                ))}
              </div>

              <div className="settings-section-title">
                {t('appearance.textSize')}
              </div>
              <div className="seg-row">
                {FONT_SCALES.map((s) => (
                  <button
                    key={s.id}
                    className={`seg-btn ${prefs.fontScale === s.id ? 'active' : ''}`}
                    onClick={() => update('fontScale', s.id)}
                    style={{ fontSize: s.px }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="settings-section-title">
                {t('appearance.language')}
              </div>
              <div className="appearance-mode-row">
                {LANGUAGES.map(({ code, flag, label }) => (
                  <button
                    key={code}
                    className={`appearance-mode ${i18n.language === code ? 'active' : ''}`}
                    onClick={() => i18n.changeLanguage(code)}
                    aria-label={label}
                  >
                    <span style={{ fontSize: 16 }}>{flag}</span> {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'chat' && (
            <>
              <div className="settings-section-title">
                {t('appearance.bubbleShape')}
              </div>
              <div className="shape-row">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    className={`shape-card ${prefs.bubbleShape === s.id ? 'active' : ''}`}
                    onClick={() => update('bubbleShape', s.id)}
                  >
                    <div
                      className="shape-preview"
                      style={{ borderRadius: s.preview }}
                    />
                    <span>{t(s.labelKey)}</span>
                  </button>
                ))}
              </div>

              <div className="settings-section-title">
                {t('appearance.density')}
              </div>
              <div className="density-row">
                {DENSITIES.map((d) => (
                  <button
                    key={d.id}
                    className={`density-card ${prefs.density === d.id ? 'active' : ''}`}
                    onClick={() => update('density', d.id)}
                  >
                    <span className="density-label">{t(d.labelKey)}</span>
                    <span className="density-sub">{t(d.subKey)}</span>
                  </button>
                ))}
              </div>

              <div className="settings-section-title">
                <ImageIcon size={12} style={{ marginRight: 4 }} />{' '}
                {t('appearance.wallpaper')}
              </div>
              <div className="wallpaper-grid">
                <button
                  className={`wallpaper-cell ${prefs.wallpaper.kind === 'none' ? 'active' : ''}`}
                  onClick={() => update('wallpaper', { kind: 'none' })}
                  style={{ background: 'var(--bg)' }}
                >
                  <span className="wallpaper-label">
                    {t('appearance.wallpaperNone')}
                  </span>
                </button>
                {WALLPAPER_GRADIENTS.map((w) => (
                  <button
                    key={w.id}
                    className={`wallpaper-cell ${prefs.wallpaper.kind === 'gradient' && prefs.wallpaper.id === w.id ? 'active' : ''}`}
                    onClick={() =>
                      update('wallpaper', { kind: 'gradient', id: w.id })
                    }
                    style={{ background: w.bg }}
                  >
                    <span className="wallpaper-label">{w.label}</span>
                  </button>
                ))}
                {PATTERN_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    className={`wallpaper-cell ${prefs.wallpaper.kind === 'pattern' && prefs.wallpaper.id === p.id ? 'active' : ''}`}
                    onClick={() =>
                      update('wallpaper', { kind: 'pattern', id: p.id })
                    }
                    style={{ background: p.css, backgroundColor: 'var(--bg)' }}
                  >
                    <span className="wallpaper-label">{p.label}</span>
                  </button>
                ))}
              </div>
              <input
                className="modal-input"
                placeholder={t('appearance.wallpaperUrlPlaceholder')}
                value={
                  prefs.wallpaper.kind === 'image' ? prefs.wallpaper.url : ''
                }
                onChange={(e) =>
                  update(
                    'wallpaper',
                    e.target.value
                      ? { kind: 'image', url: e.target.value }
                      : { kind: 'none' },
                  )
                }
                style={{ marginTop: 8 }}
              />

              <ToggleRow
                label={t('appearance.showAvatars')}
                checked={prefs.showAvatars}
                onChange={(v) => update('showAvatars', v)}
              />
              <ToggleRow
                label={t('appearance.glassEffect')}
                checked={prefs.glassEffect}
                onChange={(v) => update('glassEffect', v)}
              />
            </>
          )}

          {tab === 'behavior' && (
            <>
              <ToggleRow
                label={t('appearance.animateMessages')}
                checked={prefs.messageAnimations}
                onChange={(v) => update('messageAnimations', v)}
              />
              <ToggleRow
                label={t('appearance.reduceMotion')}
                checked={prefs.reduceMotion}
                onChange={(v) => update('reduceMotion', v)}
              />
              <ToggleRow
                label={t('appearance.sendOnEnter')}
                checked={prefs.sendOnEnter}
                onChange={(v) => update('sendOnEnter', v)}
              />

              <button
                className="ghost-btn"
                style={{ margin: '20px 16px 0', width: 'calc(100% - 32px)' }}
                onClick={reset}
              >
                <RotateCcw size={14} style={{ marginRight: 6 }} />{' '}
                {t('appearance.resetAll')}
              </button>
            </>
          )}
        </div>

        <footer className="modal-footer modal-footer-row">
          <button className="primary-btn" onClick={onClose}>
            <Check size={16} /> {t('common.done')}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

const ToggleRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="settings-block" style={{ paddingTop: 6 }}>
    <button
      type="button"
      className={`settings-row ${checked ? 'active' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-row-label">{label}</span>
      <span
        className={`settings-toggle ${checked ? 'on' : ''}`}
        aria-hidden="true"
      />
    </button>
  </div>
);
