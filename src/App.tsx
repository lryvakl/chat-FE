import ChatPage from "./pages/ChatPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "./store";
import "./App.css";

function App() {
  const token = useSelector((state: RootState) => state.auth.token);
  return (
    <Routes>
      <Route
        path="/login"
        element={!token ? <LoginPage /> : <Navigate to="/chat/General" />}
      />
      <Route
        path="/register"
        element={!token ? <RegisterPage /> : <Navigate to="/chat/General" />}
      />

      <Route
        path="/chat/:room"
        element={token ? <ChatPage /> : <Navigate to="/login" />}
      />

      <Route path="/chat" element={<Navigate to="/chat/General" replace />} />

      <Route path="/" element={<Navigate to="/chat/General" />} />
    </Routes>
  );
}

export default App;
