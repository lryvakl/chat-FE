import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import type { AppDispatch, RootState } from "../store";
import {
  Typography,
  TextField,
  Box,
  Paper,
  Button,
  Alert,
} from "@mui/material";
import { registerUser } from "../store/thunks/register";

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#f0f2f5"
    >
      <Paper elevation={3} sx={{ p: 4, width: 350 }}>
        <Typography variant="h5" mb={2} textAlign="center" fontWeight="bold">
          Create Account
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            fullWidth
            label="Password"
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
            {isLoading ? "Creating..." : "Sign Up"}
          </Button>
        </form>

        <Box mt={2} textAlign="center">
          <Typography variant="body2">
            Already have an account?{" "}
            <Link
              to="/login"
              style={{ textDecoration: "none", color: "#1976d2" }}
            >
              Login
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default RegisterPage;
