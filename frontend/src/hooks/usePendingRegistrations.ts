import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { adminRegistrationApi } from '../api/client';

export function usePendingRegistrations(): number {
  const [count, setCount] = useState(0);
  const location = useLocation();

  const fetch = useCallback(() => {
    adminRegistrationApi.getPendingCount()
      .then((r) => setCount(r.data.data.count))
      .catch(() => { /* fail silently — badge disappears */ });
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, [fetch]);

  // Re-fetch when navigating to registrations page
  useEffect(() => {
    if (location.pathname === '/admin/registrations') fetch();
  }, [location.pathname, fetch]);

  return count;
}
