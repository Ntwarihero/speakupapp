import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSession } from '../context/SessionContext';

const MODULES = ['general', 'forklift', 'traffic', 'container_yard', 'warehouse', 'damaged_container'];
const ICONS = ['bi-exclamation-triangle', 'bi-truck', 'bi-stoplights', 'bi-box-seam', 'bi-building', 'bi-exclamation-octagon'];

export default function PublicHome() {
  const { t } = useTranslation();
  const { category } = useSession();

  return (
    <div>
      <h1 className="h2 mb-2">{t('home.publicTitle')}</h1>
      <p className="text-muted mb-4">
        {t('home.publicLead')} {category && <strong>— {t(`roles.${category}`)}</strong>}
      </p>
      <div className="row g-3 mb-4">
        {MODULES.map((m, i) => (
          <div className="col-12 col-md-6 col-xl-4" key={m}>
            <Link to={`/report?module=${m}`} className="text-decoration-none">
              <div className="card-speak p-4 module-tile h-100">
                <i className={`bi ${ICONS[i]} fs-3`} style={{ color: '#5C2D91' }} />
                <h2 className="h5 mt-2 mb-0" style={{ color: 'var(--ink)' }}>
                  {t(`modules.${m}`)}
                </h2>
              </div>
            </Link>
          </div>
        ))}
      </div>
      <div className="card-speak p-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <div className="fw-semibold">{t('home.trackCta')}</div>
        </div>
        <Link to="/track" className="btn btn-dpw">
          {t('home.trackBtn')}
        </Link>
      </div>
    </div>
  );
}
