import { useCallback, useEffect, useRef, useState } from 'react';

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

const pickMimeType = (): string => {
  for (const mt of PREFERRED_MIME_TYPES) {
    if (
      typeof MediaRecorder !== 'undefined' &&
      MediaRecorder.isTypeSupported(mt)
    ) {
      return mt;
    }
  }
  return '';
};

export interface RecordedClip {
  blob: Blob;
  mime: string;
  durationSec: number;
}

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const pendingRef = useRef<((clip: RecordedClip | null) => void) | null>(null);
  const cleanedRef = useRef(false);

  useEffect(() => {
    return () => {
      cleanedRef.current = true;
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
      }
    };
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (isRecording) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const actualMime = recorder.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: actualMime });
        const durationSec = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );
        const resolver = pendingRef.current;
        pendingRef.current = null;
        if (resolver) {
          resolver({ blob, mime: actualMime, durationSec });
        }
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedSec(0);
      tickRef.current = window.setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 500);
      recorder.start();
      setIsRecording(true);
      return true;
    } catch (err) {
      console.error('Microphone access failed:', err);
      return false;
    }
  }, [isRecording]);

  const stop = useCallback((): Promise<RecordedClip | null> => {
    if (!recorderRef.current) return Promise.resolve(null);
    return new Promise((resolve) => {
      pendingRef.current = resolve;
      try {
        recorderRef.current!.stop();
      } catch (err) {
        console.error('Recorder stop failed:', err);
        resolve(null);
      }
      setIsRecording(false);
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
        streamRef.current = null;
      }
      recorderRef.current = null;
    });
  }, []);

  const cancel = useCallback(() => {
    pendingRef.current = null;
    if (recorderRef.current) {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setElapsedSec(0);
  }, []);

  return { isRecording, elapsedSec, start, stop, cancel };
};
