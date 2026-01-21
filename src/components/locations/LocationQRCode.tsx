import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

interface LocationQRCodeProps {
  location: {
    id: string;
    name: string;
    address: string;
    qr_code: string;
  };
}

export function LocationQRCode({ location }: LocationQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const copyCode = async () => {
    await navigator.clipboard.writeText(location.qr_code);
    setCopied(true);
    toast.success('Código copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 500;
      
      if (ctx) {
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code
        ctx.drawImage(img, 50, 30, 300, 300);
        
        // Add text
        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(location.name, 200, 370);
        
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText(location.address, 200, 395);
        
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = 'black';
        ctx.fillText(location.qr_code, 200, 430);
        
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#999';
        ctx.fillText('CleanTrack', 200, 470);
      }

      const link = document.createElement('a');
      link.download = `qr-${location.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="flex flex-col items-center space-y-6 py-4">
      <div ref={qrRef} className="bg-white p-6 rounded-xl shadow-sm border">
        <QRCodeSVG
          value={location.qr_code}
          size={200}
          level="H"
          includeMargin
        />
      </div>

      <div className="text-center space-y-1">
        <p className="font-mono text-lg font-bold tracking-wider">
          {location.qr_code}
        </p>
        <p className="text-sm text-muted-foreground">
          {location.address}
        </p>
      </div>

      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1 gap-2" onClick={copyCode}>
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copiar Código
            </>
          )}
        </Button>
        <Button className="flex-1 gap-2" onClick={downloadQR}>
          <Download className="w-4 h-4" />
          Descargar QR
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-sm">
        Los trabajadores pueden escanear este QR o introducir el código manualmente para fichar en esta ubicación.
      </p>
    </div>
  );
}
