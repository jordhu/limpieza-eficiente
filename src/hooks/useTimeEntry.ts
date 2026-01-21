import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ActiveEntry {
  id: string;
  locationId: string;
  locationName: string;
  startTime: Date;
  isOffline?: boolean;
}

interface CompletedEntry {
  id: string;
  locationName: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

interface LocationData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  qr_code: string;
}

interface PendingEntry {
  id: string;
  userId: string;
  locationId: string;
  locationName: string;
  startTime: string;
  endTime?: string;
  startMethod: 'qr' | 'gps' | 'manual';
  endMethod?: 'qr' | 'gps' | 'manual';
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
}

const OFFLINE_STORAGE_KEY = 'cleantrack_pending_entries';
const ACTIVE_ENTRY_KEY = 'cleantrack_active_entry';

export function useTimeEntry() {
  const { user } = useAuth();
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<CompletedEntry[]>([]);
  const [pendingSync, setPendingSync] = useState<PendingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingEntries();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending entries and active entry from localStorage on mount
  useEffect(() => {
    const storedPending = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (storedPending) {
      setPendingSync(JSON.parse(storedPending));
    }

    const storedActive = localStorage.getItem(ACTIVE_ENTRY_KEY);
    if (storedActive) {
      const parsed = JSON.parse(storedActive);
      setActiveEntry({
        ...parsed,
        startTime: new Date(parsed.startTime),
      });
    }
  }, []);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lng2 - lng1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  // Validate QR code and check GPS proximity
  const validateLocation = useCallback(
    async (
      qrCode: string,
      userLat: number | null,
      userLng: number | null
    ): Promise<{ valid: boolean; location: LocationData | null; error?: string }> => {
      try {
        // Find location by QR code
        const { data: location, error } = await supabase
          .from('work_locations')
          .select('*')
          .eq('qr_code', qrCode)
          .single();

        if (error || !location) {
          return { valid: false, location: null, error: 'Código QR no válido' };
        }

        // Check GPS proximity
        if (userLat === null || userLng === null) {
          return {
            valid: false,
            location: location as LocationData,
            error: 'No se pudo obtener tu ubicación GPS',
          };
        }

        const distance = calculateDistance(
          userLat,
          userLng,
          location.latitude,
          location.longitude
        );

        if (distance > location.radius_meters) {
          return {
            valid: false,
            location: location as LocationData,
            error: `Estás a ${Math.round(distance)}m de la ubicación. Máximo permitido: ${location.radius_meters}m`,
          };
        }

        return { valid: true, location: location as LocationData };
      } catch (err) {
        console.error('Error validating location:', err);
        return { valid: false, location: null, error: 'Error al validar ubicación' };
      }
    },
    [calculateDistance]
  );

  // Sync pending entries when online
  const syncPendingEntries = useCallback(async () => {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (!stored) return;

    const pending: PendingEntry[] = JSON.parse(stored);
    if (pending.length === 0) return;

    console.log('Syncing', pending.length, 'pending entries...');

    const successfulIds: string[] = [];

    for (const entry of pending) {
      try {
        if (entry.endTime) {
          // This is a completed entry
          const { error } = await supabase
            .from('time_entries')
            .insert({
              user_id: entry.userId,
              location_id: entry.locationId,
              start_time: entry.startTime,
              end_time: entry.endTime,
              start_method: entry.startMethod,
              end_method: entry.endMethod,
              start_lat: entry.startLat,
              start_lng: entry.startLng,
              end_lat: entry.endLat,
              end_lng: entry.endLng,
              synced: true,
            });

          if (!error) {
            successfulIds.push(entry.id);
          }
        }
      } catch (err) {
        console.error('Error syncing entry:', err);
      }
    }

    if (successfulIds.length > 0) {
      const remaining = pending.filter(e => !successfulIds.includes(e.id));
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(remaining));
      setPendingSync(remaining);
      toast.success(`${successfulIds.length} fichajes sincronizados`);
    }
  }, []);

  // Fetch today's entries (completed + active)
  const fetchTodayEntries = useCallback(async () => {
    if (!user) return;

    // Load from localStorage first for offline support
    const storedActive = localStorage.getItem(ACTIVE_ENTRY_KEY);
    if (storedActive) {
      const parsed = JSON.parse(storedActive);
      if (parsed.userId === user.id) {
        setActiveEntry({
          ...parsed,
          startTime: new Date(parsed.startTime),
        });
      }
    }

    if (!navigator.onLine) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          location_id,
          start_time,
          end_time,
          work_locations (name)
        `)
        .eq('user_id', user.id)
        .gte('start_time', todayISO)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching today entries:', error);
        return;
      }

      const completed: CompletedEntry[] = [];
      let active: ActiveEntry | null = null;

      data?.forEach((entry) => {
        const locationName = (entry.work_locations as any)?.name || 'Ubicación desconocida';
        
        if (entry.end_time) {
          const start = new Date(entry.start_time);
          const end = new Date(entry.end_time);
          const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
          
          completed.push({
            id: entry.id,
            locationName,
            startTime: start,
            endTime: end,
            durationMinutes,
          });
        } else {
          active = {
            id: entry.id,
            locationId: entry.location_id || '',
            locationName,
            startTime: new Date(entry.start_time),
          };
        }
      });

      setTodayEntries(completed);
      if (active) {
        setActiveEntry(active);
        localStorage.setItem(ACTIVE_ENTRY_KEY, JSON.stringify({
          ...active,
          userId: user.id,
          startTime: active.startTime.toISOString(),
        }));
      }
    } catch (err) {
      console.error('Error fetching today entries:', err);
    }
  }, [user]);

  // Check for active entry on mount (legacy - now use fetchTodayEntries)
  const checkActiveEntry = useCallback(async () => {
    await fetchTodayEntries();
  }, [fetchTodayEntries]);

  // Clock in (with offline support)
  const clockIn = useCallback(
    async (
      qrCode: string,
      userLat: number | null,
      userLng: number | null,
      method: 'qr' | 'gps' | 'manual'
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      // Check if already clocked in somewhere
      if (activeEntry) {
        return { success: false, error: `Ya tienes un fichaje activo en ${activeEntry.locationName}. Primero debes fichar salida.` };
      }

      setLoading(true);

      try {
        // Validate location (skip validation in offline mode or manual mode)
        let location: LocationData | null = null;
        
        if (navigator.onLine && method === 'qr') {
          const validation = await validateLocation(qrCode, userLat, userLng);
          
          if (!validation.valid || !validation.location) {
            setLoading(false);
            return { success: false, error: validation.error };
          }
          location = validation.location;
        } else {
          // For manual or offline, get location from cache
          const cached = localStorage.getItem('cleantrack_locations_cache');
          if (cached) {
            const locations = JSON.parse(cached);
            location = locations.find((l: any) => l.qr_code === qrCode || l.id === qrCode);
          }
        }

        if (!location) {
          setLoading(false);
          return { success: false, error: 'Ubicación no encontrada' };
        }

        const entryId = crypto.randomUUID();
        const startTime = new Date();

        if (navigator.onLine) {
          // Create time entry in database
          const { data, error } = await supabase
            .from('time_entries')
            .insert({
              user_id: user.id,
              location_id: location.id,
              start_time: startTime.toISOString(),
              start_method: method,
              start_lat: userLat,
              start_lng: userLng,
              synced: true,
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating time entry:', error);
            setLoading(false);
            return { success: false, error: 'Error al registrar entrada' };
          }

          const newActive: ActiveEntry = {
            id: data.id,
            locationId: location.id,
            locationName: location.name,
            startTime: new Date(data.start_time),
          };

          setActiveEntry(newActive);
          localStorage.setItem(ACTIVE_ENTRY_KEY, JSON.stringify({
            ...newActive,
            userId: user.id,
            startTime: newActive.startTime.toISOString(),
          }));
        } else {
          // Offline mode: save locally
          const newActive: ActiveEntry = {
            id: entryId,
            locationId: location.id,
            locationName: location.name,
            startTime,
            isOffline: true,
          };

          setActiveEntry(newActive);
          localStorage.setItem(ACTIVE_ENTRY_KEY, JSON.stringify({
            ...newActive,
            userId: user.id,
            startTime: startTime.toISOString(),
            startLat: userLat,
            startLng: userLng,
            startMethod: method,
          }));
        }

        setLoading(false);
        return { success: true };
      } catch (err) {
        console.error('Clock in error:', err);
        setLoading(false);
        return { success: false, error: 'Error al registrar entrada' };
      }
    },
    [user, validateLocation, activeEntry]
  );

  // Manual clock in (select from list)
  const clockInManual = useCallback(
    async (
      locationId: string,
      locationName: string,
      userLat: number | null,
      userLng: number | null
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      if (activeEntry) {
        return { success: false, error: `Ya tienes un fichaje activo en ${activeEntry.locationName}. Primero debes fichar salida.` };
      }

      setLoading(true);

      const entryId = crypto.randomUUID();
      const startTime = new Date();

      if (navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('time_entries')
            .insert({
              user_id: user.id,
              location_id: locationId,
              start_time: startTime.toISOString(),
              start_method: 'manual',
              start_lat: userLat,
              start_lng: userLng,
              synced: true,
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating time entry:', error);
            setLoading(false);
            return { success: false, error: 'Error al registrar entrada' };
          }

          const newActive: ActiveEntry = {
            id: data.id,
            locationId,
            locationName,
            startTime: new Date(data.start_time),
          };

          setActiveEntry(newActive);
          localStorage.setItem(ACTIVE_ENTRY_KEY, JSON.stringify({
            ...newActive,
            userId: user.id,
            startTime: newActive.startTime.toISOString(),
          }));
        } catch (err) {
          console.error('Clock in error:', err);
          setLoading(false);
          return { success: false, error: 'Error al registrar entrada' };
        }
      } else {
        // Offline mode
        const newActive: ActiveEntry = {
          id: entryId,
          locationId,
          locationName,
          startTime,
          isOffline: true,
        };

        setActiveEntry(newActive);
        localStorage.setItem(ACTIVE_ENTRY_KEY, JSON.stringify({
          ...newActive,
          userId: user.id,
          startTime: startTime.toISOString(),
          startLat: userLat,
          startLng: userLng,
          startMethod: 'manual',
        }));
      }

      setLoading(false);
      return { success: true };
    },
    [user, activeEntry]
  );

  // Clock out (with offline support)
  const clockOut = useCallback(
    async (
      userLat: number | null,
      userLng: number | null,
      method: 'qr' | 'gps' | 'manual'
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user || !activeEntry) {
        return { success: false, error: 'No hay fichaje activo' };
      }

      setLoading(true);

      try {
        const endTime = new Date();
        
        if (navigator.onLine && !activeEntry.isOffline) {
          const { error } = await supabase
            .from('time_entries')
            .update({
              end_time: endTime.toISOString(),
              end_method: method,
              end_lat: userLat,
              end_lng: userLng,
            })
            .eq('id', activeEntry.id);

          if (error) {
            console.error('Error updating time entry:', error);
            setLoading(false);
            return { success: false, error: 'Error al registrar salida' };
          }
        } else {
          // Offline: save complete entry to pending sync
          const storedActive = localStorage.getItem(ACTIVE_ENTRY_KEY);
          if (storedActive) {
            const parsed = JSON.parse(storedActive);
            const pendingEntry: PendingEntry = {
              id: activeEntry.id,
              userId: user.id,
              locationId: activeEntry.locationId,
              locationName: activeEntry.locationName,
              startTime: parsed.startTime,
              endTime: endTime.toISOString(),
              startMethod: parsed.startMethod || 'manual',
              endMethod: method,
              startLat: parsed.startLat,
              startLng: parsed.startLng,
              endLat: userLat ?? undefined,
              endLng: userLng ?? undefined,
            };

            const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
            const pending: PendingEntry[] = stored ? JSON.parse(stored) : [];
            pending.push(pendingEntry);
            localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(pending));
            setPendingSync(pending);
          }
        }

        // Add to completed entries
        const durationMinutes = Math.round((endTime.getTime() - activeEntry.startTime.getTime()) / 60000);
        setTodayEntries(prev => [...prev, {
          id: activeEntry.id,
          locationName: activeEntry.locationName,
          startTime: activeEntry.startTime,
          endTime,
          durationMinutes,
        }]);

        setActiveEntry(null);
        localStorage.removeItem(ACTIVE_ENTRY_KEY);
        setLoading(false);
        return { success: true };
      } catch (err) {
        console.error('Clock out error:', err);
        setLoading(false);
        return { success: false, error: 'Error al registrar salida' };
      }
    },
    [user, activeEntry]
  );

  // Get total hours worked today
  const getTodayTotalMinutes = useCallback(() => {
    let total = todayEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
    
    // Add active entry time
    if (activeEntry) {
      total += Math.round((Date.now() - activeEntry.startTime.getTime()) / 60000);
    }
    
    return total;
  }, [todayEntries, activeEntry]);

  return {
    activeEntry,
    todayEntries,
    pendingSync,
    loading,
    isOnline,
    clockIn,
    clockInManual,
    clockOut,
    checkActiveEntry,
    fetchTodayEntries,
    validateLocation,
    getTodayTotalMinutes,
    syncPendingEntries,
  };
}
