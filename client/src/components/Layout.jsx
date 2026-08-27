import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import BrandMark from './BrandMark';
import LanguageSwitcher from './LanguageSwitcher';
import IncomingReportAlerts from './IncomingReportAlerts';

const LINKS = {
  employee: [
    ['/app', 'nav.home', 'bi-speedometer2'],
    ['/app/report', 'nav.report', 'bi-exclamation-triangle'],
    ['/app/reports', 'nav.myReports', 'bi-list-check'],
    ['/app/announcements', 'nav.announcements', 'bi-megaphone'],
    ['/app/training', 'nav.training', 'bi-journal-text'],
  ],
  safety_officer: [
    ['/app', 'nav.home', 'bi-speedometer2'],
    ['/app/reports', 'nav.review', 'bi-clipboard2-pulse'],
    ['/app/actions', 'nav.actions', 'bi-hammer'],
    ['/app/heatmap', 'nav.heatmap', 'bi-geo-alt'],
    ['/app/report', 'nav.report', 'bi-plus-circle'],
  ],
  safety_manager: [
    ['/app', 'nav.kpis', 'bi-graph-up-arrow'],
    ['/app/reports', 'nav.review', 'bi-clipboard2-pulse'],
    ['/app/actions', 'nav.actions', 'bi-hammer'],
    ['/app/heatmap', 'nav.heatmap', 'bi-geo-alt'],
    ['/app/analytics', 'nav.analytics', 'bi-bar-chart'],
    ['/app/announcements', 'nav.announcements', 'bi-megaphone'],
  ],
  administrator: [
    ['/app', 'nav.home', 'bi-speedometer2'],
    ['/app/reports', 'nav.review', 'bi-clipboard2-pulse'],
    ['/app/users', 'nav.users', 'bi-people'],
    ['/app/locations', 'nav.locations', 'bi-pin-map'],
    ['/app/categories', 'nav.categories', 'bi-tags'],
    ['/app/qr', 'nav.qr', 'bi-qr-code'],
    ['/app/audit', 'nav.audit', 'bi-shield-check'],
    ['/app/settings', 'nav.settings', 'bi-gear'],
  ],
};

export default function AppLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = LINKS[user?.role] || LINKS.employee;

  return (
    <div className="d-lg-flex">
      <aside className="sidebar p-3 text-white">
        <div className="mb-4">
          <BrandMark light compact />
        </div>
        <nav className="nav flex-column gap-1">
          {links.map(([to, key, icon]) => (
            <NavLink key={to} to={to} end={to === '/app'} className="nav-link">
              <i className={`bi ${icon}`} />
              {t(key)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-grow-1 app-main">
        <header className="topbar px-3 py-2 d-flex justify-content-between align-items-center gap-2">
          <div className="small text-muted">
            {user?.fullName} · {t(`roles.${user?.role}`)}
          </div>
          <div className="d-flex align-items-center gap-2">
            <IncomingReportAlerts />
            <LanguageSwitcher variant="dark" />
            <button
              className="btn btn-outline-dpw btn-sm"
              type="button"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
            >
              {t('nav.logout')}
            </button>
          </div>
        </header>
        <main className="p-3 p-lg-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PublicLayout() {
  return (
    <div className="min-vh-100" style={{ background: 'var(--surface)' }}>
      <header className="topbar px-3 py-2 d-flex justify-content-between align-items-center">
        <BrandMark compact />
        <LanguageSwitcher variant="dark" />
      </header>
      <main className="container py-4">
        <Outlet />
      </main>
    </div>
  );
}
