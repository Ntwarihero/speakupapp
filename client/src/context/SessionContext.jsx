import { createContext, useContext, useMemo, useState } from 'react';

const PUBLIC = ['visitor', 'customer', 'contractor', 'driver', 'employee'];
const INTERNAL = ['safety_officer', 'safety_manager', 'administrator'];

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [category, setCategoryState] = useState(() => localStorage.getItem('speakup_category'));
  const [qrLocation, setQrLocation] = useState(() => localStorage.getItem('speakup_qr_loc'));

  const setCategory = (value) => {
    localStorage.setItem('speakup_category', value);
    setCategoryState(value);
  };

  const rememberQr = (slug) => {
    if (!slug) return;
    localStorage.setItem('speakup_qr_loc', slug);
    setQrLocation(slug);
  };

  const value = useMemo(
    () => ({
      category,
      setCategory,
      qrLocation,
      rememberQr,
      isPublic: PUBLIC.includes(category),
      isInternal: INTERNAL.includes(category),
    }),
    [category, qrLocation]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

export { PUBLIC, INTERNAL };
