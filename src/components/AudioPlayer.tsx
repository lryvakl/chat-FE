import clsx from 'clsx';
import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AudioPlayerProps {
  src: string;
  durationHint?: number;
}

const fmt = (s: number): string => {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
};

const BAR_COUNT = 42;

const seededBars = (seed: string): number[] => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const out: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const norm = (h % 1000) / 1000;
    const d = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
    const envelope = 1 - 0.35 * d;
    out.push(Math.max(0.2, Math.min(1, (0.28 + norm * 0.72) * envelope)));
  }
  return out;
};

export const AudioPlayer = ({ src, durationHint }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(durationHint ?? 0);
  const [current, setCurrent] = useState(0);
  const bars = useRef(seededBars(src)).current;

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio(src);
    const audio = audioRef.current;
    audio.src = src;
    audio.preload = 'metadata';

    const onLoaded = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onTime = () => {
      setCurrent(audio.currentTime);
      const d = isFinite(audio.duration) ? audio.duration : duration;
      setProgress(d > 0 ? audio.currentTime / d : 0);
    };
    const onEnd = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrent(0);
      audio.currentTime = 0;
    };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.pause();
    };
  }, [src, duration]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (e.clientX - rect.left) / rect.width),
    );
    audio.currentTime = ratio * duration;
    setProgress(ratio);
    setCurrent(audio.currentTime);
  };

  const displayDuration = duration > 0 ? duration : (durationHint ?? 0);

  return (
    <div className="audio-player">
      <button
        type="button"
        onClick={toggle}
        className="audio-player-btn"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="audio-player-body">
        <div
          className="audio-player-wave"
          onClick={onSeek}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          {bars.map((h, i) => {
            const filled = i / BAR_COUNT < progress;
            return (
              <span
                key={i}
                className={clsx('audio-player-bar', filled && 'filled')}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            );
          })}
        </div>
        <div className="audio-player-time">
          <span>{fmt(current)}</span>
          <span>{fmt(displayDuration)}</span>
        </div>
      </div>
    </div>
  );
};
