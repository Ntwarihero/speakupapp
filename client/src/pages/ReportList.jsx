import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { StatusBadge, SeverityBadge } from '../components/Badges';

export default function ReportList() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const load = () => api.get('/reports', { params: { q, status } }).then((r) => setReports(r.data.reports));
    load();
    window.addEventListener('speakup:reports-updated', load);
    return () => window.removeEventListener('speakup:reports-updated', load);
  }, [q, status]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h1 className="h3 mb-0">{t('nav.review')}</h1>
        <Link to="/app/report" className="btn btn-dpw">{t('nav.report')}</Link>
      </div>
      <div className="d-flex gap-2 mb-3">
        <input className="form-control" placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="form-select" style={{ maxWidth: 220 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('common.all')}</option>
          {['open', 'assigned', 'under_investigation', 'corrective_action', 'awaiting_verification', 'closed'].map((s) => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>
      </div>
      <div className="card-speak table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th>{t('table.number')}</th>
              <th>{t('table.type')}</th>
              <th>{t('table.location')}</th>
              <th>{t('table.severity')}</th>
              <th>{t('table.status')}</th>
              <th>{t('table.when')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="report-no">{r.reportNo}</td>
                <td>{t(`types.${r.reportType}`)}</td>
                <td>{r.locationName}</td>
                <td><SeverityBadge value={r.severity} /></td>
                <td><StatusBadge value={r.status} /></td>
                <td className="small">{new Date(r.createdAt).toLocaleString()}</td>
                <td><Link to={`/app/reports/${r.id}`}>{t('table.view')}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
