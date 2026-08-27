import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const RECEIVERS = ['safety_officer', 'safety_manager', 'administrator'];
const POLL_MS = 12000;

function storageKey(userId) {
  return `speakup_seen_report_ids_${userId}`;
}

function loadSeen(userId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey(userId)) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSeen(userId, ids) {
  localStorage.setItem(storageKey(userId), JSON.stringify([...ids].slice(-400)));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rankSeverity(value) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[value] || 0;
}

export default function IncomingReportAlerts() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pending, setPending] = useState(0);
  const seenRef = useRef(null);
  const busyRef = useRef(false);
  const titleRef = useRef(document.title);

  useEffect(() => {
    if (!RECEIVERS.includes(user?.role)) return undefined;
    seenRef.current = loadSeen(user.id);
    titleRef.current = document.title;

    const tick = async () => {
      if (busyRef.current || Swal.isVisible()) return;
      try {
        const { data } = await api.get('/reports');
        const reports = data.reports || [];
        const seen = seenRef.current;
        if (!seen.size) {
          reports.forEach((r) => seen.add(r.id));
          saveSeen(user.id, seen);
          return;
        }
        const fresh = reports
          .filter((r) => !seen.has(r.id) && r.reporterUserId !== user.id)
          .sort((a, b) => rankSeverity(b.severity) - rankSeverity(a.severity) || new Date(b.createdAt) - new Date(a.createdAt));
        if (!fresh.length) return;

        busyRef.current = true;
        setPending(fresh.length);
        document.title = t('alerts.pageTitle');
        const top = fresh[0];
        const urgent = rankSeverity(top.severity) >= 3;
        const extra = fresh.length > 1 ? t('alerts.more', { count: fresh.length - 1 }) : '';
        const snippet = escapeHtml((top.description || '').slice(0, 180));
        const result = await Swal.fire({
          toast: false,
          allowOutsideClick: false,
          backdrop: true,
          customClass: { popup: `swal-speakup-alert ${urgent ? 'is-urgent' : ''}` },
          showClass: { popup: 'swal2-show' },
          html: `
            <div class="hazard-stripe swal-hazard-stripe"></div>
            <p class="swal-kicker">${escapeHtml(t('alerts.kicker'))}</p>
            <h2 class="swal-alert-title">${escapeHtml(t('alerts.title'))}</h2>
            <p class="swal-report-no">${escapeHtml(top.reportNo)}</p>
            <p class="swal-meta">
              <span class="badge-sev sev-${escapeHtml(top.severity)}">${escapeHtml(t(`severity.${top.severity}`, top.severity))}</span>
              <span>${escapeHtml(top.locationName || '')}</span>
            </p>
            <p class="swal-desc">${snippet}${top.description?.length > 180 ? '…' : ''}</p>
            ${extra ? `<p class="swal-more">${escapeHtml(extra)}</p>` : ''}
          `,
          showCancelButton: true,
          confirmButtonText: t('alerts.open'),
          cancelButtonText: t('alerts.dismiss'),
          confirmButtonColor: urgent ? '#b42318' : '#5C2D91',
          cancelButtonColor: '#6c757d',
          focusConfirm: true,
        });

        fresh.forEach((r) => seen.add(r.id));
        saveSeen(user.id, seen);
        setPending(0);
        document.title = titleRef.current;
        window.dispatchEvent(new CustomEvent('speakup:reports-updated'));
        if (result.isConfirmed) navigate(`/app/reports/${top.id}`);
      } catch {
        /* keep polling */
      } finally {
        busyRef.current = false;
      }
    };

    tick();
    const timer = setInterval(tick, POLL_MS);
    return () => {
      clearInterval(timer);
      document.title = titleRef.current;
    };
  }, [user?.id, user?.role, navigate, t]);

  if (!RECEIVERS.includes(user?.role)) return null;

  return (
    <span className={`live-pill ${pending ? 'has-pending' : ''}`} title={t('alerts.liveHint')}>
      <span className="live-dot" />
      {t('alerts.live')}
      {pending > 0 ? <span className="live-count">{pending}</span> : null}
    </span>
  );
}
