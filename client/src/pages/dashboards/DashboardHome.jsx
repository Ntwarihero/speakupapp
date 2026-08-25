import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { HeatMap } from '../../components/Maps';
import { StatusBadge, SeverityBadge } from '../../components/Badges';

const COLORS = ['#5C2D91', '#C9A84C', '#0f766e', '#c2410c', '#b42318', '#075985', '#9d174d'];

function Kpi({ label, value }) {
  return (
    <div className="col-6 col-lg-3">
      <div className="card-speak p-3 kpi-card h-100">
        <div className="small text-muted">{label}</div>
        <div className="display fs-2">{value ?? 0}</div>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [reports, setReports] = useState([]);
  const [news, setNews] = useState([]);

  useEffect(() => {
    if (['safety_officer', 'safety_manager', 'administrator'].includes(user.role)) {
      api.get('/analytics').then((r) => setData(r.data));
    }
    api.get('/reports').then((r) => setReports(r.data.reports.slice(0, 8)));
    api.get('/announcements').then((r) => setNews(r.data.announcements.slice(0, 4)));
  }, [user.role]);

  const lead = {
    employee: t('dashboard.employeeLead'),
    safety_officer: t('dashboard.officerLead'),
    safety_manager: t('dashboard.managerLead'),
    administrator: t('dashboard.adminLead'),
  }[user.role];

  return (
    <div>
      <h1 className="h3 mb-1">
        {t('dashboard.welcome')}, {user.fullName.split(' ')[0]}
      </h1>
      <p className="text-muted">{lead}</p>

      {user.role === 'employee' && (
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <Link to="/app/report" className="btn btn-dpw w-100 btn-lg">
              {t('nav.report')}
            </Link>
          </div>
          <div className="col-md-6">
            <Link to="/app/reports" className="btn btn-outline-dpw w-100 btn-lg">
              {t('nav.myReports')}
            </Link>
          </div>
        </div>
      )}

      {data && (
        <div className="row g-3 mb-4">
          <Kpi label={t('dashboard.total')} value={data.totals.totalReports} />
          <Kpi label={t('dashboard.open')} value={data.totals.openReports} />
          <Kpi label={t('dashboard.closed')} value={data.totals.closedReports} />
          <Kpi label={t('dashboard.nearMiss')} value={data.totals.nearMisses} />
          <Kpi label={t('dashboard.high')} value={data.totals.highRisk} />
          <Kpi label={t('dashboard.critical')} value={data.totals.criticalHazards} />
          <Kpi label={t('dashboard.response')} value={data.totals.avgResponseHours} />
          <Kpi label={t('dashboard.closure')} value={data.totals.avgClosureHours} />
        </div>
      )}

      {data && user.role !== 'employee' && (
        <div className="row g-3 mb-4">
          <div className="col-lg-6">
            <div className="card-speak p-3">
              <h2 className="h6">{t('dashboard.byCategory')}</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.byCategory}>
                  <XAxis dataKey="name" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#5C2D91" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card-speak p-3">
              <h2 className="h6">{t('dashboard.bySeverity')}</h2>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.bySeverity} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {data.bySeverity.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card-speak p-3">
              <h2 className="h6">{t('dashboard.monthly')}</h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.monthly}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#C9A84C" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card-speak p-3">
              <h2 className="h6">{t('dashboard.byLocation')}</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.byLocation} layout="vertical">
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={110} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3d1c66" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="card-speak p-3 mb-4">
        <h2 className="h6">{t('nav.review')}</h2>
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>{t('table.number')}</th>
                <th>{t('table.type')}</th>
                <th>{t('table.severity')}</th>
                <th>{t('table.status')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="report-no">{r.reportNo}</td>
                  <td>{t(`types.${r.reportType}`)}</td>
                  <td><SeverityBadge value={r.severity} /></td>
                  <td><StatusBadge value={r.status} /></td>
                  <td><Link to={`/app/reports/${r.id}`}>{t('table.view')}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {news.length > 0 && (
        <div className="card-speak p-3">
          <h2 className="h6">{t('nav.announcements')}</h2>
          {news.map((n) => (
            <div key={n.id} className="border-bottom py-2">
              <div className="fw-semibold">{n.title}</div>
              <div className="small text-muted">{n.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HeatmapPage() {
  const { t } = useTranslation();
  const [points, setPoints] = useState([]);
  useEffect(() => {
    api.get('/analytics').then((r) => setPoints(r.data.heatmap));
  }, []);
  return (
    <div>
      <h1 className="h3">{t('nav.heatmap')}</h1>
      <HeatMap points={points} />
    </div>
  );
}

export function AnalyticsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/analytics').then((r) => setData(r.data));
  }, []);
  if (!data) return <div>{t('common.loading')}</div>;
  return (
    <div>
      <h1 className="h3 mb-3">{t('nav.analytics')}</h1>
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card-speak p-3">
            <h2 className="h6">{t('dashboard.yearly')}</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.yearly}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#5C2D91" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card-speak p-3">
            <h2 className="h6">{t('dashboard.openClosed')}</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.openVsClosed} dataKey="value" nameKey="name" outerRadius={90}>
                  {data.openVsClosed.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-12">
          <div className="card-speak p-3">
            <h2 className="h6">{t('dashboard.team')}</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>{t('admin.fullName')}</th>
                  <th>{t('dashboard.assigned')}</th>
                  <th>{t('dashboard.closed')}</th>
                </tr>
              </thead>
              <tbody>
                {data.team.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.assigned}</td>
                    <td>{row.closed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
