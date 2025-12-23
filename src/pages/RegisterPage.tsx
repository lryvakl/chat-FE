import {
  Typography,
  TextField,
  Box,
  Paper,
  Button,
  Alert,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";

import { LanguageSwitcher } from "../components/utils/LanguageSwitcher";
import type { AppDispatch, RootState } from "../store";
import { registerUser } from "../store/thunks/register";

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { t } = useTranslation();
  const { token, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate("/chat");
  }, [token, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      dispatch(registerUser({ username, password }));
    }
  };
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        bgcolor: "#f0f2f5",
        position: "relative",
      }}
    >
      <Box
        sx={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 1000,
        }}
      >
        <LanguageSwitcher />
      </Box>
      <Paper elevation={3} sx={{ p: 4, width: 350 }}>
        <Typography variant="h5" mb={2} textAlign="center" fontWeight="bold">
          {t("auth.registration")}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={t("auth.username")}
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            fullWidth
            label={t("auth.password")}
            type="password"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            fullWidth
            variant="contained"
            type="submit"
            sx={{ mt: 2, py: 1.2 }}
            disabled={isLoading}
          >
            {isLoading ? t("auth.signingUp") : t("auth.signUp")}
          </Button>
        </form>

        <Box mt={2} textAlign="center">
          <Typography variant="body2">
            {t("auth.haveAnAccount")}{" "}
            <Link
              to="/login"
              style={{ textDecoration: "none", color: "#1976d2" }}
            >
              {t("auth.login")}
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default RegisterPage;
