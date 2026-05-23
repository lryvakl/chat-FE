import { Download, FileIcon, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AudioPlayer } from './AudioPlayer';
import { mediaApi } from '../api/mediaApi';
import { decryptBlob } from '../crypto/mediaCrypto';
import type { MessageMedia } from '../types/interfaces';

interface MediaBubbleProps {
  media: MessageMedia;
}

const blobCache = new Map<number, string>();

export const MediaBubble = ({ media }: MediaBubbleProps) => {
  const { t } = useTranslation();
  const [objectUrl, setObjectUrl] = useState<string | null>(
    () => blobCache.get(media.id) ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const aborted = useRef(false);

  useEffect(() => {
    if (blobCache.has(media.id)) {
      setObjectUrl(blobCache.get(media.id)!);
      return;
    }
    aborted.current = false;
    (async () => {
      try {
        const ciphertext = await mediaApi.download(media.id);
        const plaintext = await decryptBlob(ciphertext, media.key, media.nonce);
        const blob = new Blob([new Uint8Array(plaintext)], {
          type: media.mime,
        });
        const url = URL.createObjectURL(blob);
        if (aborted.current) {
          URL.revokeObjectURL(url);
          return;
        }
        blobCache.set(media.id, url);
        setObjectUrl(url);
      } catch (err) {
        console.error('Media decrypt failed:', err);
        if (!aborted.current) setError(t('media.decryptFailed'));
      }
    })();
    return () => {
      aborted.current = true;
    };
  }, [media.id, media.key, media.nonce, media.mime, t]);

  const isImage = media.mime.startsWith('image/');
  const isAudio = media.mime.startsWith('audio/');

  if (error) {
    return (
      <div className="msg-media-error">
        <FileIcon size={16} /> {error}
      </div>
    );
  }
  if (!objectUrl) {
    return (
      <div className="msg-media-loading">
        <Loader2 className="spin" size={16} /> {t('media.decrypting')}
      </div>
    );
  }

  if (isImage) {
    return (
      <a
        href={objectUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="msg-media-image-link"
      >
        <img
          src={objectUrl}
          alt={media.name}
          className="msg-media-image"
          loading="lazy"
        />
      </a>
    );
  }

  if (isAudio) {
    return <AudioPlayer src={objectUrl} durationHint={media.durationSec} />;
  }

  return (
    <a
      className="msg-media-file"
      href={objectUrl}
      download={media.name}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Download size={16} />
      <span className="msg-media-file-name">{media.name}</span>
      <span className="msg-media-file-size">
        {Math.round(media.size / 1024)} KB
      </span>
    </a>
  );
};
