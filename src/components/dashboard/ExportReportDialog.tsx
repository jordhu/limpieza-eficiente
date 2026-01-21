import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, FileSpreadsheet, FileText, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const months = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export function ExportReportDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => String(currentYear - i));

  const handleExport = async (format: 'csv' | 'pdf') => {
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('No autorizado');
        return;
      }

      const response = await supabase.functions.invoke('generate-report', {
        body: {
          month: parseInt(month),
          year: parseInt(year),
          format,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const content = response.data;
      const monthName = months.find(m => m.value === month)?.label || month;

      if (format === 'csv') {
        // Download CSV directly
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_${monthName}_${year}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Reporte CSV descargado correctamente');
      } else {
        // Open HTML in new window for printing as PDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(content);
          printWindow.document.close();
          
          // Add print button
          const printButton = printWindow.document.createElement('button');
          printButton.innerHTML = '🖨️ Imprimir / Guardar como PDF';
          printButton.style.cssText = 'position:fixed;top:10px;right:10px;padding:12px 24px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:bold;z-index:1000;';
          printButton.onclick = () => {
            printButton.style.display = 'none';
            printWindow.print();
            printButton.style.display = 'block';
          };
          printWindow.document.body.insertBefore(printButton, printWindow.document.body.firstChild);
          
          toast.success('Reporte abierto en nueva pestaña. Usa Ctrl+P para guardar como PDF');
        }
      }

      setOpen(false);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <FileDown className="w-4 h-4" />
        <span className="hidden sm:inline">Exportar</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5" />
              Exportar Reporte Mensual
            </DialogTitle>
            <DialogDescription>
              Genera un reporte con las horas trabajadas por cada empleado y ubicación.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Año</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">El reporte incluye:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Resumen general de horas y fichajes</li>
                <li>• Desglose de horas por trabajador</li>
                <li>• Desglose de horas por ubicación</li>
                <li>• Detalle de todos los fichajes del mes</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              disabled={loading}
              className="flex-1 gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              Excel/CSV
            </Button>
            <Button
              onClick={() => handleExport('pdf')}
              disabled={loading}
              className="flex-1 gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
