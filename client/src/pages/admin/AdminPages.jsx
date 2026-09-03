import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import api from '../../services/api';

export function ActionsPage() {
  const { t } = useTranslation();
  const [actions, setActions] = useState([]);
  const load = () => api.get('/actions').then((r) => setActions(r.data.actions));
  useEffect(() => { load(); }, []);
  const update = async (id, status) => {
    await api.patch(`/actions/${id}`, { status });
    load();
  };
  return (
    <div>
      <h1 className="h3 mb-3">{t('nav.actions')}</h1>
      <div className="card-speak table-responsive">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>{t('table.number')}</th>
              <th>{t('actions.title')}</th>
              <th>{t('actions.responsible')}</th>
              <th>{t('actions.due')}</th>
              <th>{t('actions.status')}</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id}>
                <td className="report-no">{a.reportNo}</td>
                <td>{a.title}</td>
                <td>{a.responsibleName}</td>
                <td>{a.dueDate}</td>
                <td>
                  <select className="form-select form-select-sm" value={a.status} onChange={(e) => update(a.id, e.target.value)}>
                    {['open', 'in_progress', 'completed', 'overdue'].map((s) => (
                      <option key={s} value={s}>{t(`actions.${s}`)}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AnnouncementsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get('/announcements').then((r) => setItems(r.data.announcements));
  }, []);
  return (
    <div>
      <h1 className="h3 mb-3">{t('nav.announcements')}</h1>
      {items.map((n) => (
        <div className="card-speak p-3 mb-3" key={n.id}>
          <h2 className="h5">{n.title}</h2>
          <p className="mb-0">{n.body}</p>
        </div>
      ))}
    </div>
  );
}

export function TrainingPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get('/training').then((r) => setItems(r.data.materials));
  }, []);
  return (
    <div>
      <h1 className="h3 mb-3">{t('nav.training')}</h1>
      <div className="row g-3">
        {items.map((m) => (
          <div className="col-md-6" key={m.id}>
            <a className="card-speak p-3 d-block text-decoration-none h-100" href={m.url} target="_blank" rel="noreferrer">
              <div className="small text-muted">{m.category}</div>
              <h2 className="h5" style={{ color: 'var(--ink)' }}>{m.title}</h2>
              <p className="mb-0 text-muted">{m.description}</p>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const load = () => api.get('/admin/users').then((r) => setUsers(r.data.users));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    try {
      const { data } = await api.post('/admin/users', body);
      e.target.reset();
      Swal.fire({
        icon: 'success',
        title: t('admin.userCreated'),
        text: t('admin.credentialsEmailed', { email: data.user.email }),
        confirmButtonColor: '#5C2D91',
      });
      load();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: t('common.error'),
        text: err.response?.data?.error?.message || t('common.error'),
        confirmButtonColor: '#5C2D91',
      });
    }
  };

  return (
    <div>
      <h1 className="h3 mb-3">{t('nav.users')}</h1>
      <form className="card-speak p-3 mb-4 row g-2" onSubmit={create}>
        <div className="col-md-3"><input className="form-control" name="fullName" placeholder={t('admin.fullName')} required /></div>
        <div className="col-md-2"><input className="form-control" name="username" placeholder={t('auth.username')} required /></div>
        <div className="col-md-3"><input className="form-control" name="email" type="email" placeholder={t('admin.email')} required /></div>
        <div className="col-md-2">
          <select className="form-select" name="role" defaultValue="employee">
            {['employee', 'safety_officer', 'safety_manager', 'administrator'].map((r) => (
              <option key={r} value={r}>{t(`roles.${r}`)}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2"><button className="btn btn-dpw w-100" type="submit">{t('admin.createUser')}</button></div>
        <div className="col-12"><p className="small text-muted mb-0">{t('admin.passwordHint')}</p></div>
      </form>
      <div className="card-speak table-responsive">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>{t('admin.fullName')}</th>
              <th>{t('auth.username')}</th>
              <th>{t('admin.role')}</th>
              <th>{t('admin.active')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.username}</td>
                <td>{t(`roles.${u.role}`)}</td>
                <td>
                  <button
                    className="btn btn-sm btn-outline-dpw"
                    type="button"
                    onClick={() => api.patch(`/admin/users/${u.id}`, { isActive: !u.isActive }).then(load)}
                  >
                    {u.isActive ? t('admin.active') : t('admin.inactive')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LocationsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const load = () =>
    api.get('/admin/locations')
      .then((r) => setRows(Array.isArray(r.data.locations) ? r.data.locations : []))
      .catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h1 className="h3 mb-3">{t('nav.locations')}</h1>
      <div className="card-speak table-responsive">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>Code</th>
              <th>{t('report.location')}</th>
              <th>QR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td className="report-no">{l.code}</td>
                <td>{l.name}</td>
                <td>{l.qr_slug}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CategoriesPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get('/admin/categories').then((r) => setRows(r.data.categories));
  }, []);
  return (
    <div>
      <h1 className="h3 mb-3">{t('nav.categories')}</h1>
      <ul className="list-group">
        {rows.map((c) => (
          <li className="list-group-item d-flex justify-content-between" key={c.id}>
            <span>{c.name}</span>
            <span className="text-muted">{c.module}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AuditPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    api.get('/admin/audit').then((r) => setLogs(r.data.logs));
  }, []);
  return (
    <div>
      <h1 className="h3">{t('nav.audit')}</h1>
      <p className="text-muted">{t('admin.auditLead')}</p>
      <div className="card-speak table-responsive">
        <table className="table table-sm mb-0">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="small">{new Date(l.created_at).toLocaleString()}</td>
                <td>{l.actor_name}</td>
                <td>{l.action}</td>
                <td>{l.entity} {l.entity_id?.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({});
  useEffect(() => {
    api.get('/admin/settings').then((r) => setSettings(r.data.settings));
  }, []);
  const save = async (e) => {
    e.preventDefault();
    const { data } = await api.put('/admin/settings', Object.fromEntries(new FormData(e.target).entries()));
    setSettings(data.settings);
    Swal.fire({ icon: 'success', timer: 1000, showConfirmButton: false });
  };
  return (
    <div className="card-speak p-4" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-3">{t('nav.settings')}</h1>
      <form onSubmit={save}>
        {Object.entries(settings).map(([k, v]) => (
          <div className="mb-3" key={k}>
            <label className="form-label">{k}</label>
            <input className="form-control" name={k} defaultValue={v} />
          </div>
        ))}
        <button className="btn btn-dpw" type="submit">{t('admin.saveSettings')}</button>
      </form>
    </div>
  );
}

export function QrPage() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="h3">{t('nav.qr')}</h1>
      <p className="text-muted">{t('admin.qrPrint')}</p>
      <a className="btn btn-dpw mb-3" href="/posters" target="_blank" rel="noreferrer">
        Open printable poster
      </a>
      <p className="small text-muted">
        One poster for the whole site. The QR code opens the SpeakUp welcome page.
      </p>
    </div>
  );
}
