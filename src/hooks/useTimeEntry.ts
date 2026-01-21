import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ActiveEntry {
  id: string;
  locationId: string;
  locationName: string;
  startTime: Date;
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

  // Check for active entry on mount
  const checkActiveEntry = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          location_id,
          start_time,
          work_locations (name)
        `)
        .eq('user_id', user.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setActiveEntry({
          id: data.id,
          locationId: data.location_id || '',
          locationName: (data.work_locations as any)?.name || 'Ubicación desconocida',
          startTime: new Date(data.start_time),
        });
      }
    } catch (err) {
      // No active entry found, which is fine
      console.log('No active entry found');
    }
  }, [user]);

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
    [user, validateLocation]
  );

  // Clock out
  const clockOut = useCallback(
    async (
      userLat: number | null,
      userLng: number | null,
      method: 'qr' | 'gps' | 'manual'
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user || !activeEntry) {
        return { success: false, error: 'No hay jornada activa' };
      }

      setLoading(true);

      try {
        const { error } = await supabase
          .from('time_entries')
          .update({
            end_time: new Date().toISOString(),
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

  return {
    activeEntry,
    loading,
    clockIn,
    clockOut,
    checkActiveEntry,
    validateLocation,
  };
}
