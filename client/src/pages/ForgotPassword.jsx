import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import api from '../services/api';
import BrandMark from '../components/BrandMark';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const fail = (err) => {
    Swal.fire({
      icon: 'error',
      title: t('auth.resetFailed'),
      text: err.response?.data?.error?.message || t('common.error'),
      confirmButtonColor: '#5C2D91',
    });
  };

  const requestCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { username });
      if (data.challengeId) {
        setChallengeId(data.challengeId);
        setEmailHint(data.emailHint || '');
        setCooldown(60);
      } else {
        Swal.fire({
          icon: 'success',
          title: t('auth.resetSentTitle'),
          text: t('auth.resetSentText'),
          confirmButtonColor: '#5C2D91',
        });
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { username });
      if (data.challengeId) {
        setChallengeId(data.challengeId);
        setEmailHint(data.emailHint || emailHint);
        setOtp('');
        setCooldown(60);
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e) => {
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
      await api.post('/auth/reset-password', {
        challengeId,
        otp,
        newPassword,
      });
      await Swal.fire({
        icon: 'success',
        title: t('auth.resetDone'),
        text: t('auth.resetDoneText'),
        confirmButtonColor: '#5C2D91',
      });
      navigate('/login');
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
              <h1 className="h3 mb-2">{t('auth.forgotTitle')}</h1>
              <p className="text-muted">{t('auth.forgotText')}</p>
              <form onSubmit={requestCode} className="mt-4">
                <label className="form-label" htmlFor="resetUser">
                  {t('auth.forgotIdentifier')}
                </label>
                <input
                  id="resetUser"
                  className="form-control mb-4"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <button className="btn btn-dpw w-100 mb-3" disabled={busy} type="submit">
                  {busy ? t('common.loading') : t('auth.forgotSubmit')}
                </button>
                <Link to="/login" className="d-block text-center">
                  {t('auth.backToLogin')}
                </Link>
              </form>
            </>
          ) : (
            <>
              <h1 className="h3 mb-2">{t('auth.resetTitle')}</h1>
              <p className="text-muted">{t('auth.otpText', { email: emailHint })}</p>
              <form onSubmit={submitReset} className="mt-4">
                <label className="form-label" htmlFor="resetOtp">
                  {t('auth.otpLabel')}
                </label>
                <input
                  id="resetOtp"
                  className="form-control mb-3 text-center"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  style={{ letterSpacing: '0.4em', fontSize: '1.4rem', fontWeight: 700 }}
                />
                <label className="form-label" htmlFor="resetPassword">
                  {t('auth.newPassword')}
                </label>
                <div className="input-group mb-3">
                  <input
                    id="resetPassword"
                    type={show ? 'text' : 'password'}
                    className="form-control"
                    autoComplete="new-password"
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShow((s) => !s)}>
                    {show ? t('auth.hide') : t('auth.show')}
                  </button>
                </div>
                <label className="form-label" htmlFor="resetConfirm">
                  {t('auth.confirmPassword')}
                </label>
                <input
                  id="resetConfirm"
                  type={show ? 'text' : 'password'}
                  className="form-control mb-4"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                <button className="btn btn-dpw w-100 mb-2" disabled={busy || otp.length !== 6} type="submit">
                  {busy ? t('common.loading') : t('auth.resetSave')}
                </button>
                <button className="btn btn-outline-dpw w-100 mb-3" type="button" disabled={busy || cooldown > 0} onClick={resend}>
                  {cooldown > 0 ? t('auth.otpWait', { seconds: cooldown }) : t('auth.otpResend')}
                </button>
                <Link to="/login" className="d-block text-center">
                  {t('auth.backToLogin')}
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
