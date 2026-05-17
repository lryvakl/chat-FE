import clsx from 'clsx';
import { Check, Mic, Paperclip, Send, Smile, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmojiPicker } from './EmojiPicker';
import { mediaApi } from '../api/mediaApi';
import { encryptBlob } from '../crypto/mediaCrypto';
import type { MediaAttachment } from '../crypto/messageEnvelope';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import type { Message } from '../types/interfaces';

const MAX_LENGTH = 4000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const formatDuration = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface MessageInputProps {
  text: string;
  setText: (value: string) => void;
  editingMessage: Message | null;
  replyingTo?: Message | null;
  onSend: (text: string, media?: MediaAttachment) => void;
  onFinishEdit: () => void;
  onCancelEdit: () => void;
  onCancelReply?: () => void;
  onTyping: () => void;
  onStopTyping: () => void;
}

interface PendingAttachment {
  file: File;
  previewUrl?: string;
}

const readImageSize = (
  url: string,
): Promise<{ width: number; height: number } | undefined> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(undefined);
    img.src = url;
  });

export const MessageInput = ({
  text,
  setText,
  editingMessage,
  replyingTo,
  onSend,
  onFinishEdit,
  onCancelEdit,
  onCancelReply,
  onTyping,
  onStopTyping,
}: MessageInputProps) => {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const recorder = useVoiceRecorder();

  const handleEmojiPick = (ch: string) => {
    const el = textareaRef.current;
    if (!el) {
      setText(text + ch);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + ch + text.slice(end);
    setText(next);
    onTyping();
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + ch.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const isLimitReached = text.length >= MAX_LENGTH;
  const canSend = useMemo(
    () => (text.trim().length > 0 || attachment !== null) && !uploading,
    [text, attachment, uploading],
  );

  useEffect(() => {
    return () => {
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    };
  }, [attachment]);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      alert(`File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB).`);
      return;
    }
    const isImage = file.type.startsWith('image/');
    setAttachment({
      file,
      previewUrl: isImage ? URL.createObjectURL(file) : undefined,
    });
  };

  const clearAttachment = () => {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    if (editingMessage) {
      onFinishEdit();
      return;
    }

    let mediaMeta: MediaAttachment | undefined;
    if (attachment) {
      setUploading(true);
      try {
        const arrayBuf = await attachment.file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        const { ciphertext, keyB64, nonceB64 } = await encryptBlob(bytes);
        const upload = await mediaApi.upload(ciphertext);
        const size = upload.size;
        const dims = attachment.previewUrl
          ? await readImageSize(attachment.previewUrl)
          : undefined;
        mediaMeta = {
          id: upload.id,
          key: keyB64,
          nonce: nonceB64,
          mime: attachment.file.type || 'application/octet-stream',
          name: attachment.file.name,
          size,
          width: dims?.width,
          height: dims?.height,
        };
      } catch (err) {
        console.error('Upload failed:', err);
        alert('Upload failed — try again.');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    onSend(text, mediaMeta);
    clearAttachment();
  };

  const startRecording = async () => {
    if (uploading || recorder.isRecording) return;
    await recorder.start();
  };

  const cancelRecording = () => recorder.cancel();

  const stopAndSendRecording = async () => {
    const clip = await recorder.stop();
    if (!clip) return;
    setUploading(true);
    try {
      const arrayBuf = await clip.blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      const { ciphertext, keyB64, nonceB64 } = await encryptBlob(bytes);
      const upload = await mediaApi.upload(ciphertext);
      const mediaMeta: MediaAttachment = {
        id: upload.id,
        key: keyB64,
        nonce: nonceB64,
        mime: clip.mime,
        name: `voice-${Date.now()}.${clip.mime.includes('ogg') ? 'ogg' : 'webm'}`,
        size: upload.size,
        durationSec: clip.durationSec,
      };
      onSend('', mediaMeta);
    } catch (err) {
      console.error('Voice upload failed:', err);
      alert('Voice upload failed — try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
    >
      {editingMessage && (
        <div className="msg-edit-banner">
          <span className="msg-edit-label">
            {t('chat.editMessage') || 'Editing'}
          </span>
          <span className="msg-edit-preview">{editingMessage.text}</span>
          <button
            type="button"
            className="icon-btn danger"
            onClick={onCancelEdit}
            aria-label="Cancel edit"
            style={{ padding: '0.2rem' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {!editingMessage && replyingTo && (
        <div className="msg-edit-banner">
          <span className="msg-edit-label">
            Replying to {replyingTo.senderUsername ?? 'someone'}
          </span>
          <span className="msg-edit-preview">
            {replyingTo.text || '[media]'}
          </span>
          <button
            type="button"
            className="icon-btn danger"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            style={{ padding: '0.2rem' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {attachment && (
        <div className="msg-attachment-banner">
          {attachment.previewUrl ? (
            <img
              className="msg-attachment-thumb"
              src={attachment.previewUrl}
              alt={attachment.file.name}
            />
          ) : (
            <Paperclip size={18} />
          )}
          <span className="msg-attachment-name" title={attachment.file.name}>
            {attachment.file.name}
          </span>
          <span className="msg-attachment-size">
            {(attachment.file.size / 1024).toFixed(0)} KB
          </span>
          <button
            type="button"
            className="icon-btn danger"
            onClick={clearAttachment}
            aria-label="Remove attachment"
            style={{ padding: '0.2rem' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {recorder.isRecording ? (
        <div className="msg-record-bar">
          <button
            type="button"
            className="icon-btn danger"
            onClick={cancelRecording}
            aria-label="Cancel recording"
            title="Cancel"
          >
            <Trash2 size={18} />
          </button>
          <span className="msg-record-dot" />
          <span className="msg-record-label">
            Recording… {formatDuration(recorder.elapsedSec)}
          </span>
          <button
            type="button"
            className="send-btn"
            onClick={() => void stopAndSendRecording()}
            aria-label="Stop and send"
          >
            {uploading ? (
              <span className="msg-send-spinner" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      ) : (
        <div className="msg-input-wrap" style={{ position: 'relative' }}>
          <EmojiPicker
            open={emojiOpen}
            onClose={() => setEmojiOpen(false)}
            onPick={handleEmojiPick}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={handlePickFile}
            aria-label="Attach file"
            disabled={Boolean(editingMessage) || uploading}
            title="Attach a file"
          >
            <Paperclip size={18} />
          </button>
          <button
            type="button"
            className={clsx('icon-btn', emojiOpen && 'active')}
            onClick={() => setEmojiOpen((v) => !v)}
            aria-label="Emoji"
            disabled={Boolean(editingMessage) || uploading}
            title="Emoji"
          >
            <Smile size={18} />
          </button>
          <textarea
            ref={textareaRef}
            className={clsx('msg-input-field', isLimitReached && 'error')}
            placeholder={
              editingMessage
                ? t('chat.editMessage') || 'Edit message'
                : t('chat.typeMessage') || 'Type a message…'
            }
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.length > 0) onTyping();
              else onStopTyping();
            }}
            onBlur={onStopTyping}
            onKeyDown={handleKeyDown}
            maxLength={MAX_LENGTH}
            autoComplete="off"
            rows={1}
          />
          {!editingMessage && text.trim().length === 0 && !attachment ? (
            <button
              type="button"
              className="icon-btn"
              onClick={() => void startRecording()}
              aria-label="Record voice"
              disabled={uploading}
              title="Record voice message"
            >
              <Mic size={18} />
            </button>
          ) : null}
          <button
            type="submit"
            className="send-btn"
            disabled={!canSend}
            aria-label="Send"
          >
            {uploading ? (
              <span className="msg-send-spinner" />
            ) : editingMessage ? (
              <Check size={18} />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      )}

      {text.length > 0 && (
        <p
          style={{
            textAlign: 'right',
            fontSize: '0.7rem',
            marginTop: '0.3rem',
            color: isLimitReached ? '#ef4444' : 'var(--text-muted)',
          }}
        >
          {text.length}/{MAX_LENGTH}
        </p>
      )}
    </form>
  );
};

export default MessageInput;
