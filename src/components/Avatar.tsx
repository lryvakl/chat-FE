import { Users } from 'lucide-react';

import { stringToColor, stringToGradient } from '../theme';
import { initialsFor } from '../utils/conversationDisplay';

interface AvatarProps {
  seed: string;
  size?: number;
  isGroup?: boolean;
  showPresence?: boolean;
  isOnline?: boolean;
  avatarUrl?: string | null;
  accentColor?: string | null;
}

const accentGradient = (hex: string) =>
  `linear-gradient(135deg, ${hex} 0%, ${hex}b3 100%)`;

export const Avatar = ({
  seed,
  size = 40,
  isGroup = false,
  showPresence = false,
  isOnline = false,
  avatarUrl = null,
  accentColor = null,
}: AvatarProps) => {
  const dotSize = Math.max(10, Math.round(size * 0.28));
  const tint = accentColor || stringToColor(seed);
  const bg = accentColor ? accentGradient(accentColor) : stringToGradient(seed);
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'block',
            boxShadow: `0 4px 14px ${tint}44`,
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: bg,
            boxShadow: `0 4px 14px ${tint}44`,
            color: '#fff',
            fontWeight: 700,
            fontSize: Math.round(size * 0.42),
            letterSpacing: '-0.02em',
          }}
        >
          {isGroup ? (
            <Users size={Math.round(size * 0.45)} />
          ) : (
            initialsFor(seed)
          )}
        </div>
      )}
      {showPresence && (
        <span
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: isOnline ? '#10b981' : '#94a3b8',
            border: '2px solid var(--bg-paper, #fff)',
            boxShadow: isOnline ? '0 0 0 2px rgba(16,185,129,0.25)' : 'none',
          }}
        />
      )}
    </div>
  );
};
