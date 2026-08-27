import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import BrandMark from '../components/BrandMark';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Login() {
  const { t } = useTranslation();
  const { login, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const fail = (err) => {
    Swal.fire({
      icon: 'error',
      title: t('auth.failed'),
      text: err.response?.data?.error?.message || t('common.error'),
      confirmButtonColor: '#5C2D91',
    });
  };

  const submitCredentials = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await login(username, password);
      if (data?.requiresOtp) {
        setChallengeId(data.challengeId);
        setEmailHint(data.emailHint || '');
        setCooldown(60);
        return;
      }
      navigate('/app');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await verifyOtp(challengeId, otp);
      navigate(user?.mustChangePassword ? '/app/set-password' : '/app');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown || !challengeId) return;
    setBusy(true);
    try {
      const data = await resendOtp(challengeId);
      setChallengeId(data.challengeId);
      setEmailHint(data.emailHint || emailHint);
      setOtp('');
      setCooldown(60);
    } catch (err) {
      fail(err);
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
          {!challengeId ? (
            <>
              <h1 className="h3 mb-2">{t('auth.title')}</h1>
              <p className="text-muted">{t('auth.subtitle')}</p>
              <form onSubmit={submitCredentials} className="mt-4">
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
                <div className="text-center mt-3">
                  <Link to="/forgot-password">{t('auth.forgotLink')}</Link>
                </div>
              </form>
            </>
          ) : (
            <>
              <h1 className="h3 mb-2">{t('auth.otpTitle')}</h1>
              <p className="text-muted">{t('auth.otpText', { email: emailHint })}</p>
              <form onSubmit={submitOtp} className="mt-4">
                <label className="form-label" htmlFor="otp">
                  {t('auth.otpLabel')}
                </label>
                <input
                  id="otp"
                  className="form-control mb-3 text-center"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  style={{ letterSpacing: '0.4em', fontSize: '1.4rem', fontWeight: 700 }}
                />
                <button className="btn btn-dpw w-100 mb-2" disabled={busy || otp.length !== 6} type="submit">
                  {busy ? t('common.loading') : t('auth.otpConfirm')}
                </button>
                <button className="btn btn-outline-dpw w-100" type="button" disabled={busy || cooldown > 0} onClick={resend}>
                  {cooldown > 0 ? t('auth.otpWait', { seconds: cooldown }) : t('auth.otpResend')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
