import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';

import { EMOJI_CATEGORIES } from '../emoji/catalog';

interface EmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (ch: string) => void;
}

export const EmojiPicker = ({ open, onClose, onPick }: EmojiPickerProps) => {
  const [activeId, setActiveId] = useState(EMOJI_CATEGORIES[0].id);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) onClose();
    };
    const timer = window.setTimeout(() => {
      window.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('mousedown', handler);
    };
  }, [open, onClose]);

  const activeCategory =
    EMOJI_CATEGORIES.find((c) => c.id === activeId) ?? EMOJI_CATEGORIES[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeCategory.emojis;
    return activeCategory.emojis.filter((e) =>
      e.label.toLowerCase().includes(q),
    );
  }, [query, activeCategory]);

  if (!open) return null;

  return (
    <div className="emoji-picker" ref={rootRef}>
      <input
        className="emoji-search"
        placeholder="Search emoji…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="emoji-grid">
        {filtered.length === 0 ? (
          <p className="emoji-empty">No matches</p>
        ) : (
          filtered.map((e) => (
            <button
              key={e.ch}
              type="button"
              className="emoji-cell"
              title={e.label}
              onClick={() => onPick(e.ch)}
            >
              <img src={e.url} alt={e.label} className="emoji-img" />
            </button>
          ))
        )}
      </div>
      <div className="emoji-tabs">
        {EMOJI_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={clsx('emoji-tab', c.id === activeId && 'active')}
            title={c.name}
            onClick={() => {
              setActiveId(c.id);
              setQuery('');
            }}
          >
            <span className="emoji-tab-glyph">{c.icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
