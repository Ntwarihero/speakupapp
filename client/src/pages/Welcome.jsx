import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import BrandMark from '../components/BrandMark';
import { LANGS } from '../components/LanguageSwitcher';
import { useSession, PUBLIC } from '../context/SessionContext';

const ROLE_ORDER = [
  'visitor',
  'customer',
  'contractor',
  'driver',
  'employee',
  'safety_officer',
  'safety_manager',
  'administrator',
];

export default function Welcome() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setCategory, rememberQr, qrLocation } = useSession();
  const loc = params.get('loc');
  const [picked, setPicked] = useState(i18n.language);

  useEffect(() => {
    if (loc) rememberQr(loc);
  }, [loc, rememberQr]);

  const askWho = async () => {
    i18n.changeLanguage(picked);
    const options = Object.fromEntries(ROLE_ORDER.map((r) => [r, t(`roles.${r}`)]));
    const result = await Swal.fire({
      title: t('identify.title'),
      text: t('identify.text'),
      input: 'select',
      inputOptions: options,
      inputPlaceholder: t('identify.title'),
      confirmButtonText: t('identify.confirm'),
      confirmButtonColor: '#5C2D91',
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    if (!result.value) return;
    setCategory(result.value);
    if (PUBLIC.includes(result.value)) navigate('/home');
    else navigate('/login');
  };

  return (
    <div className="welcome-shell d-flex flex-column">
      <div className="hazard-stripe" />
      <div className="container py-4 py-lg-5 flex-grow-1 d-flex flex-column justify-content-center">
        <div className="d-flex justify-content-between align-items-start mb-4">
          <BrandMark light />
        </div>
        <p className="text-uppercase small mb-2" style={{ letterSpacing: '0.18em', color: '#C9A84C' }}>
          {t('welcome.kicker')}
        </p>
        <h1 className="display mb-3" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', maxWidth: 820 }}>
          {t('welcome.title')}
        </h1>
        <p className="lead mb-4" style={{ maxWidth: 640, color: 'rgba(255,255,255,0.82)' }}>
          {t('welcome.subtitle')}
        </p>
        {(loc || qrLocation) && (
          <div className="alert mb-4" style={{ background: 'rgba(201,168,76,0.15)', color: '#fff', border: '1px solid rgba(201,168,76,0.4)' }}>
            {t('welcome.qrHint')} {t('welcome.atLocation')}: <strong>{loc || qrLocation}</strong>
          </div>
        )}
        <h2 className="h5 mb-3">{t('welcome.chooseLanguage')}</h2>
        <div className="row g-3 mb-4" style={{ maxWidth: 720 }}>
          {LANGS.map((l) => (
            <div className="col-6 col-md-3" key={l.code}>
              <button
                type="button"
                className={`lang-tile ${picked === l.code ? 'active' : ''}`}
                onClick={() => setPicked(l.code)}
              >
                {l.label}
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-gold btn-lg px-4 align-self-start" onClick={askWho}>
          {t('welcome.continue')}
        </button>
      </div>
    </div>
  );
}
