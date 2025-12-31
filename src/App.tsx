import { useSelector } from "react-redux";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import type { RootState } from "./store";
import "./App.css";
import { PATHS } from "./types/enums";
import { Room } from "./types/enums";

const ProtectedRoute = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.token);
  return isAuthenticated ? <Outlet /> : <Navigate to={PATHS.LOGIN} replace />;
};

const GuestRoute = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.token);
  return isAuthenticated ? (
    <Navigate to={`${PATHS.CHAT}/${Room.General}`} replace />
  ) : (
    <Outlet />
  );
};

function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path={PATHS.LOGIN} element={<LoginPage />} />
        <Route path={PATHS.REGISTER} element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path={`${PATHS.CHAT}/:room`} element={<ChatPage />} />
        <Route
          path={PATHS.CHAT}
          element={<Navigate to={`${PATHS.CHAT}/${Room.General}`} replace />}
        />
      </Route>
      <Route
        path="/"
        element={<Navigate to={`${PATHS.CHAT}/${Room.General}`} replace />}
      />
    </Routes>
  );
}

export default App;
