import { useSelector } from 'react-redux';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { RecoveryGate } from './components/RecoveryGate';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import type { RootState } from './store';
import './App.css';
import { PATHS } from './types/enums';

const ProtectedRoute = () => {
  const token = useSelector((s: RootState) => s.auth.token);
  const recoveryNeeded = useSelector(
    (s: RootState) => s.auth.recoveryNeeded,
  );
  if (!token) return <Navigate to={PATHS.LOGIN} replace />;
  return (
    <>
      <Outlet />
      {recoveryNeeded && <RecoveryGate />}
    </>
  );
};

const GuestRoute = () => {
  const token = useSelector((s: RootState) => s.auth.token);
  return token ? <Navigate to={PATHS.CHAT} replace /> : <Outlet />;
};

function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path={PATHS.LOGIN} element={<LoginPage />} />
        <Route path={PATHS.REGISTER} element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path={PATHS.CHAT} element={<ChatPage />} />
        <Route path={`${PATHS.CHAT}/:id`} element={<ChatPage />} />
      </Route>
      <Route path="/" element={<Navigate to={PATHS.CHAT} replace />} />
      <Route path="*" element={<Navigate to={PATHS.CHAT} replace />} />
    </Routes>
  );
}

export default App;
