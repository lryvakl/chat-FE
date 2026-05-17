import { UserPlus } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";

import { AuroraBackground } from "../components/utils/AuroraBackground";
import { AuthShowcase } from "../components/utils/AuthShowcase";
import { LanguageSwitcher } from "../components/utils/LanguageSwitcher";
import { ThemeToggle } from "../components/utils/ThemeToggle";
import { TourButton } from "../components/utils/TourButton";
import { getRegisterSteps } from "../constants/steps";
import type { AppDispatch, RootState } from "../store";
import { registerUser } from "../store/thunks/register";
import { PATHS } from "../types/enums";

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { t } = useTranslation();
  const registerSteps = useMemo(() => getRegisterSteps(t), [t]);

  const { token, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate(PATHS.CHAT);
  }, [token, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) dispatch(registerUser({ username, password }));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        height: "100vh",
        overflow: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        position: "relative",
      }}
    >
      <AuroraBackground />

      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 1000,
          display: "flex",
          gap: "0.25rem",
        }}
      >
        <ThemeToggle />
        <TourButton steps={registerSteps} />
        <LanguageSwitcher />
      </div>

      <div
        className="anim-fade-up"
        style={{
          display: "flex",
          gap: "2rem",
          width: "100%",
          maxWidth: 1080,
          alignItems: "stretch",
        }}
      >
        <AuthShowcase />

        <div
          className="glass-card"
          style={{
            flex: 1,
            maxWidth: 460,
            padding: "2.5rem 3rem",
          }}
        >
          <div style={{ marginBottom: "2rem" }}>
            <div
              className="logo-mark"
              style={{
                width: 52,
                height: 52,
                marginBottom: "1.25rem",
                background:
                  "linear-gradient(135deg, #ec4899, #8b5cf6, #6366f1)",
                backgroundSize: "200% 200%",
                animation: "gradient-shift 6s ease infinite",
                boxShadow: "0 12px 32px rgba(236,72,153,0.45)",
              }}
            >
              <UserPlus size={26} />
            </div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                letterSpacing: "-0.025em",
                marginBottom: "0.4rem",
              }}
            >
              {t("auth.registration")}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {t("auth.haveAnAccount")}{" "}
              <Link
                to={PATHS.LOGIN}
                className="gradient-text-pink"
                style={{ fontWeight: 700, textDecoration: "none" }}
              >
                {t("auth.login")}
              </Link>
            </p>
          </div>

          {error && (
            <div className="alert-error" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div className="field-group">
              <label className="field-label" htmlFor="username">
                {t("auth.username")}
              </label>
              <input
                id="username"
                className="field-input"
                type="text"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="password">
                {t("auth.password")}
              </label>
              <input
                id="password"
                className="field-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ marginTop: "0.75rem", width: "100%", padding: "0.8rem" }}
              disabled={isLoading || !username || !password}
            >
              {isLoading ? t("auth.signingUp") : t("auth.signUp")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
