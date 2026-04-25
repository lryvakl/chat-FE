import clsx from "clsx";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { stringToColor, stringToGradient } from "../theme";
import type { MessageListProps } from "../types/interfaces";
import {
  formatTime,
  isSameDay,
  formatDateSeparator,
} from "../utils/dateFormatters";

export const MessageList = ({
  messages,
  currentUser,
  onDeleteMessage,
  onEditMessage,
}: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Автоматичний скрол при додаванні нових повідомлень
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.125rem",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      {messages.map((msg, index) => {
        const isMe = msg.user === currentUser;
        const prev = messages[index - 1];

        const showDate =
          !prev ||
          !msg.createdAt ||
          !prev.createdAt ||
          !isSameDay(msg.createdAt, prev.createdAt);

        const showAvatar =
          !isMe && (!prev || prev.user !== msg.user || showDate);

        return (
          <div
            key={msg.id ?? index}
            className="message-enter-anim" // Клас для нативної CSS-анімації
          >
            {showDate && msg.createdAt && (
              <div className="date-divider">
                <span className="date-chip">
                  {formatDateSeparator(msg.createdAt, t, i18n.language)}
                </span>
              </div>
            )}

            <div className={clsx("msg-row", isMe ? "me" : "them")}>
              {/* Other user avatar */}
              {!isMe && (
                <div style={{ width: 34, flexShrink: 0 }}>
                  {showAvatar && (
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: stringToGradient(msg.user),
                        boxShadow: `0 4px 12px ${stringToColor(msg.user)}55`,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {msg.user.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons (mine) */}
              {isMe && msg.id && (
                <div className="msg-actions">
                  <button
                    className="icon-btn"
                    onClick={() => onEditMessage(msg)}
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() => onDeleteMessage(msg.id!)}
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {/* Bubble */}
              <div className={clsx("msg-bubble", isMe ? "me" : "them")}>
                {!isMe && showAvatar && (
                  <p
                    style={{
                      fontSize: "0.73rem",
                      fontWeight: 700,
                      marginBottom: "0.25rem",
                      color: stringToColor(msg.user),
                    }}
                  >
                    {msg.user}
                  </p>
                )}

                <p
                  style={{
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.text}
                </p>

                {msg.createdAt && (
                  <p
                    style={{
                      fontSize: "0.68rem",
                      textAlign: "right",
                      marginTop: "0.3rem",
                      opacity: isMe ? 0.85 : 0.6,
                      userSelect: "none",
                    }}
                  >
                    {formatTime(msg.createdAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
