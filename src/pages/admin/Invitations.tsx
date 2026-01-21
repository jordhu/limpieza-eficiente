import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { z } from 'zod';
import {
  Mail,
  Plus,
  Copy,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// Validation schema
const invitationSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }).max(255),
  expiresInDays: z.number().min(1).max(30),
});

interface Invitation {
  id: string;
  email: string;
  code: string;
  created_at: string;
  expires_at: string;
  used: boolean;
  used_at: string | null;
}

export default function Invitations() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [errors, setErrors] = useState<{ email?: string }>({});

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
      toast.error('Error al cargar invitaciones');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateInvitation = async () => {
    setErrors({});

    // Validate input
    const result = invitationSchema.safeParse({
      email: email.trim(),
      expiresInDays: parseInt(expiresInDays),
    });

    if (!result.success) {
      const fieldErrors: { email?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') {
          fieldErrors.email = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setCreating(true);

    try {
      // Check if email already has an active invitation
      const { data: existing } = await supabase
        .from('invitations')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existing) {
        setErrors({ email: 'Ya existe una invitación activa para este email' });
        setCreating(false);
        return;
      }

      const code = generateCode();
      const expiresAt = addDays(new Date(), parseInt(expiresInDays));

      const { error } = await supabase.from('invitations').insert({
        email: email.trim().toLowerCase(),
        code,
        expires_at: expiresAt.toISOString(),
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Invitación creada correctamente');
      setCreateDialogOpen(false);
      setEmail('');
      setExpiresInDays('7');
      fetchInvitations();
    } catch (err) {
      console.error('Error creating invitation:', err);
      toast.error('Error al crear invitación');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado al portapapeles');
  };

  const handleDeleteInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Invitación eliminada');
      fetchInvitations();
    } catch (err) {
      console.error('Error deleting invitation:', err);
      toast.error('Error al eliminar invitación');
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.used) {
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Utilizada
        </Badge>
      );
    }
    
    const isExpired = new Date(invitation.expires_at) < new Date();
    if (isExpired) {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          <XCircle className="w-3 h-3 mr-1" />
          Expirada
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
        <Clock className="w-3 h-3 mr-1" />
        Pendiente
      </Badge>
    );
  };

  // Stats
  const activeCount = invitations.filter(
    (i) => !i.used && new Date(i.expires_at) > new Date()
  ).length;
  const usedCount = invitations.filter((i) => i.used).length;
  const expiredCount = invitations.filter(
    (i) => !i.used && new Date(i.expires_at) < new Date()
  ).length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Invitaciones</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona los códigos de acceso para nuevos trabajadores
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchInvitations}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Invitación
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activas</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Utilizadas</p>
                <p className="text-2xl font-bold">{usedCount}</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-destructive/10">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiradas</p>
                <p className="text-2xl font-bold">{expiredCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invitations List */}
        <div className="card-elevated">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Lista de Invitaciones</h2>
            </div>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay invitaciones creadas</p>
              <Button
                className="mt-4"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear primera invitación
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">
                        {invitation.email}
                      </span>
                      {getStatusBadge(invitation)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-mono bg-muted px-2 py-0.5 rounded">
                        {invitation.code}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Expira: {format(new Date(invitation.expires_at), "d MMM yyyy", { locale: es })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCode(invitation.code)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {!invitation.used && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteInvitation(invitation.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Invitación</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email del trabajador</Label>
              <Input
                id="email"
                type="email"
                placeholder="trabajador@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Validez de la invitación</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 día</SelectItem>
                  <SelectItem value="3">3 días</SelectItem>
                  <SelectItem value="7">7 días</SelectItem>
                  <SelectItem value="14">14 días</SelectItem>
                  <SelectItem value="30">30 días</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Instrucciones para el trabajador:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Acceder a la aplicación CleanTrack</li>
                <li>Ir a "Tengo Invitación"</li>
                <li>Ingresar el código recibido</li>
                <li>Completar el registro con su email</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateInvitation} disabled={creating}>
              {creating ? 'Creando...' : 'Crear Invitación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
