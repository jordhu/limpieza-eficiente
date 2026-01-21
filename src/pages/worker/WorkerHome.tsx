import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, QrCode, MapPin, CheckCircle, LogOut, History, Home, Timer, Building2, WifiOff, Wifi, List, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QRScanner } from '@/components/worker/QRScanner';
import { ManualClockIn } from '@/components/worker/ManualClockIn';
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
  const [manualOpen, setManualOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [confirmClockOut, setConfirmClockOut] = useState(false);
  
  const { latitude, longitude, error: geoError, loading: geoLoading, requestPosition } = useGeolocation(true);
  const { 
    activeEntry, 
    todayEntries, 
    pendingSync,
    loading, 
    isOnline,
    clockIn, 
    clockInManual,
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
    
    // Ensure we have fresh GPS (skip if offline)
    if (isOnline && (!latitude || !longitude)) {
      requestPosition();
      toast.error('Esperando ubicación GPS...');
      return;
    }

    const result = await clockIn(code, latitude, longitude, 'qr');
    
    if (result.success) {
      toast.success(isOnline ? '¡Entrada registrada!' : '¡Entrada guardada (offline)!', {
        icon: <CheckCircle className="w-5 h-5 text-success" />,
      });
      setScannerOpen(false);
    } else {
      toast.error(result.error || 'Error al fichar entrada');
    }
  };

  const handleManualSelect = async (locationId: string, locationName: string, qrCode: string) => {
    const result = await clockInManual(locationId, locationName, latitude, longitude);
    
    if (result.success) {
      toast.success(isOnline ? '¡Entrada registrada!' : '¡Entrada guardada (offline)!', {
        icon: <CheckCircle className="w-5 h-5 text-success" />,
      });
    } else {
      toast.error(result.error || 'Error al fichar entrada');
    }
  };

  const handleClockOut = async () => {
    const result = await clockOut(latitude, longitude, 'manual');
    
    if (result.success) {
      toast.success(isOnline ? '¡Salida registrada!' : '¡Salida guardada (offline)!', {
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
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
              isOnline ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
            )}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {pendingSync.length > 0 && (
                <span className="font-medium">{pendingSync.length}</span>
              )}
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
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-warning/10 border-b border-warning/20 px-4 py-2">
          <div className="max-w-lg mx-auto flex items-center gap-2 text-warning text-sm">
            <WifiOff className="w-4 h-4" />
            <span>Sin conexión - Los fichajes se sincronizarán automáticamente</span>
          </div>
        </div>
      )}

      {/* Pending Sync Banner */}
      {isOnline && pendingSync.length > 0 && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
          <div className="max-w-lg mx-auto flex items-center gap-2 text-primary text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Sincronizando {pendingSync.length} fichajes pendientes...</span>
          </div>
        </div>
      )}

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
          <Card className={cn(
            "border-2 bg-gradient-to-br",
            activeEntry.isOffline 
              ? "border-warning from-warning/5 to-warning/10" 
              : "border-primary from-primary/5 to-primary/10"
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className={cn(
                    "animate-pulse",
                    activeEntry.isOffline ? "bg-warning" : "bg-primary"
                  )}>
                    En curso
                  </Badge>
                  {activeEntry.isOffline && (
                    <Badge variant="outline" className="border-warning text-warning">
                      <WifiOff className="w-3 h-3 mr-1" />
                      Offline
                    </Badge>
                  )}
                </div>
                <span className={cn(
                  "text-2xl font-mono font-bold",
                  activeEntry.isOffline ? "text-warning" : "text-primary"
                )}>{elapsedTime}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  activeEntry.isOffline ? "bg-warning/20" : "bg-primary/20"
                )}>
                  <Home className={cn(
                    "w-6 h-6",
                    activeEntry.isOffline ? "text-warning" : "text-primary"
                  )} />
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
          /* Clock In Options */
          <div className="space-y-3">
            {/* Scan QR Card */}
            <Card 
              className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => setScannerOpen(true)}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <QrCode className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Escanear Código QR</p>
                  <p className="text-sm text-muted-foreground">
                    Escanea el QR del alojamiento
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Manual Select Card */}
            <Card 
              className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => setManualOpen(true)}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <List className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Seleccionar de la Lista</p>
                  <p className="text-sm text-muted-foreground">
                    Si no encuentras el QR o no funciona
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* GPS Status */}
            <div className="flex items-center justify-center gap-2 text-sm py-2">
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
          </div>
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
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
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
                <li>Al llegar, escanea el QR o selecciona el alojamiento</li>
                <li>Si tienes señal, se validará tu ubicación GPS</li>
                <li>Cuando termines, pulsa "Fichar Salida"</li>
                <li>Sin señal, los fichajes se guardan y sincronizan luego</li>
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

      {/* Manual Clock In Modal */}
      <ManualClockIn
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSelect={handleManualSelect}
        isOffline={!isOnline}
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
