import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Link,
  Container,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { loginUser } from "../store/thunks/login";
import type { AppDispatch, RootState } from "../store";
import { clearError } from "../store/authSlice";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { t } = useTranslation();

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { token, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    if (token) {
      navigate("/chat/General");
    }
  }, [token, navigate]);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      dispatch(loginUser({ username, password }));
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
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            borderRadius: 2,
          }}
        >
          <Typography component="h1" variant="h5" fontWeight="bold" mb={3}>
            {t("auth.login")}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label={t("auth.username")}
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={t("auth.password")}
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.2 }}
              disabled={isLoading || !username || !password}
            >
              {isLoading ? t("auth.signingIn") : t("auth.signIn")}
            </Button>

            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                {t("auth.offerToRegister")}{" "}
                <Link
                  component={RouterLink}
                  to="/register"
                  variant="body2"
                  underline="hover"
                  sx={{ color: "#1976d2", fontWeight: 500 }}
                >
                  {t("auth.signUp")}
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
