import JoinForm from "./components/JoinForm";
import ChatPage from "./pages/ChatPage";
import RegisterPage from "./pages/RegisterPage";
//import LoginPage from "./pages/LoginPage"
import { Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "./store";
import "./App.css";

function App() {
  const token = useSelector((state: RootState) => state.auth.token);
  return (
    <Routes>
      <Route path="/" element={<JoinForm />} />
      <Route
        path="/register"
        element={!token ? <RegisterPage /> : <Navigate to="/chat" />}
      />

      <Route
        path="/chat"
        element={token ? <ChatPage /> : <Navigate to="/login" />}
      />
      <Route path="/chat/:room" element={<ChatPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
