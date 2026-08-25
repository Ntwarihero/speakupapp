import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, SeverityBadge } from '../components/Badges';
import { ReportMap } from '../components/Maps';
import ImageGallery from '../components/ImageGallery';

const STATUSES = ['open', 'assigned', 'under_investigation', 'corrective_action', 'awaiting_verification', 'closed'];

export default function ReportDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [investigation, setInvestigation] = useState(null);
  const [actions, setActions] = useState([]);
  const [officers, setOfficers] = useState([]);
  const officer = ['safety_officer', 'safety_manager', 'administrator'].includes(user.role);
  const manager = ['safety_manager', 'administrator'].includes(user.role);

  const load = async () => {
    const [{ data: r }, lookups] = await Promise.all([api.get(`/reports/${id}`), api.get('/lookups')]);
    setReport(r.report);
    setOfficers(lookups.data.officers);
    if (officer) {
      const inv = await api.get(`/reports/${id}/investigation`);
      setInvestigation(inv.data.investigation || emptyInv());
      const act = await api.get('/actions', { params: { reportId: id } });
      setActions(act.data.actions);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!report) return <div>{t('common.loading')}</div>;

  const saveStatus = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.patch(`/reports/${id}/status`, Object.fromEntries(fd.entries()));
    Swal.fire({ icon: 'success', timer: 1200, showConfirmButton: false });
    load();
  };

  const saveInv = async (status) => {
    await api.put(`/reports/${id}/investigation`, { ...investigation, status });
    Swal.fire({ icon: 'success', timer: 1200, showConfirmButton: false });
    load();
  };

  const addAction = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    await api.post('/actions', { ...fd, reportId: id });
    e.target.reset();
    load();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <div className="report-no fs-3">{report.reportNo}</div>
          <div className="text-muted">{t(`types.${report.reportType}`)} · {report.locationName}</div>
        </div>
        <div className="d-flex gap-2">
          <SeverityBadge value={report.severity} />
          <StatusBadge value={report.status} />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card-speak p-3 mb-3">
            <p>{report.description}</p>
            <div className="small text-muted">
              {report.isAnonymous ? t('home.anonymous') : report.reporterName || '—'} · {new Date(report.createdAt).toLocaleString()}
            </div>
            {report.extraFields && (
              <pre className="small mt-2 mb-0 bg-light p-2 rounded">{JSON.stringify(report.extraFields, null, 2)}</pre>
            )}
          </div>
          <div className="card-speak p-3 mb-3">
            <h2 className="h6">{t('detail.photos')}</h2>
            <ImageGallery images={report.images} />
          </div>
          <div className="card-speak p-3 mb-3">
            <h2 className="h6">{t('detail.map')}</h2>
            <ReportMap lat={report.latitude} lng={report.longitude} label={report.locationName} />
          </div>
          <div className="card-speak p-3">
            <h2 className="h6">{t('detail.history')}</h2>
            <ul className="list-group list-group-flush">
              {(report.history || []).map((h) => (
                <li className="list-group-item px-0" key={h.id}>
                  <StatusBadge value={h.to_status} />
                  <span className="ms-2 small">{h.changed_by_name || '—'}</span>
                  <div className="small text-muted">{new Date(h.created_at).toLocaleString()} {h.note || ''}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {officer && (
          <div className="col-lg-5">
            <div className="card-speak p-3 mb-3">
              <h2 className="h6">{t('detail.updateStatus')}</h2>
              <form onSubmit={saveStatus}>
                <select className="form-select mb-2" name="status" defaultValue={report.status}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`status.${s}`)}</option>
                  ))}
                </select>
                <select className="form-select mb-2" name="assignedTo" defaultValue={report.assignedTo || ''}>
                  <option value="">{t('detail.assign')}</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>{o.full_name}</option>
                  ))}
                </select>
                <input className="form-control mb-2" name="assignedDepartment" placeholder={t('actions.department')} defaultValue={report.assignedDepartment || ''} />
                <textarea className="form-control mb-2" name="note" placeholder={t('detail.note')} />
                <button className="btn btn-dpw w-100" type="submit">{t('detail.save')}</button>
              </form>
            </div>
            {investigation && (
              <div className="card-speak p-3 mb-3">
                <h2 className="h6">{t('detail.investigation')}</h2>
                {['incidentSummary', 'findings', 'rootCause', 'correctiveActions', 'preventiveActions', 'lessonsLearned'].map((k) => (
                  <div className="mb-2" key={k}>
                    <label className="form-label small">{t(`investigation.${k === 'incidentSummary' ? 'summary' : k === 'rootCause' ? 'rootCause' : k === 'correctiveActions' ? 'corrective' : k === 'preventiveActions' ? 'preventive' : k === 'lessonsLearned' ? 'lessons' : 'findings'}`)}</label>
                    <textarea className="form-control" rows="2" value={investigation[k] || ''} onChange={(e) => setInvestigation({ ...investigation, [k]: e.target.value })} />
                  </div>
                ))}
                <h3 className="h6 mt-3">{t('investigation.fiveWhy')}</h3>
                {[1, 2, 3, 4, 5].map((n) => (
                  <input key={n} className="form-control mb-2" placeholder={`${t('investigation.why')} ${n}`} value={investigation[`why${n}`] || ''} onChange={(e) => setInvestigation({ ...investigation, [`why${n}`]: e.target.value })} />
                ))}
                <h3 className="h6 mt-3">{t('investigation.fishbone')}</h3>
                {['People', 'Equipment', 'Methods', 'Materials', 'Environment', 'Management'].map((n) => (
                  <input key={n} className="form-control mb-2" placeholder={t(`investigation.${n.toLowerCase()}`)} value={investigation[`fishbone${n}`] || ''} onChange={(e) => setInvestigation({ ...investigation, [`fishbone${n}`]: e.target.value })} />
                ))}
                <div className="d-flex gap-2 mt-2">
                  <button className="btn btn-outline-dpw" type="button" onClick={() => saveInv('draft')}>{t('investigation.saveDraft')}</button>
                  <button className="btn btn-dpw" type="button" onClick={() => saveInv('submitted')}>{t('investigation.submit')}</button>
                </div>
                {manager && investigation.status === 'submitted' && (
                  <div className="d-flex gap-2 mt-2">
                    <button className="btn btn-gold" type="button" onClick={() => api.post(`/reports/${id}/investigation/approve`, { approved: true }).then(load)}>{t('investigation.approve')}</button>
                    <button className="btn btn-outline-danger" type="button" onClick={() => api.post(`/reports/${id}/investigation/approve`, { approved: false }).then(load)}>{t('investigation.reject')}</button>
                  </div>
                )}
              </div>
            )}
            <div className="card-speak p-3">
              <h2 className="h6">{t('detail.actions')}</h2>
              {actions.map((a) => (
                <div key={a.id} className="border-bottom py-2">
                  <div className="fw-semibold">{a.title}</div>
                  <div className="small">{a.responsibleName} · {a.dueDate} · {t(`actions.${a.status}`)}</div>
                </div>
              ))}
              <form className="mt-3" onSubmit={addAction}>
                <input className="form-control mb-2" name="title" placeholder={t('actions.title')} required />
                <textarea className="form-control mb-2" name="description" placeholder={t('actions.description')} required />
                <input className="form-control mb-2" name="department" placeholder={t('actions.department')} required />
                <input className="form-control mb-2" name="responsibleName" placeholder={t('actions.responsible')} />
                <input className="form-control mb-2" type="date" name="dueDate" required />
                <select className="form-select mb-2" name="priority" defaultValue="medium">
                  {['low', 'medium', 'high', 'critical'].map((p) => (
                    <option key={p} value={p}>{t(`severity.${p}`)}</option>
                  ))}
                </select>
                <button className="btn btn-dpw w-100" type="submit">{t('actions.add')}</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function emptyInv() {
  return {
    incidentSummary: '',
    findings: '',
    rootCause: '',
    correctiveActions: '',
    preventiveActions: '',
    lessonsLearned: '',
    why1: '',
    why2: '',
    why3: '',
    why4: '',
    why5: '',
    fishbonePeople: '',
    fishboneEquipment: '',
    fishboneMethods: '',
    fishboneMaterials: '',
    fishboneEnvironment: '',
    fishboneManagement: '',
  };
}
