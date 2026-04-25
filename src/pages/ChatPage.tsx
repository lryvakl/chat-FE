import { Hash, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { ChatSidebar } from "../components/ChatSidebar";
import MessageInput from "../components/MessageInput";
import MessageList from "../components/MessageList";
import { AuroraBackground } from "../components/utils/AuroraBackground";
import { Loader } from "../components/utils/Loader";
import { useChat } from "../hooks/useChat";
import type { AppDispatch, RootState } from "../store";
import { logout } from "../store/authSlice";
import { setRoom } from "../store/chatSlice";
import { fetchMessages } from "../store/thunks/fetchMessages";
import { stringToGradient } from "../theme";
import { PATHS, Room } from "../types/enums";
import type { Message } from "../types/interfaces";

const SIDEBAR_W = 300;

const ChatPage = () => {
  const { sendMessage, deleteMessage, editMessage, currentUser } = useChat();
  const [inputText, setInputText] = useState("");
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { room } = useParams();
  const { t } = useTranslation();
  const rooms = Object.values(Room);

  const { messages, isLoading, error } = useSelector(
    (state: RootState) => state.chat
  );

  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) navigate(PATHS.LOGIN);
  }, [currentUser, navigate]);

  useEffect(() => {
    if (room) {
      dispatch(setRoom(room));
      dispatch(fetchMessages(room));
    }
  }, [room, dispatch]);

  const handleStartEdit = (message: Message) => {
    setEditingMessage(message);
    setInputText(message.text);
  };

  const handleFinishEdit = () => {
    if (inputText.trim() && editingMessage?.id) {
      editMessage(editingMessage.id, inputText);
    }
    setEditingMessage(null);
    setInputText("");
  };

  const handleSend = (text: string) => {
    sendMessage(text);
    setInputText("");
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText("");
  };

  const handleLeave = () => {
    dispatch(logout());
    navigate(PATHS.LOGIN);
  };

  if (!currentUser) return null;

  const sidebar = (
    <ChatSidebar
      rooms={rooms}
      currentRoom={room}
      currentUser={currentUser}
      onLogout={handleLeave}
      onRoomSelect={() => setDrawerOpen(false)}
    />
  );

  return (
    <div style={{ display: "flex", height: "100vh", position: "relative" }}>
      <AuroraBackground />

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="drawer-overlay"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="drawer-panel">{sidebar}</div>
        </>
      )}

      {/* Desktop sidebar */}
      <div
        style={{
          display: "none",
          width: SIDEBAR_W,
          flexShrink: 0,
        }}
        ref={(el) => {
          if (!el) return;
          const mq = window.matchMedia("(min-width: 768px)");
          const update = (matches: boolean) => {
            el.style.display = matches ? "block" : "none";
          };
          update(mq.matches);
          mq.addEventListener("change", (e) => update(e.matches));
        }}
      >
        {sidebar}
      </div>

      {/* Main area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          background: "rgba(255,255,255,0.35)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          overflow: "hidden",
        }}
        // dark mode bg
        ref={(el) => {
          if (!el) return;
          const update = () => {
            const dark =
              document.documentElement.getAttribute("data-theme") === "dark";
            el.style.background = dark
              ? "rgba(11,16,32,0.4)"
              : "rgba(255,255,255,0.35)";
          };
          update();
          const observer = new MutationObserver(update);
          observer.observe(document.documentElement, { attributes: true });
        }}
      >
        {/* AppBar */}
        <div
          className="appbar"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0 1.25rem",
            height: 64,
            flexShrink: 0,
          }}
        >
          <button
            className="icon-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ display: "block" }}
            ref={(el) => {
              if (!el) return;
              const mq = window.matchMedia("(min-width: 768px)");
              const update = (matches: boolean) => {
                el.style.display = matches ? "none" : "flex";
              };
              update(mq.matches);
              mq.addEventListener("change", (e) => update(e.matches));
            }}
          >
            <Menu size={20} />
          </button>

          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: stringToGradient(room || "General"),
              flexShrink: 0,
              color: "#fff",
            }}
          >
            <Hash size={18} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontWeight: 700,
                fontSize: "1.05rem",
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {room}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {t("chat.currentUser")}: {currentUser}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem 1.25rem",
          }}
        >
          {isLoading ? (
            <Loader fullScreen={false} message={t("chat.loading")} />
          ) : error ? (
            <div className="alert-error" style={{ margin: "1rem 0" }}>
              {error}
            </div>
          ) : (
            <MessageList
              messages={messages}
              currentUser={currentUser}
              onDeleteMessage={deleteMessage}
              onEditMessage={handleStartEdit}
            />
          )}
        </div>

        {/* Input */}
        <div
          style={{
            padding: "0.9rem 1.25rem",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-sidebar)",
            backdropFilter: "blur(16px)",
          }}
        >
          <MessageInput
            text={inputText}
            setText={setInputText}
            onSendMessage={handleSend}
            editingMessage={editingMessage}
            onEditMessage={handleFinishEdit}
            onCancelEdit={handleCancelEdit}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
