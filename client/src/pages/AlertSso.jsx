import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import BrandMark from '../components/BrandMark';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { rememberNextPath } from '../utils/safePath';

export default function AlertSso() {
  const { t } = useTranslation();
  const { ready, consumeAlertLink } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('t');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return undefined;
    if (!token) {
      navigate('/login', { replace: true });
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await consumeAlertLink(token);
        if (cancelled) return;
        const dest = `/app/reports/${data.reportId}`;
        if (data.user?.mustChangePassword) {
          rememberNextPath(dest);
          navigate('/app/set-password', { replace: true });
          return;
        }
        navigate(dest, { replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.error?.message || t('auth.alertLinkFailed'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, token, consumeAlertLink, navigate, t]);

  return (
    <div className="welcome-shell min-vh-100">
      <div className="hazard-stripe" />
      <div className="container py-4 d-flex justify-content-between">
        <BrandMark light compact />
        <LanguageSwitcher />
      </div>
      <div className="container pb-5">
        <div className="card-speak p-4 p-md-5 mx-auto text-center" style={{ maxWidth: 460 }}>
          {error ? (
            <>
              <h1 className="h3 mb-2">{t('auth.alertLinkTitle')}</h1>
              <p className="text-muted">{error}</p>
              <Link className="btn btn-dpw mt-3" to="/login">
                {t('auth.backToLogin')}
              </Link>
            </>
          ) : (
            <>
              <div className="spinner-border mb-3" style={{ color: '#5C2D91' }} role="status" />
              <h1 className="h4 mb-2">{t('auth.alertLinkTitle')}</h1>
              <p className="text-muted mb-0">{t('auth.alertLinkText')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
