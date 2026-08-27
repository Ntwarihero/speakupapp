import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

export default function SetPassword() {
  const { t } = useTranslation();
  const { changePassword, user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      Swal.fire({
        icon: 'error',
        title: t('auth.setPasswordMismatch'),
        confirmButtonColor: '#5C2D91',
      });
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      await Swal.fire({
        icon: 'success',
        title: t('auth.setPasswordDone'),
        confirmButtonColor: '#5C2D91',
      });
      navigate('/app', { replace: true });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: t('auth.failed'),
        text: err.response?.data?.error?.message || t('common.error'),
        confirmButtonColor: '#5C2D91',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-speak p-4 p-md-5 mx-auto" style={{ maxWidth: 480 }}>
      <h1 className="h3 mb-2">{t('auth.setPasswordTitle')}</h1>
      <p className="text-muted">{t('auth.setPasswordText', { name: user?.fullName?.split(' ')[0] || '' })}</p>
      <form onSubmit={submit} className="mt-4">
        <label className="form-label" htmlFor="currentPassword">
          {t('auth.currentPassword')}
        </label>
        <input
          id="currentPassword"
          type="password"
          className="form-control mb-3"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <label className="form-label" htmlFor="newPassword">
          {t('auth.newPassword')}
        </label>
        <input
          id="newPassword"
          type="password"
          className="form-control mb-3"
          autoComplete="new-password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <label className="form-label" htmlFor="confirmPassword">
          {t('auth.confirmPassword')}
        </label>
        <input
          id="confirmPassword"
          type="password"
          className="form-control mb-4"
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <button className="btn btn-dpw w-100" disabled={busy} type="submit">
          {busy ? t('common.loading') : t('auth.setPasswordSave')}
        </button>
      </form>
    </div>
  );
}
