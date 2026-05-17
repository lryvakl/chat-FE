export interface MediaAttachment {
  id: number;
  key: string;
  nonce: string;
  mime: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
  durationSec?: number;
}

export interface MessageEnvelope {
  v: 1;
  text: string;
  media?: MediaAttachment;
}

export const encodeEnvelope = (envelope: MessageEnvelope): string =>
  JSON.stringify(envelope);

export const parseEnvelope = (raw: string): MessageEnvelope => {
  if (!raw) return { v: 1, text: '' };
  if (raw[0] === '{') {
    try {
      const parsed = JSON.parse(raw) as Partial<MessageEnvelope>;
      if (typeof parsed === 'object' && parsed && parsed.v === 1) {
        return {
          v: 1,
          text: typeof parsed.text === 'string' ? parsed.text : '',
          media: parsed.media,
        };
      }
    } catch {
      /* fall through */
    }
  }
  return { v: 1, text: raw };
};
