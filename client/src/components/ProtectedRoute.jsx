import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border" style={{ color: '#5C2D91' }} role="status" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && location.pathname !== '/app/set-password') {
    return <Navigate to="/app/set-password" replace />;
  }
  if (!user.mustChangePassword && location.pathname === '/app/set-password') {
    return <Navigate to="/app" replace />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return children;
}
