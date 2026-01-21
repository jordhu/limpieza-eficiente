import { useState } from 'react';
import { AlertTriangle, Camera, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface IncidentReportProps {
  locationName: string;
  whatsappNumber?: string;
}

export function IncidentReport({
  locationName,
  whatsappNumber = '+34600000000',
}: IncidentReportProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendWhatsApp = () => {
    const message = encodeURIComponent(
      `🚨 *INCIDENCIA - CleanTrack*\n\n📍 Ubicación: ${locationName}\n📝 Descripción: ${description}\n\n_Enviado desde CleanTrack_`
    );
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success('Redirigiendo a WhatsApp...');
    setOpen(false);
    setDescription('');
  };

  const handleCapture = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          toast.success('Foto capturada. Incluye la descripción y envía por WhatsApp.');
        }
      };
      
      input.click();
    } catch (error) {
      toast.error('No se pudo acceder a la cámara');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="warning" className="w-full gap-2">
          <AlertTriangle className="w-4 h-4" />
          Reportar Incidencia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Reportar Incidencia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Ubicación: <span className="font-medium text-foreground">{locationName}</span>
            </p>
          </div>

          <Textarea
            placeholder="Describe la incidencia..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleCapture}
          >
            <Camera className="w-4 h-4" />
            Tomar Foto
          </Button>

          <Button
            className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
            onClick={handleSendWhatsApp}
            disabled={!description.trim()}
          >
            <MessageCircle className="w-4 h-4" />
            Enviar por WhatsApp
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Se abrirá WhatsApp con el mensaje preparado
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
