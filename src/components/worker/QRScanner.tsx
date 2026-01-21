import { useState, useRef, useEffect } from 'react';
import { Camera, X, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function QRScanner({ open, onClose, onScan }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (open && videoRef.current) {
      startCamera();
    }
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setScanning(false);
  };

  // Simulated QR scan for demo
  const handleSimulatedScan = () => {
    onScan('LOC-001');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Escanear Código QR
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasCamera ? (
            <div className="relative aspect-square bg-muted rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Scanner overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl" />
                  
                  {/* Scanning line animation */}
                  {scanning && (
                    <div className="absolute left-2 right-2 h-0.5 bg-primary animate-pulse top-1/2" />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-square bg-muted rounded-xl flex items-center justify-center">
              <div className="text-center space-y-2">
                <Camera className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  No se pudo acceder a la cámara
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-center text-muted-foreground">
            Coloca el código QR dentro del recuadro
          </p>

          {/* Demo button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSimulatedScan}
          >
            Simular escaneo (Demo)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
