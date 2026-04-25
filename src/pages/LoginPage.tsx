import { MessageCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";

import { AuroraBackground } from "../components/utils/AuroraBackground";
import { AuthShowcase } from "../components/utils/AuthShowcase";
import { LanguageSwitcher } from "../components/utils/LanguageSwitcher";
import { ThemeToggle } from "../components/utils/ThemeToggle";
import { TourButton } from "../components/utils/TourButton";
import { getLoginSteps } from "../constants/steps";
import type { AppDispatch, RootState } from "../store";
import { clearError } from "../store/authSlice";
import { loginUser } from "../store/thunks/login";
import { PATHS, Room } from "../types/enums";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { t } = useTranslation();
  const loginSteps = useMemo(() => getLoginSteps(t), [t]);

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { token, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    if (token) navigate(`${PATHS.CHAT}/${Room.General}`);
  }, [token, navigate]);

  useEffect(() => { dispatch(clearError()); }, [dispatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      dispatch(loginUser({ username, password }));
    }
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
        <TourButton steps={loginSteps} />
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
              style={{ width: 52, height: 52, marginBottom: "1.25rem" }}
            >
              <MessageCircle size={26} />
            </div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                letterSpacing: "-0.025em",
                marginBottom: "0.4rem",
              }}
            >
              {t("auth.login")}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {t("auth.offerToRegister")}{" "}
              <Link
                to={PATHS.REGISTER}
                className="gradient-text"
                style={{ fontWeight: 700, textDecoration: "none" }}
              >
                {t("auth.signUp")}
              </Link>
            </p>
          </div>

          {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="field-group">
              <label className="field-label" htmlFor="username">
                {t("auth.username")}
              </label>
              <input
                id="username"
                className="field-input"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ marginTop: "0.75rem", width: "100%", padding: "0.8rem" }}
              disabled={isLoading || !username || !password}
            >
              {isLoading ? t("auth.signingIn") : t("auth.signIn")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
