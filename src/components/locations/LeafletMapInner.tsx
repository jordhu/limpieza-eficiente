import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
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

interface LeafletMapInnerProps {
  latitude: number | null;
  longitude: number | null;
  radius: number;
  onLocationChange: (lat: number, lng: number) => void;
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

export default function LeafletMapInner({ latitude, longitude, radius, onLocationChange }: LeafletMapInnerProps) {
  // Default center (Spain)
  const defaultCenter: [number, number] = [40.416775, -3.703790];
  const center: [number, number] = latitude && longitude 
    ? [latitude, longitude] 
    : defaultCenter;

  return (
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
      
      <MapClickHandler onLocationChange={onLocationChange} />
      <MapUpdater center={latitude && longitude ? [latitude, longitude] : null} />
      
      {latitude && longitude && (
        <>
          <Marker position={[latitude, longitude]} icon={defaultIcon} />
          <Circle
            center={[latitude, longitude]}
            radius={radius}
            pathOptions={{
              color: 'hsl(142, 76%, 36%)',
              fillColor: 'hsl(142, 76%, 36%)',
              fillOpacity: 0.2,
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
