import { Hash, LogOut } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { getChatSteps } from "../constants/steps";
import { stringToColor, stringToGradient } from "../theme";
import { PATHS } from "../types/enums";
import type { ChatSidebarProps } from "../types/interfaces";
import { LanguageSwitcher } from "./utils/LanguageSwitcher";
import { ThemeToggle } from "./utils/ThemeToggle";
import { TourButton } from "./utils/TourButton";

export const ChatSidebar = ({
  rooms,
  currentRoom,
  currentUser,
  onLogout,
  onRoomSelect,
}: ChatSidebarProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const chatSteps = useMemo(() => getChatSteps(t), [t]);

  const handleRoomClick = (roomName: string) => {
    navigate(`${PATHS.CHAT}/${roomName}`);
    onRoomSelect?.();
  };

  return (
    <div className="sidebar">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.1rem 1.25rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            className="logo-mark"
            style={{ width: 36, height: 36, borderRadius: "0.6rem", flexShrink: 0 }}
          >
            <span style={{ fontWeight: 800, fontSize: 16 }}>C</span>
          </div>
          <span
            className="gradient-text"
            style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em" }}
          >
            {t("header.title")}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.1rem" }}>
          <ThemeToggle />
          <TourButton steps={chatSteps} />
          <LanguageSwitcher />
        </div>
      </div>

      {/* Room label */}
      <div style={{ padding: "0.9rem 1.25rem 0.3rem" }}>
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {t("chat.room") || "Rooms"}
        </span>
      </div>

      {/* Room list */}
      <nav id="room-list" style={{ flex: 1, overflowY: "auto" }}>
        {rooms.map((name) => {
          const active = currentRoom === name;
          return (
            <button
              key={name}
              className={`room-btn${active ? " active" : ""}`}
              onClick={() => handleRoomClick(name)}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  background: stringToGradient(name),
                  boxShadow: active ? `0 4px 14px ${stringToColor(name)}55` : "none",
                  transition: "box-shadow 0.25s",
                  color: "#fff",
                }}
              >
                <Hash size={15} />
              </span>
              {name}
            </button>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div
        style={{
          padding: "0.9rem 1.1rem",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "0.85rem",
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: stringToGradient(currentUser),
              boxShadow: `0 4px 14px ${stringToColor(currentUser)}55`,
              color: "#fff",
              fontWeight: 700,
              fontSize: "1rem",
            }}
          >
            {currentUser.charAt(0).toUpperCase()}
          </div>
          <span
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#22c55e",
              border: "2px solid var(--bg-sidebar)",
              animation: "pulse-dot 2.4s ease-in-out infinite",
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {currentUser}
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>online</p>
        </div>

        <button
          className="icon-btn danger"
          onClick={onLogout}
          aria-label={t("header.logout")}
          title={t("header.logout")}
        >
          <LogOut size={17} />
        </button>
      </div>
    </div>
  );
};
