import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(watch = false) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
  });

  const updatePosition = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      error: null,
      loading: false,
    });
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let message = 'Error desconocido de geolocalización';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Permiso de ubicación denegado';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Ubicación no disponible';
        break;
      case error.TIMEOUT:
        message = 'Tiempo de espera agotado';
        break;
    }
    setState(prev => ({ ...prev, error: message, loading: false }));
  }, []);

  const requestPosition = useCallback(() => {
    setState(prev => ({ ...prev, loading: true }));
    navigator.geolocation.getCurrentPosition(updatePosition, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  }, [updatePosition, handleError]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocalización no soportada',
        loading: false,
      }));
      return;
    }

    if (watch) {
      const watchId = navigator.geolocation.watchPosition(
        updatePosition,
        handleError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      requestPosition();
    }
  }, [watch, updatePosition, handleError, requestPosition]);

  const isNearLocation = useCallback(
    (targetLat: number, targetLng: number, radiusMeters: number) => {
      if (!state.latitude || !state.longitude) return false;
      
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (state.latitude * Math.PI) / 180;
      const φ2 = (targetLat * Math.PI) / 180;
      const Δφ = ((targetLat - state.latitude) * Math.PI) / 180;
      const Δλ = ((targetLng - state.longitude) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return distance <= radiusMeters;
    },
    [state.latitude, state.longitude]
  );

  return { ...state, requestPosition, isNearLocation };
}
