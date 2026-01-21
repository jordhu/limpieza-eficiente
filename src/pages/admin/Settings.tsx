import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { toast } from 'sonner';
import { Building2, Bell, Shield, Clock } from 'lucide-react';

export default function Settings() {
  const [companyName, setCompanyName] = useState('CleanTrack');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoClockOut, setAutoClockOut] = useState(false);
  const [maxClockHours, setMaxClockHours] = useState('12');

  const handleSave = () => {
    toast.success('Configuración guardada correctamente');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
          <p className="text-muted-foreground">
            Administra la configuración general del sistema
          </p>
        </div>

        <div className="grid gap-6">
          {/* Company Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Empresa</CardTitle>
              </div>
              <CardDescription>
                Configuración general de la empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nombre de la empresa</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nombre de tu empresa"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Notificaciones</CardTitle>
              </div>
              <CardDescription>
                Configura las notificaciones del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones por email</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibe alertas de incidencias y fichajes por correo
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Time Tracking */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Control de Fichajes</CardTitle>
              </div>
              <CardDescription>
                Configura las reglas de fichaje
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Fichaje automático de salida</Label>
                  <p className="text-sm text-muted-foreground">
                    Cierra automáticamente los fichajes después de las horas máximas
                  </p>
                </div>
                <Switch
                  checked={autoClockOut}
                  onCheckedChange={setAutoClockOut}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="maxHours">Horas máximas de fichaje</Label>
                <Input
                  id="maxHours"
                  type="number"
                  value={maxClockHours}
                  onChange={(e) => setMaxClockHours(e.target.value)}
                  placeholder="12"
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  Tiempo máximo permitido para un turno de trabajo
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Seguridad</CardTitle>
              </div>
              <CardDescription>
                Configuración de seguridad y acceso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                La configuración de seguridad avanzada estará disponible próximamente.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave}>
            Guardar Configuración
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
