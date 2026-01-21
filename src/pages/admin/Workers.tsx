import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  Clock, 
  Eye,
  Mail,
  Calendar
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Worker {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
  hoursThisMonth: number;
  hoursTotal: number;
  lastEntry: string | null;
}

interface WorkerDetails {
  worker: Worker;
  recentEntries: {
    id: string;
    start_time: string;
    end_time: string | null;
    location_name: string | null;
    hours: number;
  }[];
}

export default function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<WorkerDetails | null>(null);
  const [workerToToggle, setWorkerToToggle] = useState<Worker | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      // Fetch all workers (users with worker role)
      const { data: workerRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'worker');

      if (rolesError) throw rolesError;

      if (!workerRoles || workerRoles.length === 0) {
        setWorkers([]);
        setLoading(false);
        return;
      }

      const workerUserIds = workerRoles.map(r => r.user_id);

      // Fetch profiles for workers
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', workerUserIds);

      if (profilesError) throw profilesError;

      // Fetch time entries for all workers
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const { data: timeEntries, error: entriesError } = await supabase
        .from('time_entries')
        .select('*')
        .in('user_id', workerUserIds);

      if (entriesError) throw entriesError;

      // Calculate hours for each worker
      const workersData: Worker[] = (profiles || []).map(profile => {
        const workerEntries = (timeEntries || []).filter(e => e.user_id === profile.user_id);
        
        // Hours this month
        const monthEntries = workerEntries.filter(e => {
          const start = new Date(e.start_time);
          return start >= monthStart && start <= monthEnd;
        });

        const hoursThisMonth = monthEntries.reduce((acc, entry) => {
          if (entry.end_time) {
            const mins = differenceInMinutes(new Date(entry.end_time), new Date(entry.start_time));
            return acc + mins / 60;
          }
          return acc;
        }, 0);

        // Total hours
        const hoursTotal = workerEntries.reduce((acc, entry) => {
          if (entry.end_time) {
            const mins = differenceInMinutes(new Date(entry.end_time), new Date(entry.start_time));
            return acc + mins / 60;
          }
          return acc;
        }, 0);

        // Last entry
        const sortedEntries = workerEntries.sort((a, b) => 
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );
        const lastEntry = sortedEntries.length > 0 ? sortedEntries[0].start_time : null;

        return {
          id: profile.id,
          user_id: profile.user_id,
          name: profile.name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          active: profile.active ?? true,
          created_at: profile.created_at,
          hoursThisMonth: Math.round(hoursThisMonth * 100) / 100,
          hoursTotal: Math.round(hoursTotal * 100) / 100,
          lastEntry
        };
      });

      setWorkers(workersData);
    } catch (error) {
      console.error('Error fetching workers:', error);
      toast.error('Error al cargar los trabajadores');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (worker: Worker) => {
    try {
      // Fetch recent time entries with location names
      const { data: entries, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          start_time,
          end_time,
          location_id,
          work_locations(name)
        `)
        .eq('user_id', worker.user_id)
        .order('start_time', { ascending: false })
        .limit(10);

      if (error) throw error;

      const recentEntries = (entries || []).map(entry => {
        const hours = entry.end_time 
          ? differenceInMinutes(new Date(entry.end_time), new Date(entry.start_time)) / 60
          : 0;
        
        return {
          id: entry.id,
          start_time: entry.start_time,
          end_time: entry.end_time,
          location_name: entry.work_locations?.name || null,
          hours: Math.round(hours * 100) / 100
        };
      });

      setSelectedWorker({ worker, recentEntries });
    } catch (error) {
      console.error('Error fetching worker details:', error);
      toast.error('Error al cargar los detalles del trabajador');
    }
  };

  const handleToggleActive = async () => {
    if (!workerToToggle) return;

    setToggling(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: !workerToToggle.active })
        .eq('id', workerToToggle.id);

      if (error) throw error;

      toast.success(
        workerToToggle.active 
          ? 'Trabajador desactivado correctamente' 
          : 'Trabajador activado correctamente'
      );
      fetchWorkers();
    } catch (error) {
      console.error('Error toggling worker status:', error);
      toast.error('Error al cambiar el estado del trabajador');
    } finally {
      setToggling(false);
      setWorkerToToggle(null);
    }
  };

  const filteredWorkers = workers.filter(worker =>
    worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = workers.filter(w => w.active).length;
  const inactiveCount = workers.filter(w => !w.active).length;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Trabajadores</h1>
          <p className="text-muted-foreground">Administra los empleados y sus horas de trabajo</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Trabajadores</p>
              <p className="text-2xl font-bold">{workers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 rounded-xl bg-green-500/10">
              <UserCheck className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Activos</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 rounded-xl bg-destructive/10">
              <UserX className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inactivos</p>
              <p className="text-2xl font-bold">{inactiveCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workers List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Lista de Trabajadores</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar trabajador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredWorkers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron trabajadores' : 'No hay trabajadores registrados'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Horas (Mes)</TableHead>
                    <TableHead className="text-right">Horas (Total)</TableHead>
                    <TableHead>Último Fichaje</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkers.map((worker) => (
                    <TableRow key={worker.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={worker.avatar_url || undefined} />
                            <AvatarFallback>{getInitials(worker.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{worker.name}</p>
                            <p className="text-sm text-muted-foreground">{worker.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={worker.active ? 'default' : 'secondary'}>
                          {worker.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {worker.hoursThisMonth}h
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {worker.hoursTotal}h
                      </TableCell>
                      <TableCell>
                        {worker.lastEntry ? (
                          <span className="text-sm">
                            {format(new Date(worker.lastEntry), "d MMM yyyy, HH:mm", { locale: es })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin fichajes</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(worker)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setWorkerToToggle(worker)}
                          >
                            {worker.active ? (
                              <UserX className="h-4 w-4 text-destructive" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Worker Details Dialog */}
      <Dialog open={!!selectedWorker} onOpenChange={() => setSelectedWorker(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Trabajador</DialogTitle>
          </DialogHeader>
          {selectedWorker && (
            <div className="space-y-6">
              {/* Worker Info */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedWorker.worker.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(selectedWorker.worker.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{selectedWorker.worker.name}</h3>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{selectedWorker.worker.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Registrado: {format(new Date(selectedWorker.worker.created_at), "d MMMM yyyy", { locale: es })}
                    </span>
                  </div>
                </div>
                <Badge variant={selectedWorker.worker.active ? 'default' : 'secondary'}>
                  {selectedWorker.worker.active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>

              {/* Hours Summary */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Horas este mes</p>
                      <p className="text-xl font-bold">{selectedWorker.worker.hoursThisMonth}h</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Horas totales</p>
                      <p className="text-xl font-bold">{selectedWorker.worker.hoursTotal}h</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Entries */}
              <div>
                <h4 className="font-semibold mb-3">Últimos Fichajes</h4>
                {selectedWorker.recentEntries.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Sin fichajes recientes</p>
                ) : (
                  <div className="space-y-2">
                    {selectedWorker.recentEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {format(new Date(entry.start_time), "d MMM yyyy", { locale: es })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {entry.location_name || 'Ubicación desconocida'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">
                            {format(new Date(entry.start_time), "HH:mm")} - {' '}
                            {entry.end_time 
                              ? format(new Date(entry.end_time), "HH:mm")
                              : 'En curso'}
                          </p>
                          {entry.end_time && (
                            <p className="text-sm font-medium text-primary">{entry.hours}h</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Toggle Active Confirmation */}
      <AlertDialog open={!!workerToToggle} onOpenChange={() => setWorkerToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {workerToToggle?.active ? 'Desactivar trabajador' : 'Activar trabajador'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {workerToToggle?.active 
                ? `¿Estás seguro de que quieres desactivar a ${workerToToggle?.name}? No podrá acceder a la aplicación.`
                : `¿Estás seguro de que quieres activar a ${workerToToggle?.name}? Podrá volver a acceder a la aplicación.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              disabled={toggling}
              className={workerToToggle?.active ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {toggling ? 'Procesando...' : workerToToggle?.active ? 'Desactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
