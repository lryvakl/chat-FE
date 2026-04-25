import { Bolt, Globe, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

const Feature = ({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) => (
  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
    <div className="showcase-feature-icon">{icon}</div>
    <div>
      <p style={{ color: "#fff", fontWeight: 700, marginBottom: "0.2rem" }}>
        {title}
      </p>
      <p
        style={{
          color: "rgba(255,255,255,0.78)",
          fontSize: "0.88rem",
          lineHeight: 1.5,
        }}
      >
        {desc}
      </p>
    </div>
  </div>
);

export const AuthShowcase = () => {
  const { t } = useTranslation();

  return (
    <div className="showcase-panel">
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          className="logo-mark"
          style={{
            width: 64,
            height: 64,
            marginBottom: "1.5rem",
            borderRadius: "1rem",
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 800 }}>C</span>
        </div>
        <h1
          style={{
            color: "#fff",
            fontSize: "2rem",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            maxWidth: 360,
            marginBottom: "0.75rem",
          }}
        >
          {t("header.title")}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.85)", maxWidth: 360 }}>
          Real-time messaging that's fast, private, and beautifully crafted.
        </p>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <Feature
          icon={<Bolt size={20} />}
          title="Real-time"
          desc="Instant delivery powered by WebSockets — no refresh required."
        />
        <Feature
          icon={<Lock size={20} />}
          title="Secure by default"
          desc="JWT auth, encrypted transport, message-author verification."
        />
        <Feature
          icon={<Globe size={20} />}
          title="Multi-language"
          desc="Native UI in EN, UA, PL and JA — switch on the fly."
        />
      </div>
    </div>
  );
};
