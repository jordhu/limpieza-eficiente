import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format, differenceInMinutes, startOfDay, endOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Clock, 
  Search, 
  RefreshCw,
  Calendar,
  MapPin,
  User,
  Filter
} from 'lucide-react';

interface TimeEntry {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  start_method: string;
  end_method: string | null;
  location_id: string | null;
  worker_name: string;
  location_name: string;
  hours: number;
}

type DateFilter = 'today' | 'week' | 'month' | 'all';

export default function TimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');

  useEffect(() => {
    fetchEntries();
  }, [dateFilter]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('time_entries')
        .select(`
          id,
          user_id,
          start_time,
          end_time,
          start_method,
          end_method,
          location_id,
          profiles(name),
          work_locations(name)
        `)
        .order('start_time', { ascending: false });

      // Apply date filter
      const now = new Date();
      if (dateFilter === 'today') {
        query = query.gte('start_time', startOfDay(now).toISOString());
      } else if (dateFilter === 'week') {
        query = query.gte('start_time', subDays(now, 7).toISOString());
      } else if (dateFilter === 'month') {
        query = query.gte('start_time', subDays(now, 30).toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const processedEntries: TimeEntry[] = (data || []).map((entry: any) => {
        const hours = entry.end_time 
          ? differenceInMinutes(new Date(entry.end_time), new Date(entry.start_time)) / 60
          : 0;

        return {
          id: entry.id,
          user_id: entry.user_id,
          start_time: entry.start_time,
          end_time: entry.end_time,
          start_method: entry.start_method,
          end_method: entry.end_method,
          location_id: entry.location_id,
          worker_name: entry.profiles?.name || 'Desconocido',
          location_name: entry.work_locations?.name || 'Sin ubicación',
          hours: Math.round(hours * 100) / 100
        };
      });

      setEntries(processedEntries);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      toast.error('Error al cargar los registros');
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.worker_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.location_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalHours = filteredEntries.reduce((acc, entry) => acc + entry.hours, 0);
  const activeEntries = entries.filter(e => !e.end_time).length;

  const getMethodBadge = (method: string) => {
    const labels: Record<string, string> = {
      qr: 'QR',
      gps: 'GPS',
      manual: 'Manual'
    };
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      qr: 'default',
      gps: 'secondary',
      manual: 'outline'
    };
    return (
      <Badge variant={variants[method] || 'outline'} className="text-xs">
        {labels[method] || method}
      </Badge>
    );
  };

  const getDateFilterLabel = (filter: DateFilter) => {
    const labels: Record<DateFilter, string> = {
      today: 'Hoy',
      week: 'Última semana',
      month: 'Último mes',
      all: 'Todos'
    };
    return labels[filter];
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Registros de Fichaje</h1>
            <p className="text-muted-foreground">Historial de entradas y salidas de los trabajadores</p>
          </div>
          <Button variant="outline" onClick={fetchEntries} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Registros</p>
                <p className="text-2xl font-bold">{filteredEntries.length}</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-success/10">
                <Calendar className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas Totales</p>
                <p className="text-2xl font-bold">{Math.round(totalHours * 10) / 10}h</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-warning/10">
                <User className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fichajes Activos</p>
                <p className="text-2xl font-bold">{activeEntries}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por trabajador o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mes</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="card-elevated">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron registros' : 'No hay registros en este período'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead>Método</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{entry.worker_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{entry.location_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(entry.start_time), "d MMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{format(new Date(entry.start_time), "HH:mm")}</span>
                          {getMethodBadge(entry.start_method)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.end_time ? (
                          <div className="flex items-center gap-2">
                            <span>{format(new Date(entry.end_time), "HH:mm")}</span>
                            {entry.end_method && getMethodBadge(entry.end_method)}
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            En curso
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.end_time ? `${entry.hours}h` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {getMethodBadge(entry.start_method)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
