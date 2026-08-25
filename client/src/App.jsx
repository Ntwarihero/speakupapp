import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout, { PublicLayout } from './components/Layout';
import PrintPosters from './pages/PrintPosters';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import PublicHome from './pages/PublicHome';
import ReportForm from './pages/ReportForm';
import TrackReport from './pages/TrackReport';
import ReportList from './pages/ReportList';
import ReportDetail from './pages/ReportDetail';
import DashboardHome, { AnalyticsPage, HeatmapPage } from './pages/dashboards/DashboardHome';
import {
  ActionsPage,
  AnnouncementsPage,
  AuditPage,
  CategoriesPage,
  LocationsPage,
  QrPage,
  SettingsPage,
  TrainingPage,
  UsersPage,
} from './pages/admin/AdminPages';

function InternalReport() {
  return (
    <div style={{ maxWidth: 960 }}>
      <ReportForm />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/posters" element={<PrintPosters />} />
            <Route path="/login" element={<Login />} />
            <Route element={<PublicLayout />}>
              <Route path="/home" element={<PublicHome />} />
              <Route path="/report" element={<ReportForm />} />
              <Route path="/track" element={<TrackReport />} />
            </Route>
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="report" element={<InternalReport />} />
              <Route path="reports" element={<ReportList />} />
              <Route path="reports/:id" element={<ReportDetail />} />
              <Route path="actions" element={<RoleGate roles={['safety_officer', 'safety_manager', 'administrator']}><ActionsPage /></RoleGate>} />
              <Route path="heatmap" element={<RoleGate roles={['safety_officer', 'safety_manager', 'administrator']}><HeatmapPage /></RoleGate>} />
              <Route path="analytics" element={<RoleGate roles={['safety_manager', 'administrator']}><AnalyticsPage /></RoleGate>} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="training" element={<TrainingPage />} />
              <Route path="users" element={<RoleGate roles={['administrator']}><UsersPage /></RoleGate>} />
              <Route path="locations" element={<RoleGate roles={['administrator']}><LocationsPage /></RoleGate>} />
              <Route path="categories" element={<RoleGate roles={['administrator']}><CategoriesPage /></RoleGate>} />
              <Route path="qr" element={<RoleGate roles={['administrator']}><QrPage /></RoleGate>} />
              <Route path="audit" element={<RoleGate roles={['administrator']}><AuditPage /></RoleGate>} />
              <Route path="settings" element={<RoleGate roles={['administrator']}><SettingsPage /></RoleGate>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </AuthProvider>
  );
}

function RoleGate({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to="/app" replace />;
  return children;
}
