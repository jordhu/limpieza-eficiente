import { useState, useEffect } from 'react';
import { Clock, QrCode, MapPin, Calendar, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClockInButton } from '@/components/worker/ClockInButton';
import { QRScanner } from '@/components/worker/QRScanner';
import { IncidentReport } from '@/components/worker/IncidentReport';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { toast } from 'sonner';

export default function WorkerHome() {
  const [isWorking, setIsWorking] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [currentLocation] = useState('Oficina Central');
  
  const { latitude, longitude, error: geoError, isNearLocation } = useGeolocation(true);
  const { isOnline, getPendingCount, saveEntry } = useOfflineStorage();

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorking && startTime) {
      interval = setInterval(() => {
        const diff = Date.now() - startTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorking, startTime]);

  const handleQRScan = (code: string) => {
    console.log('QR Code scanned:', code);
    handleClockIn('qr');
  };

  const handleClockIn = (method: 'qr' | 'gps' | 'manual') => {
    setLoading(true);
    
    setTimeout(() => {
      const now = new Date();
      setStartTime(now);
      setIsWorking(true);
      setLoading(false);
      
      saveEntry({
        id: crypto.randomUUID(),
        userId: 'user-1',
        userName: 'Usuario Demo',
        locationId: 'loc-1',
        locationName: currentLocation,
        startTime: now,
        startMethod: method,
        startCoords: latitude && longitude ? { lat: latitude, lng: longitude } : undefined,
        synced: isOnline,
      });
      
      toast.success(`Jornada iniciada (${method.toUpperCase()})`);
    }, 1000);
  };

  const handleClockOut = () => {
    setLoading(true);
    
    setTimeout(() => {
      setIsWorking(false);
      setLoading(false);
      setStartTime(null);
      setElapsedTime('00:00:00');
      toast.success('Jornada finalizada');
    }, 1000);
  };

  // Today's date formatted
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">CleanTrack</h1>
              <p className="text-xs text-muted-foreground capitalize">{today}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <History className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-6 py-8 space-y-8">
        {/* Timer Display */}
        {isWorking && (
          <div className="text-center animate-fade-in">
            <p className="text-sm text-muted-foreground mb-1">Tiempo trabajado</p>
            <p className="text-5xl font-mono font-bold tracking-tight text-primary">
              {elapsedTime}
            </p>
          </div>
        )}

        {/* Clock In/Out Button */}
        <ClockInButton
          isWorking={isWorking}
          currentLocation={isWorking ? currentLocation : undefined}
          isOnline={isOnline}
          pendingSync={getPendingCount()}
          onClockIn={() => handleClockIn('manual')}
          onClockOut={handleClockOut}
          loading={loading}
        />

        {/* Quick Actions */}
        {!isWorking && (
          <div className="space-y-3 animate-slide-up">
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-3"
              onClick={() => setScannerOpen(true)}
            >
              <QrCode className="w-5 h-5" />
              Escanear Código QR
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
              <MapPin className="w-4 h-4" />
              {geoError ? (
                <span className="text-destructive">{geoError}</span>
              ) : latitude && longitude ? (
                <span>GPS activo ({latitude.toFixed(4)}, {longitude.toFixed(4)})</span>
              ) : (
                <span>Obteniendo ubicación...</span>
              )}
            </div>
          </div>
        )}

        {/* Incident Report (only when working) */}
        {isWorking && (
          <div className="animate-slide-up">
            <IncidentReport locationName={currentLocation} />
          </div>
        )}

        {/* Today's Summary */}
        <div className="card-elevated p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Resumen de Hoy</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-primary">6.5</p>
              <p className="text-sm text-muted-foreground">Horas trabajadas</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-success">2</p>
              <p className="text-sm text-muted-foreground">Ubicaciones</p>
            </div>
          </div>
        </div>
      </main>

      {/* QR Scanner Modal */}
      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQRScan}
      />
    </div>
  );
}
