import { useState, useEffect, useCallback } from 'react';
import { TimeEntry } from '@/types';

const STORAGE_KEY = 'cleantrack_offline_entries';

export function useOfflineStorage() {
  const [pendingEntries, setPendingEntries] = useState<TimeEntry[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setPendingEntries(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveEntry = useCallback((entry: TimeEntry) => {
    const newEntries = [...pendingEntries, { ...entry, synced: false }];
    setPendingEntries(newEntries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
  }, [pendingEntries]);

  const updateEntry = useCallback((id: string, updates: Partial<TimeEntry>) => {
    const newEntries = pendingEntries.map(e => 
      e.id === id ? { ...e, ...updates } : e
    );
    setPendingEntries(newEntries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
  }, [pendingEntries]);

  const markAsSynced = useCallback((ids: string[]) => {
    const newEntries = pendingEntries.filter(e => !ids.includes(e.id));
    setPendingEntries(newEntries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
  }, [pendingEntries]);

  const getPendingCount = useCallback(() => {
    return pendingEntries.filter(e => !e.synced).length;
  }, [pendingEntries]);

  return {
    pendingEntries,
    isOnline,
    saveEntry,
    updateEntry,
    markAsSynced,
    getPendingCount,
  };
}
