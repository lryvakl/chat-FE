import clsx from "clsx";
import { Check, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import type { MessageInputProps } from "../types/interfaces";

const MAX_LENGTH = 800;

export const MessageInput = ({
  onSendMessage,
  editingMessage,
  onEditMessage,
  onCancelEdit,
  text,
  setText,
}: MessageInputProps) => {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLimitReached = text.length >= MAX_LENGTH;
  const canSend = useMemo(() => text.trim().length > 0, [text]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    editingMessage ? onEditMessage() : onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* Auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  return (
    <form onSubmit={handleSend}>
      {editingMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.5rem",
            padding: "0.35rem 0.75rem",
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "0.75rem",
          }}
        >
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#6366f1",
            }}
          >
            {t("chat.editMessage") || "Editing"}
          </span>
          <span
            style={{
              flex: 1,
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {editingMessage.text}
          </span>
          <button
            type="button"
            className="icon-btn danger"
            onClick={onCancelEdit}
            aria-label="Cancel edit"
            style={{ padding: "0.2rem" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="msg-input-wrap">
        <textarea
          id="message-input"
          ref={textareaRef}
          className={clsx("msg-input-field", isLimitReached && "error")}
          placeholder={
            editingMessage ? t("chat.editMessage") : t("chat.typeMessage")
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_LENGTH}
          autoComplete="off"
          rows={1}
        />

        <button
          id="message-send"
          type="submit"
          className="send-btn"
          disabled={!canSend}
          aria-label="Send message"
        >
          {editingMessage ? <Check size={18} /> : <Send size={18} />}
        </button>
      </div>

      {text.length > 0 && (
        <p
          style={{
            textAlign: "right",
            fontSize: "0.7rem",
            marginTop: "0.3rem",
            color: isLimitReached ? "#ef4444" : "var(--text-muted)",
          }}
        >
          {text.length}/{MAX_LENGTH}
        </p>
      )}
    </form>
  );
};

export default MessageInput;
