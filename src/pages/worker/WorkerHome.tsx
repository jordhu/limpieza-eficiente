import { useState, useEffect } from 'react';
import { Clock, QrCode, MapPin, Calendar, History, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClockInButton } from '@/components/worker/ClockInButton';
import { QRScanner } from '@/components/worker/QRScanner';
import { IncidentReport } from '@/components/worker/IncidentReport';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useTimeEntry } from '@/hooks/useTimeEntry';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function WorkerHome() {
  const { user } = useAuth();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'clock-in' | 'clock-out';
    qrCode?: string;
  }>({ open: false, type: 'clock-in' });
  
  const { latitude, longitude, error: geoError, loading: geoLoading, requestPosition } = useGeolocation(true);
  const { activeEntry, loading, clockIn, clockOut, checkActiveEntry } = useTimeEntry();

  // Check for active entry on mount
  useEffect(() => {
    checkActiveEntry();
  }, [checkActiveEntry]);

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeEntry) {
      const updateTimer = () => {
        const diff = Date.now() - activeEntry.startTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => clearInterval(interval);
  }, [activeEntry]);

  const handleQRScan = (code: string) => {
    console.log('QR Code scanned:', code);
    
    if (activeEntry) {
      // Already working, show confirmation for clock out
      setConfirmDialog({ open: true, type: 'clock-out', qrCode: code });
    } else {
      // Not working, proceed with clock in
      handleClockIn(code);
    }
  };

  const handleClockIn = async (qrCode: string) => {
    // Ensure we have fresh GPS
    if (!latitude || !longitude) {
      requestPosition();
      toast.error('Esperando ubicación GPS...');
      return;
    }

    const result = await clockIn(qrCode, latitude, longitude, 'qr');
    
    if (result.success) {
      toast.success('¡Jornada iniciada correctamente!', {
        icon: <CheckCircle className="w-5 h-5 text-success" />,
      });
    } else {
      toast.error(result.error || 'Error al fichar entrada', {
        icon: <AlertCircle className="w-5 h-5" />,
      });
    }
  };

  const handleClockOut = async () => {
    const result = await clockOut(latitude, longitude, 'manual');
    
    if (result.success) {
      toast.success('¡Jornada finalizada!', {
        icon: <CheckCircle className="w-5 h-5 text-success" />,
      });
    } else {
      toast.error(result.error || 'Error al fichar salida', {
        icon: <AlertCircle className="w-5 h-5" />,
      });
    }
    
    setConfirmDialog({ open: false, type: 'clock-out' });
  };

  const handleManualClockOut = () => {
    setConfirmDialog({ open: true, type: 'clock-out' });
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user?.email?.split('@')[0]}</span>
            <Button variant="ghost" size="icon">
              <History className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-6 py-8 space-y-8">
        {/* Timer Display */}
        {activeEntry && (
          <div className="text-center animate-fade-in">
            <p className="text-sm text-muted-foreground mb-1">Tiempo trabajado</p>
            <p className="text-5xl font-mono font-bold tracking-tight text-primary">
              {elapsedTime}
            </p>
          </div>
        )}

        {/* Clock In/Out Button */}
        <ClockInButton
          isWorking={!!activeEntry}
          currentLocation={activeEntry?.locationName}
          isOnline={navigator.onLine}
          pendingSync={0}
          onClockIn={() => setScannerOpen(true)}
          onClockOut={handleManualClockOut}
          loading={loading}
        />

        {/* Quick Actions */}
        {!activeEntry && (
          <div className="space-y-3 animate-slide-up">
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-3"
              onClick={() => setScannerOpen(true)}
            >
              <QrCode className="w-5 h-5" />
              Escanear Código QR para Fichar
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
              <MapPin className="w-4 h-4" />
              {geoError ? (
                <span className="text-destructive">{geoError}</span>
              ) : geoLoading ? (
                <span>Obteniendo ubicación...</span>
              ) : latitude && longitude ? (
                <span className="text-success">GPS activo ✓</span>
              ) : (
                <span>Esperando GPS...</span>
              )}
            </div>
          </div>
        )}

        {/* Incident Report (only when working) */}
        {activeEntry && (
          <div className="animate-slide-up">
            <IncidentReport locationName={activeEntry.locationName} />
          </div>
        )}

        {/* Instructions Card */}
        <div className="card-elevated p-6 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">¿Cómo fichar?</h3>
          </div>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Pulsa el botón grande o "Escanear Código QR"</li>
            <li>Apunta la cámara al código QR de tu ubicación de trabajo</li>
            <li>El sistema validará que estás dentro del área permitida</li>
            <li>Tu jornada comenzará automáticamente</li>
          </ol>
        </div>

        {/* Today's Summary */}
        <div className="card-elevated p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Resumen de Hoy</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-primary">
                {activeEntry ? elapsedTime.split(':')[0] : '0'}
              </p>
              <p className="text-sm text-muted-foreground">Horas hoy</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-success">
                {activeEntry ? '1' : '0'}
              </p>
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

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === 'clock-out' ? 'Finalizar Jornada' : 'Iniciar Jornada'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'clock-out'
                ? `¿Estás seguro de que quieres finalizar tu jornada en ${activeEntry?.locationName}?`
                : 'Confirma para iniciar tu jornada de trabajo.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              Cancelar
            </Button>
            <Button 
              variant={confirmDialog.type === 'clock-out' ? 'destructive' : 'default'}
              onClick={handleClockOut}
              disabled={loading}
            >
              {loading ? 'Procesando...' : confirmDialog.type === 'clock-out' ? 'Finalizar' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
