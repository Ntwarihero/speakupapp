import { useTranslation } from 'react-i18next';

export function SeverityBadge({ value }) {
  const { t } = useTranslation();
  return <span className={`badge-sev sev-${value}`}>{t(`severity.${value}`, value)}</span>;
}

export function StatusBadge({ value }) {
  const { t } = useTranslation();
  return <span className={`badge-status st-${value}`}>{t(`status.${value}`, value)}</span>;
}
