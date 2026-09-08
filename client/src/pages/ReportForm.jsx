import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import api from '../services/api';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import { ReportMap } from '../components/Maps';
import { FALLBACK_LOCATIONS } from '../data/sites';

const TYPES = [
  'unsafe_condition',
  'unsafe_act',
  'near_miss',
  'fire_hazard',
  'traffic_hazard',
  'environmental_hazard',
  'security_concern',
  'equipment_failure',
  'warehouse_hazard',
  'ppe_violation',
  'spill_or_leak',
  'damage_to_infrastructure',
  'forklift_hazard',
  'container_yard_hazard',
  'damaged_container',
  'other',
];

const MODULE_DEFAULTS = {
  forklift: 'forklift_hazard',
  traffic: 'traffic_hazard',
  container_yard: 'container_yard_hazard',
  warehouse: 'warehouse_hazard',
  damaged_container: 'damaged_container',
};

export default function ReportForm() {
  const { t } = useTranslation();
  const { category, qrLocation, isPublic } = useSession();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const moduleName = params.get('module') || 'general';
  const [lookups, setLookups] = useState({ locations: FALLBACK_LOCATIONS, categories: [] });
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [form, setForm] = useState({
    isAnonymous: false,
    reporterName: user?.fullName || '',
    company: '',
    phone: user?.phone || '',
    email: user?.email || '',
    vehicleRegistration: '',
    reportType: MODULE_DEFAULTS[moduleName] || 'unsafe_condition',
    severity: 'medium',
    locationId: '',
    locationOther: '',
    description: '',
    latitude: '',
    longitude: '',
    occurredAt: new Date().toISOString().slice(0, 16),
    extra: {},
  });

  const applySiteCoords = (location, current) => {
    if (!location || location.latitude == null || location.longitude == null || location.latitude === '') {
      return current;
    }
    return {
      ...current,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
    };
  };

  const applyLocations = (locations) => {
    const list = Array.isArray(locations) && locations.length ? locations : FALLBACK_LOCATIONS;
    setLookups((prev) => ({ ...prev, locations: list }));
    return list;
  };

  const loadLocations = useCallback(async () => {
    const fetchJson = async (url, ms = 8000) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), ms);
      try {
        const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      const data = await fetchJson('/api/locations');
      if (data?.locations?.length) return applyLocations(data.locations);
    } catch {
      /* try lookups, then keep fallback */
    }
    try {
      const data = await fetchJson('/api/lookups');
      if (data?.locations?.length) return applyLocations(data.locations);
    } catch {
      /* keep fallback */
    }
    return applyLocations(FALLBACK_LOCATIONS);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadLocations();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, [loadLocations]);

  useEffect(() => {
    const match = lookups.locations.find((l) => l.qr_slug === qrLocation);
    if (!match) return;
    setForm((f) => (f.locationId ? f : applySiteCoords(match, { ...f, locationId: match.id })));
  }, [qrLocation, lookups.locations]);

  const selectedLoc = useMemo(
    () => lookups.locations.find((l) => l.id === form.locationId),
    [lookups, form.locationId]
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setExtra = (k, v) => setForm((f) => ({ ...f, extra: { ...f.extra, [k]: v } }));

  const captureGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        Swal.fire({ icon: 'success', title: t('report.gpsCaptured'), timer: 1400, showConfirmButton: false });
      },
      () => Swal.fire({ icon: 'info', title: t('report.gpsDenied'), confirmButtonColor: '#5C2D91' })
    );
  };

  const onFiles = (files) => {
    const list = Array.from(files || []);
    setPreviews(list.map((file) => ({ file, url: URL.createObjectURL(file) })));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('reporterCategory', category || user?.role || 'visitor');
      fd.append('isAnonymous', form.isAnonymous);
      fd.append('reporterName', form.reporterName);
      fd.append('company', form.company);
      fd.append('phone', form.phone);
      fd.append('email', form.email);
      fd.append('vehicleRegistration', form.vehicleRegistration);
      fd.append('reportType', form.reportType);
      fd.append('module', moduleName);
      fd.append('severity', form.severity);
      fd.append('locationId', form.locationId);
      fd.append('locationOther', form.locationOther);
      fd.append('description', form.description);
      fd.append('latitude', form.latitude);
      fd.append('longitude', form.longitude);
      fd.append('occurredAt', form.occurredAt);
      fd.append('extraFields', JSON.stringify(form.extra));
      previews.forEach((p) => fd.append('images', p.file));
      const { data } = await api.post('/reports', fd);
      await Swal.fire({
        icon: 'success',
        title: t('report.successTitle'),
        html: `<p>${t('report.successText')}</p><p class="report-no fs-4">${data.report.reportNo}</p>`,
        confirmButtonText: t('report.track'),
        showCancelButton: true,
        cancelButtonText: t('report.new'),
        confirmButtonColor: '#5C2D91',
      }).then((res) => {
        if (res.isConfirmed) navigate(`/track?no=${data.report.reportNo}`);
      });
      setForm((f) => ({ ...f, description: '', extra: {} }));
      setPreviews([]);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: t('common.error'),
        text: err.response?.data?.error?.message || t('common.error'),
        confirmButtonColor: '#5C2D91',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-speak p-4 p-md-5">
      <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <p className="text-uppercase small mb-1" style={{ color: 'var(--dpw-gold)' }}>
            {t(`modules.${moduleName}`)}
          </p>
          <h1 className="h3 mb-0">{t('report.title')}</h1>
        </div>
        {isPublic && (
          <Link to="/track" className="btn btn-outline-dpw">
            {t('nav.track')}
          </Link>
        )}
      </div>
      <form onSubmit={submit}>
        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="anon"
            checked={form.isAnonymous}
            onChange={(e) => set('isAnonymous', e.target.checked)}
          />
          <label className="form-check-label" htmlFor="anon">
            {t('home.anonymous')}
          </label>
        </div>
        {!form.isAnonymous && (
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">{t('report.reporterName')} <span className="text-muted">({t('report.optional')})</span></label>
              <input className="form-control" value={form.reporterName} onChange={(e) => set('reporterName', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label">{t('report.company')} <span className="text-muted">({t('report.optional')})</span></label>
              <input className="form-control" value={form.company} onChange={(e) => set('company', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">{t('report.phone')}</label>
              <input className="form-control" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">{t('report.email')}</label>
              <input className="form-control" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">{t('report.vehicle')}</label>
              <input className="form-control" value={form.vehicleRegistration} onChange={(e) => set('vehicleRegistration', e.target.value)} />
            </div>
          </div>
        )}
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <label className="form-label">{t('report.type')} *</label>
            <select className="form-select" value={form.reportType} onChange={(e) => set('reportType', e.target.value)} required>
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">{t('report.severity')} *</label>
            <select className="form-select" value={form.severity} onChange={(e) => set('severity', e.target.value)}>
              {['low', 'medium', 'high', 'critical'].map((s) => (
                <option key={s} value={s}>
                  {t(`severity.${s}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">{t('report.location')} *</label>
            <select
              className="form-select"
              value={form.locationId}
              onChange={(e) => {
                const locationId = e.target.value;
                const loc = lookups.locations.find((l) => l.id === locationId);
                setForm((f) => applySiteCoords(loc, { ...f, locationId }));
              }}
              required
            >
              <option value="">{t('report.location')}</option>
              {lookups.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {selectedLoc?.code === 'OTHER' && (
          <div className="mb-3">
            <label className="form-label">{t('report.locationOther')}</label>
            <input className="form-control" value={form.locationOther} onChange={(e) => set('locationOther', e.target.value)} />
          </div>
        )}
        {moduleName === 'forklift' && (
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">{t('report.forkliftId')}</label>
              <input className="form-control" onChange={(e) => setExtra('forkliftId', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label">{t('report.operator')}</label>
              <input className="form-control" onChange={(e) => setExtra('operator', e.target.value)} />
            </div>
          </div>
        )}
        {moduleName === 'traffic' && (
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">{t('report.vehicleType')}</label>
              <input className="form-control" onChange={(e) => setExtra('vehicleType', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label">{t('report.direction')}</label>
              <input className="form-control" onChange={(e) => setExtra('direction', e.target.value)} />
            </div>
          </div>
        )}
        {moduleName === 'damaged_container' && (
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label">{t('report.containerNo')}</label>
              <input className="form-control" onChange={(e) => setExtra('containerNo', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">{t('report.isoCode')}</label>
              <input className="form-control" onChange={(e) => setExtra('isoCode', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">{t('report.damageType')}</label>
              <input className="form-control" onChange={(e) => setExtra('damageType', e.target.value)} />
            </div>
          </div>
        )}
        {(moduleName === 'warehouse' || moduleName === 'container_yard') && (
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label">{t('report.aisle')}</label>
              <input className="form-control" onChange={(e) => setExtra('aisle', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">{t('report.rack')}</label>
              <input className="form-control" onChange={(e) => setExtra('rack', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">{t('report.loadType')}</label>
              <input className="form-control" onChange={(e) => setExtra('loadType', e.target.value)} />
            </div>
          </div>
        )}
        <div className="mb-3">
          <label className="form-label">{t('report.description')} *</label>
          <textarea className="form-control" rows="4" required minLength={10} value={form.description} onChange={(e) => set('description', e.target.value)} />
          <div className="form-text">{t('report.descriptionHelp')}</div>
        </div>
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label">{t('report.occurredAt')}</label>
            <input type="datetime-local" className="form-control" value={form.occurredAt} onChange={(e) => set('occurredAt', e.target.value)} />
          </div>
          <div className="col-md-6">
            <label className="form-label">{t('report.gps')}</label>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-dpw" onClick={captureGps}>
                {t('report.captureGps')}
              </button>
              {form.latitude && (
                <span className="align-self-center small report-no">
                  {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
                </span>
              )}
            </div>
          </div>
        </div>
        {form.latitude && form.longitude ? (
          <div className="mb-3">
            <ReportMap lat={Number(form.latitude)} lng={Number(form.longitude)} label={selectedLoc?.name} />
          </div>
        ) : null}
        <div className="mb-4">
          <label className="form-label">{t('report.images')}</label>
          <div className="d-flex flex-wrap gap-2 mb-2">
            <label
              className="btn btn-outline-dpw btn-icon-action mb-0"
              data-tooltip={t('report.camera')}
              aria-label={t('report.camera')}
            >
              <i className="fa-solid fa-camera" aria-hidden="true" />
              <input type="file" accept="image/*" capture="environment" hidden multiple onChange={(e) => onFiles(e.target.files)} />
            </label>
            <label
              className="btn btn-outline-dpw btn-icon-action mb-0"
              data-tooltip={t('report.gallery')}
              aria-label={t('report.gallery')}
            >
              <i className="fa-solid fa-upload" aria-hidden="true" />
              <input type="file" accept="image/*" hidden multiple onChange={(e) => onFiles(e.target.files)} />
            </label>
          </div>
          <div className="row g-2">
            {previews.map((p) => (
              <div className="col-4 col-md-2" key={p.url}>
                <img src={p.url} alt="" className="gallery-thumb" />
              </div>
            ))}
          </div>
        </div>
        <button
          className="btn btn-dpw btn-lg btn-icon-action"
          disabled={busy}
          type="submit"
          data-tooltip={busy ? t('report.submitting') : t('report.submit')}
          aria-label={busy ? t('report.submitting') : t('report.submit')}
        >
          {busy ? (
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
          ) : (
            <i className="fa-solid fa-paper-plane" aria-hidden="true" />
          )}
        </button>
      </form>
    </div>
  );
}
