import { useState, useRef, useEffect, useCallback } from 'react';
import { X, QrCode, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function QRScanner({ open, onClose, onScan }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScanned = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.log('Scanner stop error:', e);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (scannerRef.current || hasScanned.current) return;

    setError(null);
    
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (!hasScanned.current) {
            hasScanned.current = true;
            stopScanner();
            onScan(decodedText);
            onClose();
          }
        },
        () => {} // Ignore errors during scanning
      );
      
      setScanning(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }, [onScan, onClose, stopScanner]);

  useEffect(() => {
    if (open) {
      hasScanned.current = false;
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      stopScanner();
    }
  }, [open, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Escanear Código QR
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Scanner Container */}
          <div className="relative aspect-square bg-muted rounded-xl overflow-hidden">
            <div id="qr-reader" className="w-full h-full" />
            
            {/* Overlay while initializing */}
            {!scanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground text-sm">Iniciando cámara...</p>
                </div>
              </div>
            )}
            
            {/* Error state */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center space-y-2 p-4">
                  <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-center text-muted-foreground">
            Coloca el código QR de la ubicación dentro del recuadro
          </p>

          <Button variant="outline" className="w-full" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
