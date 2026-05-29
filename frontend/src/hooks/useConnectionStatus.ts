import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export type ConnectionStatus = 'online' | 'warning' | 'offline';

export function useConnectionStatus(intervalSeconds = 8) {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const centralHealth = await api.getCentralHealth();
      const s = centralHealth.status;
      if (s === 'online' || s === 'warning' || s === 'offline') {
        setStatus(s as ConnectionStatus);
      } else {
        setStatus('offline');
      }
      setLastCheck(new Date());
    } catch {
      setStatus('offline');
      setLastCheck(new Date());
    }
  }, []);

  const syncFromCentral = useCallback(async () => {
    try {
      await api.syncFromCentral();
      window.dispatchEvent(new CustomEvent('sync-from-central'));
    } catch (error) {
      console.error('Error syncing from central:', error);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, intervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [checkStatus, intervalSeconds]);

  const isOnline = status === 'online';

  return { status, isOnline, lastCheck, checkStatus, syncFromCentral };
}
