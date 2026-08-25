import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import BrandMark from '../components/BrandMark';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(username, password);
      navigate('/app');
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
    <div className="welcome-shell min-vh-100">
      <div className="hazard-stripe" />
      <div className="container py-4 d-flex justify-content-between">
        <BrandMark light compact />
        <LanguageSwitcher />
      </div>
      <div className="container pb-5">
        <div className="card-speak p-4 p-md-5 mx-auto" style={{ maxWidth: 460 }}>
          <h1 className="h3 mb-2">{t('auth.title')}</h1>
          <p className="text-muted">{t('auth.subtitle')}</p>
          <form onSubmit={submit} className="mt-4">
            <label className="form-label" htmlFor="username">
              {t('auth.username')}
            </label>
            <input
              id="username"
              className="form-control mb-3"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label className="form-label" htmlFor="password">
              {t('auth.password')}
            </label>
            <div className="input-group mb-4">
              <input
                id="password"
                type={show ? 'text' : 'password'}
                className="form-control"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShow((s) => !s)}>
                {show ? t('auth.hide') : t('auth.show')}
              </button>
            </div>
            <button className="btn btn-dpw w-100" disabled={busy} type="submit">
              {busy ? t('common.loading') : t('auth.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
