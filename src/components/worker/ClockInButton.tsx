import { useState } from 'react';
import { Play, Square, Loader2, MapPin, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClockInButtonProps {
  isWorking: boolean;
  currentLocation?: string;
  isOnline: boolean;
  pendingSync: number;
  onClockIn: () => void;
  onClockOut: () => void;
  loading?: boolean;
}

export function ClockInButton({
  isWorking,
  currentLocation,
  isOnline,
  pendingSync,
  onClockIn,
  onClockOut,
  loading = false,
}: ClockInButtonProps) {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
    
    if (isWorking) {
      onClockOut();
    } else {
      onClockIn();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Main Button */}
      <button
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'relative w-48 h-48 rounded-full transition-all duration-300',
          'flex items-center justify-center',
          'shadow-lg hover:shadow-xl',
          'focus:outline-none focus:ring-4 focus:ring-offset-4',
          isWorking
            ? 'bg-destructive focus:ring-destructive/30'
            : 'btn-gradient focus:ring-primary/30',
          animating && 'scale-95'
        )}
      >
        {loading ? (
          <Loader2 className="w-16 h-16 text-primary-foreground animate-spin" />
        ) : isWorking ? (
          <Square className="w-16 h-16 text-destructive-foreground" />
        ) : (
          <Play className="w-16 h-16 text-primary-foreground ml-2" />
        )}

        {/* Pulse animation when working */}
        {isWorking && !loading && (
          <div className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-20" />
        )}
      </button>

      {/* Status Text */}
      <div className="text-center space-y-2">
        <p className="text-2xl font-bold">
          {loading
            ? 'Procesando...'
            : isWorking
            ? 'Trabajando'
            : 'Iniciar Jornada'}
        </p>
        
        {currentLocation && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{currentLocation}</span>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
            isOnline ? 'status-active' : 'status-warning'
          )}
        >
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>Conectado</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>Sin conexión</span>
            </>
          )}
        </div>

        {pendingSync > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-warning/10 text-warning border border-warning/20">
            <span>{pendingSync} pendientes</span>
          </div>
        )}
      </div>
    </div>
  );
}
