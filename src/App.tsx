import ChatPage from "./pages/ChatPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "./store";
import "./App.css";

const ProtectedRoute = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.token);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const GuestRoute = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.token);
  return isAuthenticated ? <Navigate to="/chat/General" replace /> : <Outlet />;
};

function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/chat/:room" element={<ChatPage />} />
        <Route path="/chat" element={<Navigate to="/chat/General" replace />} />
      </Route>
      <Route path="/" element={<Navigate to="/chat/General" replace />} />
    </Routes>
  );
}

export default App;
