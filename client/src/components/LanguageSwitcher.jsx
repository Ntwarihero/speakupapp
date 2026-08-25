import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'rw', label: 'Kinyarwanda' },
  { code: 'sw', label: 'Kiswahili' },
];

export default function LanguageSwitcher({ variant = 'light' }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  return (
    <div className="dropdown" onClick={(e) => e.stopPropagation()}>
      <button
        className={`btn btn-sm ${variant === 'light' ? 'btn-outline-light' : 'btn-outline-dpw'}`}
        type="button"
        aria-label={t('nav.language')}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bi bi-translate me-1" />
        {LANGS.find((l) => l.code === i18n.language)?.label || 'English'}
      </button>
      {open && (
        <ul className="dropdown-menu show mt-1">
          {LANGS.map((l) => (
            <li key={l.code}>
              <button
                className={`dropdown-item ${i18n.language === l.code ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  i18n.changeLanguage(l.code);
                  setOpen(false);
                }}
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { LANGS };
