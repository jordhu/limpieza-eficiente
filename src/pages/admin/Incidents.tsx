import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  User,
  RefreshCw,
  Image,
  MessageSquare,
  Filter,
  Eye,
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface Incident {
  id: string;
  description: string;
  photo_url: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  user_id: string;
  location_id: string | null;
  worker_name: string;
  worker_email: string;
  location_name: string;
  location_address: string;
  resolver_name?: string;
}

type FilterStatus = 'all' | 'pending' | 'resolved';

export default function Incidents() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id,
          description,
          photo_url,
          resolved,
          resolved_at,
          resolved_by,
          resolution_notes,
          created_at,
          user_id,
          location_id,
          profiles!inner(name, email),
          work_locations(name, address)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process incidents with joined data
      const processedIncidents: Incident[] = await Promise.all(
        (data || []).map(async (incident: any) => {
          let resolverName = null;
          if (incident.resolved_by) {
            const { data: resolver } = await supabase
              .from('profiles')
              .select('name')
              .eq('user_id', incident.resolved_by)
              .maybeSingle();
            resolverName = resolver?.name;
          }

          return {
            id: incident.id,
            description: incident.description,
            photo_url: incident.photo_url,
            resolved: incident.resolved,
            resolved_at: incident.resolved_at,
            resolved_by: incident.resolved_by,
            resolution_notes: incident.resolution_notes,
            created_at: incident.created_at,
            user_id: incident.user_id,
            location_id: incident.location_id,
            worker_name: incident.profiles?.name || 'Desconocido',
            worker_email: incident.profiles?.email || '',
            location_name: incident.work_locations?.name || 'Sin ubicación',
            location_address: incident.work_locations?.address || '',
            resolver_name: resolverName,
          };
        })
      );

      setIncidents(processedIncidents);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      toast.error('Error al cargar incidencias');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedIncident || !user) return;

    setResolving(true);
    try {
      const { error } = await supabase
        .from('incidents')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: resolutionNotes || null,
        })
        .eq('id', selectedIncident.id);

      if (error) throw error;

      toast.success('Incidencia resuelta correctamente');
      setSelectedIncident(null);
      setResolutionNotes('');
      fetchIncidents();
    } catch (err) {
      console.error('Error resolving incident:', err);
      toast.error('Error al resolver incidencia');
    } finally {
      setResolving(false);
    }
  };

  const handleReopen = async (incidentId: string) => {
    try {
      const { error } = await supabase
        .from('incidents')
        .update({
          resolved: false,
          resolved_at: null,
          resolved_by: null,
          resolution_notes: null,
        })
        .eq('id', incidentId);

      if (error) throw error;

      toast.success('Incidencia reabierta');
      fetchIncidents();
    } catch (err) {
      console.error('Error reopening incident:', err);
      toast.error('Error al reabrir incidencia');
    }
  };

  const filteredIncidents = incidents.filter((incident) => {
    if (filter === 'pending') return !incident.resolved;
    if (filter === 'resolved') return incident.resolved;
    return true;
  });

  const pendingCount = incidents.filter((i) => !i.resolved).length;
  const resolvedCount = incidents.filter((i) => i.resolved).length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Incidencias</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona las incidencias reportadas por los trabajadores
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas ({incidents.length})</SelectItem>
                <SelectItem value="pending">Pendientes ({pendingCount})</SelectItem>
                <SelectItem value="resolved">Resueltas ({resolvedCount})</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchIncidents}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resueltas</p>
                <p className="text-2xl font-bold">{resolvedCount}</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <AlertTriangle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{incidents.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Incidents List */}
        <div className="card-elevated">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold">Lista de Incidencias</h2>
            </div>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-success mb-4" />
              <p className="text-muted-foreground">
                {filter === 'pending'
                  ? 'No hay incidencias pendientes'
                  : filter === 'resolved'
                  ? 'No hay incidencias resueltas'
                  : 'No hay incidencias registradas'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedIncident(incident);
                    setResolutionNotes(incident.resolution_notes || '');
                  }}
                >
                  <div className="flex gap-4">
                    {/* Photo thumbnail */}
                    {incident.photo_url ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={incident.photo_url}
                          alt="Foto incidencia"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Image className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium line-clamp-2">{incident.description}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {incident.worker_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {incident.location_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(incident.created_at), "d MMM HH:mm", { locale: es })}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={
                            incident.resolved
                              ? 'bg-success/10 text-success border-success/20'
                              : 'bg-warning/10 text-warning border-warning/20'
                          }
                        >
                          {incident.resolved ? 'Resuelta' : 'Pendiente'}
                        </Badge>
                      </div>

                      {incident.resolved && incident.resolution_notes && (
                        <div className="mt-2 flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <p className="text-muted-foreground line-clamp-1">
                            {incident.resolution_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Incident Detail Dialog */}
      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Detalle de Incidencia
            </DialogTitle>
          </DialogHeader>

          {selectedIncident && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-6 pb-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={
                      selectedIncident.resolved
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-warning/10 text-warning border-warning/20'
                    }
                  >
                    {selectedIncident.resolved ? 'Resuelta' : 'Pendiente'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(selectedIncident.created_at), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
                  </span>
                </div>

                {/* Photo */}
                {selectedIncident.photo_url && (
                  <div className="rounded-xl overflow-hidden bg-muted">
                    <img
                      src={selectedIncident.photo_url}
                      alt="Foto de la incidencia"
                      className="w-full max-h-64 object-contain"
                    />
                  </div>
                )}

                {/* Description */}
                <div>
                  <Label className="text-muted-foreground">Descripción</Label>
                  <p className="mt-1 text-foreground">{selectedIncident.description}</p>
                </div>

                {/* Worker Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Reportado por</Label>
                    <p className="mt-1 font-medium">{selectedIncident.worker_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedIncident.worker_email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Ubicación</Label>
                    <p className="mt-1 font-medium">{selectedIncident.location_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedIncident.location_address}</p>
                  </div>
                </div>

                {/* Resolution Info */}
                {selectedIncident.resolved && (
                  <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="font-medium text-success">Resuelta</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Por {selectedIncident.resolver_name || 'Admin'} el{' '}
                      {selectedIncident.resolved_at &&
                        format(new Date(selectedIncident.resolved_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                    {selectedIncident.resolution_notes && (
                      <p className="mt-2 text-sm">{selectedIncident.resolution_notes}</p>
                    )}
                  </div>
                )}

                {/* Resolution Form */}
                {!selectedIncident.resolved && (
                  <div className="space-y-3">
                    <Label htmlFor="resolution">Notas de resolución (opcional)</Label>
                    <Textarea
                      id="resolution"
                      placeholder="Describe cómo se resolvió la incidencia..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="border-t pt-4">
            {selectedIncident?.resolved ? (
              <Button
                variant="outline"
                onClick={() => {
                  handleReopen(selectedIncident.id);
                  setSelectedIncident(null);
                }}
              >
                Reabrir Incidencia
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setSelectedIncident(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleResolve} disabled={resolving}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {resolving ? 'Resolviendo...' : 'Marcar como Resuelta'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
