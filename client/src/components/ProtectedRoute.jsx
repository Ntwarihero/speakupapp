import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { peekNextPath, rememberNextPath } from '../utils/safePath';

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
  if (!user) {
    const next = `${location.pathname}${location.search}`;
    const qs = next.startsWith('/app') ? `?next=${encodeURIComponent(next)}` : '';
    return <Navigate to={`/login${qs}`} replace />;
  }
  if (user.mustChangePassword && location.pathname !== '/app/set-password') {
    rememberNextPath(`${location.pathname}${location.search}`);
    return <Navigate to="/app/set-password" replace />;
  }
  if (!user.mustChangePassword && location.pathname === '/app/set-password') {
    return <Navigate to={peekNextPath('/app')} replace />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return children;
}
