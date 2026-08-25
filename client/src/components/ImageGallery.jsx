import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ImageGallery({ images = [] }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(null);
  if (!images.length) return null;

  return (
    <>
      <div className="row g-2">
        {images.map((img) => (
          <div className="col-4 col-md-3" key={img.id}>
            <button type="button" className="btn p-0 w-100" onClick={() => setActive(img)}>
              <img
                className="gallery-thumb"
                src={`/api/files/${img.storage_path}`}
                alt={img.file_name}
              />
            </button>
          </div>
        ))}
      </div>
      {active && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(30,18,51,0.72)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{active.file_name}</h5>
                <button type="button" className="btn-close" aria-label={t('common.close')} onClick={() => setActive(null)} />
              </div>
              <div className="modal-body text-center">
                <img src={`/api/files/${active.storage_path}`} alt={active.file_name} className="img-fluid rounded" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
