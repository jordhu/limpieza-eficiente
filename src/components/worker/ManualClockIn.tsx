import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Building2, MapPin, Loader2, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Location {
  id: string;
  name: string;
  address: string;
  qr_code: string;
}

interface ManualClockInProps {
  open: boolean;
  onClose: () => void;
  onSelect: (locationId: string, locationName: string, qrCode: string) => void;
  isOffline?: boolean;
}

export function ManualClockIn({ open, onClose, onSelect, isOffline }: ManualClockInProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [cachedLocations, setCachedLocations] = useState<Location[]>([]);

  useEffect(() => {
    if (open) {
      fetchLocations();
    }
  }, [open]);

  const fetchLocations = async () => {
    setLoading(true);
    
    // Try to get from cache first if offline
    const cached = localStorage.getItem('cleantrack_locations_cache');
    if (cached) {
      setCachedLocations(JSON.parse(cached));
    }

    if (!navigator.onLine) {
      if (cached) {
        setLocations(JSON.parse(cached));
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('work_locations')
        .select('id, name, address, qr_code')
        .order('name');

      if (error) throw error;

      setLocations(data || []);
      // Cache for offline use
      localStorage.setItem('cleantrack_locations_cache', JSON.stringify(data || []));
    } catch (err) {
      console.error('Error fetching locations:', err);
      // Fall back to cache
      if (cached) {
        setLocations(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (location: Location) => {
    onSelect(location.id, location.name, location.qr_code);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Seleccionar Alojamiento
          </DialogTitle>
          <DialogDescription>
            {isOffline ? (
              <span className="flex items-center gap-2 text-warning">
                <WifiOff className="w-4 h-4" />
                Modo offline - El fichaje se sincronizará cuando vuelva la conexión
              </span>
            ) : (
              'Busca y selecciona el alojamiento donde vas a trabajar'
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Command className="rounded-lg border">
            <CommandInput placeholder="Buscar alojamiento..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>No se encontraron alojamientos</CommandEmpty>
              <CommandGroup>
                {locations.map((location) => (
                  <CommandItem
                    key={location.id}
                    onSelect={() => handleSelect(location)}
                    className="flex items-start gap-3 p-3 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{location.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3" />
                        {location.address}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}

        {isOffline && (
          <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
            <p className="text-sm text-warning">
              <strong>Sin conexión:</strong> El fichaje se guardará localmente y se subirá automáticamente cuando recuperes la señal.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
