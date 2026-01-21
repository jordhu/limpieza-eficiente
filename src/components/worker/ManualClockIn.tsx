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
import { Building2, MapPin, Loader2, WifiOff, Camera, Check } from 'lucide-react';
import { PhotoCapture } from './PhotoCapture';
import { cn } from '@/lib/utils';

interface Location {
  id: string;
  name: string;
  address: string;
  qr_code: string;
}

interface ManualClockInProps {
  open: boolean;
  onClose: () => void;
  onSelect: (locationId: string, locationName: string, qrCode: string, photoBlob?: Blob) => void;
  isOffline?: boolean;
  requirePhoto?: boolean;
}

export function ManualClockIn({ open, onClose, onSelect, isOffline, requirePhoto = true }: ManualClockInProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);

  useEffect(() => {
    if (open) {
      fetchLocations();
      // Reset state when opening
      setSelectedLocation(null);
      setCapturedPhoto(null);
    }
  }, [open]);

  const fetchLocations = async () => {
    setLoading(true);
    
    // Try to get from cache first if offline
    const cached = localStorage.getItem('cleantrack_locations_cache');

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

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    if (requirePhoto) {
      setShowCamera(true);
    } else {
      // If no photo required, proceed directly
      onSelect(location.id, location.name, location.qr_code);
      onClose();
    }
  };

  const handlePhotoCapture = (blob: Blob) => {
    setCapturedPhoto(blob);
    setShowCamera(false);
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onSelect(selectedLocation.id, selectedLocation.name, selectedLocation.qr_code, capturedPhoto || undefined);
      onClose();
    }
  };

  const handleBack = () => {
    if (capturedPhoto) {
      setCapturedPhoto(null);
    } else if (selectedLocation) {
      setSelectedLocation(null);
    }
  };

  // Step indicator
  const currentStep = !selectedLocation ? 1 : !capturedPhoto ? 2 : 3;

  return (
    <>
      <Dialog open={open && !showCamera} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {!selectedLocation ? 'Seleccionar Alojamiento' : 'Confirmar Fichaje'}
            </DialogTitle>
            <DialogDescription>
              {isOffline ? (
                <span className="flex items-center gap-2 text-warning">
                  <WifiOff className="w-4 h-4" />
                  Modo offline - Se sincronizará al recuperar conexión
                </span>
              ) : !selectedLocation ? (
                'Busca y selecciona el alojamiento donde vas a trabajar'
              ) : !capturedPhoto && requirePhoto ? (
                'Captura una foto de la entrada para verificar tu ubicación'
              ) : (
                'Revisa los datos antes de confirmar'
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          {requirePhoto && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                1
              </div>
              <div className={cn("w-8 h-0.5", currentStep >= 2 ? "bg-primary" : "bg-muted")} />
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                2
              </div>
              <div className={cn("w-8 h-0.5", currentStep >= 3 ? "bg-primary" : "bg-muted")} />
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                currentStep >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                3
              </div>
            </div>
          )}

          {/* Step 1: Location Selection */}
          {!selectedLocation && (
            loading ? (
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
                        onSelect={() => handleLocationSelect(location)}
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
            )
          )}

          {/* Step 2: Waiting for photo */}
          {selectedLocation && !capturedPhoto && requirePhoto && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedLocation.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedLocation.address}</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => setShowCamera(true)} 
                className="w-full"
                size="lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Capturar Foto de Verificación
              </Button>

              <Button 
                variant="ghost" 
                onClick={handleBack}
                className="w-full"
              >
                Volver a seleccionar
              </Button>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {selectedLocation && (capturedPhoto || !requirePhoto) && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedLocation.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedLocation.address}</p>
                  </div>
                </div>
              </div>

              {capturedPhoto && (
                <div className="relative rounded-lg overflow-hidden">
                  <img 
                    src={URL.createObjectURL(capturedPhoto)} 
                    alt="Foto de verificación"
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setShowCamera(true)}
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      Repetir
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleBack}
                  className="flex-1"
                >
                  Volver
                </Button>
                <Button 
                  onClick={handleConfirm}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Fichar Entrada
                </Button>
              </div>
            </div>
          )}

          {isOffline && (
            <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-sm text-warning">
                <strong>Sin conexión:</strong> El fichaje y la foto se guardarán localmente y se subirán cuando recuperes la señal.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo Capture Dialog */}
      <PhotoCapture
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handlePhotoCapture}
        title="Foto de Verificación"
        description={`Captura la entrada de ${selectedLocation?.name || 'el alojamiento'}`}
      />
    </>
  );
}
