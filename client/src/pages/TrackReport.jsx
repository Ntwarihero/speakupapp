import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { StatusBadge, SeverityBadge } from '../components/Badges';

export default function TrackReport() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [no, setNo] = useState(params.get('no') || '');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    setReport(null);
    try {
      const { data } = await api.get(`/track/${encodeURIComponent(no.trim())}`);
      setReport(data.report);
      setParams({ no: no.trim() });
    } catch {
      setError(t('track.notFound'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-speak p-4 p-md-5" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 className="h3">{t('track.title')}</h1>
      <p className="text-muted">{t('track.lead')}</p>
      <form className="d-flex gap-2 mb-4" onSubmit={search}>
        <input
          className="form-control"
          placeholder={t('track.placeholder')}
          value={no}
          onChange={(e) => setNo(e.target.value.toUpperCase())}
          required
        />
        <button className="btn btn-dpw" disabled={busy}>
          {t('track.search')}
        </button>
      </form>
      {error && <div className="alert alert-warning">{error}</div>}
      {report && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="report-no fs-4">{report.reportNo}</span>
            <StatusBadge value={report.status} />
          </div>
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <div className="small text-muted">{t('report.severity')}</div>
              <SeverityBadge value={report.severity} />
            </div>
            <div className="col-md-4">
              <div className="small text-muted">{t('report.location')}</div>
              <div>{report.locationName}</div>
            </div>
            <div className="col-md-4">
              <div className="small text-muted">{t('track.department')}</div>
              <div>{report.assignedDepartment || '—'}</div>
            </div>
            <div className="col-md-4">
              <div className="small text-muted">{t('track.closure')}</div>
              <div>{report.closedAt ? new Date(report.closedAt).toLocaleString() : '—'}</div>
            </div>
          </div>
          <h2 className="h6">{t('track.actionsTaken')}</h2>
          <ul className="list-group">
            {(report.history || []).map((h, i) => (
              <li className="list-group-item" key={i}>
                <StatusBadge value={h.toStatus} />
                <span className="ms-2 small text-muted">{new Date(h.createdAt).toLocaleString()}</span>
                {h.note && <div>{h.note}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
