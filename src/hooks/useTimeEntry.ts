import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ActiveEntry {
  id: string;
  locationId: string;
  locationName: string;
  startTime: Date;
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

export function useTimeEntry() {
  const { user } = useAuth();
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<CompletedEntry[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Fetch today's entries (completed + active)
  const fetchTodayEntries = useCallback(async () => {
    if (!user) return;

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
      setActiveEntry(active);
    } catch (err) {
      console.error('Error fetching today entries:', err);
    }
  }, [user]);

  // Check for active entry on mount (legacy - now use fetchTodayEntries)
  const checkActiveEntry = useCallback(async () => {
    await fetchTodayEntries();
  }, [fetchTodayEntries]);

  // Clock in
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
        // Validate location
        const validation = await validateLocation(qrCode, userLat, userLng);
        
        if (!validation.valid || !validation.location) {
          setLoading(false);
          return { success: false, error: validation.error };
        }

        const location = validation.location;

        // Create time entry
        const { data, error } = await supabase
          .from('time_entries')
          .insert({
            user_id: user.id,
            location_id: location.id,
            start_time: new Date().toISOString(),
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

        setActiveEntry({
          id: data.id,
          locationId: location.id,
          locationName: location.name,
          startTime: new Date(data.start_time),
        });

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

  // Clock out
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
    loading,
    clockIn,
    clockOut,
    checkActiveEntry,
    fetchTodayEntries,
    validateLocation,
    getTodayTotalMinutes,
  };
}
