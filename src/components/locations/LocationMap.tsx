import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';

interface LocationMapProps {
  latitude: number | null;
  longitude: number | null;
  radius: number;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
}

// Lazy load the map component to avoid SSR/rendering issues
const LeafletMapInner = lazy(() => import('./LeafletMapInner'));

export function LocationMap({ latitude, longitude, radius, onLocationChange }: LocationMapProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Wait for component to mount before showing map
  useEffect(() => {
    setMapReady(true);
  }, []);

  // Search for address using Nominatim (OpenStreetMap)
  const searchAddress = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchResults([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'es',
          },
        }
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setSearchResults(data);

      if (data.length === 0) {
        toast.info('No se encontraron resultados');
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Error al buscar dirección');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleResultSelect = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const address = result.display_name;
    
    onLocationChange(lat, lng, address);
    setSearchResults([]);
    setSearchQuery(address.split(',').slice(0, 2).join(','));
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    onLocationChange(lat, lng);
    
    // Reverse geocode to get address
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'Accept-Language': 'es',
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.display_name) {
          onLocationChange(lat, lng, data.display_name);
          setSearchQuery(data.display_name.split(',').slice(0, 2).join(','));
        }
      })
      .catch(() => {
        // Ignore reverse geocode errors
      });
  }, [onLocationChange]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalización no soportada');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        handleMapClick(lat, lng);
        setGettingLocation(false);
        toast.success('Ubicación obtenida');
      },
      (error) => {
        setGettingLocation(false);
        toast.error('Error al obtener ubicación: ' + error.message);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchAddress();
    }
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar dirección..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={searchAddress}
            disabled={searching}
          >
            {searching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={getCurrentLocation}
          disabled={gettingLocation}
          title="Usar mi ubicación"
        >
          {gettingLocation ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Search results dropdown */}
      {searchResults.length > 0 && (
        <div className="relative z-[1000]">
          <div className="absolute w-full bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-start gap-2"
                onClick={() => handleResultSelect(result)}
              >
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{result.display_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="h-64 rounded-lg overflow-hidden border relative bg-muted">
        {mapReady ? (
          <Suspense fallback={
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          }>
            <LeafletMapInner
              latitude={latitude}
              longitude={longitude}
              radius={radius}
              onLocationChange={handleMapClick}
            />
          </Suspense>
        ) : (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Haz clic en el mapa para seleccionar una ubicación o busca una dirección
      </p>
    </div>
  );
}
