import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, QrCode, MapPin, CheckCircle, LogOut, History, Home, Timer, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QRScanner } from '@/components/worker/QRScanner';
import { IncidentReport } from '@/components/worker/IncidentReport';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useTimeEntry } from '@/hooks/useTimeEntry';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function WorkerHome() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [confirmClockOut, setConfirmClockOut] = useState(false);
  
  const { latitude, longitude, error: geoError, loading: geoLoading, requestPosition } = useGeolocation(true);
  const { 
    activeEntry, 
    todayEntries, 
    loading, 
    clockIn, 
    clockOut, 
    fetchTodayEntries,
    getTodayTotalMinutes 
  } = useTimeEntry();

  // Fetch entries on mount
  useEffect(() => {
    fetchTodayEntries();
  }, [fetchTodayEntries]);

  // Timer for current entry elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeEntry) {
      const updateTimer = () => {
        const diff = Date.now() - activeEntry.startTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        );
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00');
    }
    return () => clearInterval(interval);
  }, [activeEntry]);

  const handleQRScan = async (code: string) => {
    console.log('QR Code scanned:', code);
    
    // Ensure we have fresh GPS
    if (!latitude || !longitude) {
      requestPosition();
      toast.error('Esperando ubicación GPS...');
      return;
    }

    const result = await clockIn(code, latitude, longitude, 'qr');
    
    if (result.success) {
      toast.success('¡Entrada registrada!', {
        icon: <CheckCircle className="w-5 h-5 text-success" />,
      });
      setScannerOpen(false);
    } else {
      toast.error(result.error || 'Error al fichar entrada');
    }
  };

  const handleClockOut = async () => {
    const result = await clockOut(latitude, longitude, 'qr');
    
    if (result.success) {
      toast.success('¡Salida registrada!', {
        icon: <CheckCircle className="w-5 h-5 text-success" />,
      });
    } else {
      toast.error(result.error || 'Error al fichar salida');
    }
    
    setConfirmClockOut(false);
  };

  // Format minutes to hours:minutes
  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  // Today's date formatted
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const totalMinutes = getTodayTotalMinutes();
  const totalLocations = todayEntries.length + (activeEntry ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-base">CleanTrack</h1>
              <p className="text-xs text-muted-foreground capitalize">{today}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-muted">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/worker/history')}>
                <History className="w-4 h-4 mr-2" />
                Historial
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={async () => {
                  await signOut();
                  navigate('/login');
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Timer className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{formatDuration(totalMinutes)}</p>
                <p className="text-xs text-muted-foreground">Tiempo hoy</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{totalLocations}</p>
                <p className="text-xs text-muted-foreground">Alojamientos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Entry Card */}
        {activeEntry ? (
          <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="bg-primary animate-pulse">
                  En curso
                </Badge>
                <span className="text-2xl font-mono font-bold text-primary">{elapsedTime}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Home className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{activeEntry.locationName}</p>
                  <p className="text-sm text-muted-foreground">
                    Entrada: {formatTime(activeEntry.startTime)}
                  </p>
                </div>
              </div>
              
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => setConfirmClockOut(true)}
                disabled={loading}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Terminar y Fichar Salida
              </Button>

              <IncidentReport locationName={activeEntry.locationName} />
            </CardContent>
          </Card>
        ) : (
          /* Scan QR Card */
          <Card 
            className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => setScannerOpen(true)}
          >
            <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <QrCode className="w-10 h-10 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">Escanear QR para Fichar</p>
                <p className="text-sm text-muted-foreground">
                  Escanea el código del alojamiento para registrar tu entrada
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" />
                {geoError ? (
                  <span className="text-destructive">{geoError}</span>
                ) : geoLoading ? (
                  <span className="text-muted-foreground">Obteniendo ubicación...</span>
                ) : latitude && longitude ? (
                  <span className="text-success">GPS activo ✓</span>
                ) : (
                  <span className="text-muted-foreground">Esperando GPS...</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Completed Entries */}
        {todayEntries.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Alojamientos completados hoy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {todayEntries.map((entry) => (
                <div 
                  key={entry.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                      <Home className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{entry.locationName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {formatDuration(entry.durationMinutes)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!activeEntry && todayEntries.length === 0 && (
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                ¿Cómo funciona?
              </h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Al llegar al alojamiento, escanea su código QR</li>
                <li>El sistema validará tu ubicación GPS</li>
                <li>Cuando termines, pulsa "Fichar Salida"</li>
                <li>Repite para cada alojamiento del día</li>
              </ol>
            </CardContent>
          </Card>
        )}
      </main>

      {/* QR Scanner Modal */}
      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQRScan}
      />

      {/* Confirm Clock Out Dialog */}
      <Dialog open={confirmClockOut} onOpenChange={setConfirmClockOut}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fichar Salida</DialogTitle>
            <DialogDescription>
              ¿Has terminado de limpiar {activeEntry?.locationName}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">{activeEntry?.locationName}</p>
                <p className="text-sm text-muted-foreground">
                  Tiempo trabajado: {elapsedTime}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmClockOut(false)}>
              Cancelar
            </Button>
            <Button 
              variant="default"
              onClick={handleClockOut}
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Confirmar Salida'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
