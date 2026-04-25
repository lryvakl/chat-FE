import type { LoaderProps } from "../../types/interfaces";

export const Loader = ({ fullScreen = false, message }: LoaderProps) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      minHeight: fullScreen ? "100vh" : "100%",
      gap: "1rem",
    }}
  >
    <div className="spinner" />
    {message && (
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 500 }}>
        {message}
      </p>
    )}
  </div>
);

export default Loader;
