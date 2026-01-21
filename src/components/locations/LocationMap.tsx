import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationMapProps {
  latitude: number | null;
  longitude: number | null;
  radius: number;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
}

// Component to handle map clicks
function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to update map center
function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 16);
    }
  }, [center, map]);
  
  return null;
}

export function LocationMap({ latitude, longitude, radius, onLocationChange }: LocationMapProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Default center (Spain)
  const defaultCenter: [number, number] = [40.416775, -3.703790];
  const center: [number, number] = latitude && longitude 
    ? [latitude, longitude] 
    : defaultCenter;

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
        <div className="absolute z-[1000] w-full bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
      )}

      {/* Map */}
      <div className="h-64 rounded-lg overflow-hidden border relative">
        <MapContainer
          center={center}
          zoom={latitude && longitude ? 16 : 6}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapClickHandler onLocationChange={handleMapClick} />
          <MapUpdater center={latitude && longitude ? [latitude, longitude] : null} />
          
          {latitude && longitude && (
            <>
              <Marker position={[latitude, longitude]} icon={defaultIcon} />
              <Circle
                center={[latitude, longitude]}
                radius={radius}
                pathOptions={{
                  color: 'hsl(var(--primary))',
                  fillColor: 'hsl(var(--primary))',
                  fillOpacity: 0.2,
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Haz clic en el mapa para seleccionar una ubicación o busca una dirección
      </p>
    </div>
  );
}
