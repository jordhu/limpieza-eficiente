import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, MapPin, Calendar, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistance, startOfWeek, startOfMonth, isWithinInterval, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface TimeEntryRecord {
  id: string;
  start_time: string;
  end_time: string | null;
  start_method: string;
  end_method: string | null;
  location_name: string;
  duration_hours: number | null;
}

type FilterPeriod = 'today' | 'week' | 'month' | 'all';

export default function TimeHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterPeriod>('week');

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          start_time,
          end_time,
          start_method,
          end_method,
          work_locations (name)
        `)
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedEntries: TimeEntryRecord[] = (data || []).map((entry) => {
        const startTime = new Date(entry.start_time);
        const endTime = entry.end_time ? new Date(entry.end_time) : null;
        const durationMs = endTime ? endTime.getTime() - startTime.getTime() : null;
        const durationHours = durationMs ? durationMs / (1000 * 60 * 60) : null;

        return {
          id: entry.id,
          start_time: entry.start_time,
          end_time: entry.end_time,
          start_method: entry.start_method,
          end_method: entry.end_method,
          location_name: (entry.work_locations as any)?.name || 'Ubicación desconocida',
          duration_hours: durationHours,
        };
      });

      setEntries(formattedEntries);
    } catch (err) {
      console.error('Error fetching time entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    const entryDate = new Date(entry.start_time);
    const now = new Date();

    switch (filter) {
      case 'today':
        return entryDate.toDateString() === now.toDateString();
      case 'week':
        const weekStart = startOfWeek(now, { locale: es });
        return isWithinInterval(entryDate, { start: weekStart, end: now });
      case 'month':
        const monthStart = startOfMonth(now);
        return isWithinInterval(entryDate, { start: monthStart, end: now });
      default:
        return true;
    }
  });

  const totalHours = filteredEntries.reduce((acc, entry) => {
    return acc + (entry.duration_hours || 0);
  }, 0);

  const formatDuration = (hours: number | null): string => {
    if (hours === null) return 'En curso';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getMethodBadge = (method: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      qr: { label: 'QR', className: 'bg-primary/10 text-primary border-primary/20' },
      gps: { label: 'GPS', className: 'bg-success/10 text-success border-success/20' },
      manual: { label: 'Manual', className: 'bg-muted text-muted-foreground border-muted' },
    };
    const config = variants[method] || variants.manual;
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/worker')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Historial de Fichajes</h1>
              <p className="text-xs text-muted-foreground">Tus registros de trabajo</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-6 py-6 space-y-6">
        {/* Summary Card */}
        <div className="card-elevated p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Resumen</h3>
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterPeriod)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="all">Todo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-primary">{totalHours.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Horas totales</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-success">{filteredEntries.length}</p>
              <p className="text-sm text-muted-foreground">Fichajes</p>
            </div>
          </div>
        </div>

        {/* Entries List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Registros ({filteredEntries.length})
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-elevated p-4 space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="card-elevated p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No hay registros en este período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => {
                const startDate = new Date(entry.start_time);
                const endDate = entry.end_time ? new Date(entry.end_time) : null;

                return (
                  <div key={entry.id} className="card-elevated p-4 space-y-3">
                    {/* Date and Location */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">
                          {format(startDate, "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{entry.location_name}</span>
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          entry.end_time
                            ? 'bg-success/10 text-success'
                            : 'bg-warning/10 text-warning'
                        }`}
                      >
                        {formatDuration(entry.duration_hours)}
                      </div>
                    </div>

                    {/* Times */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Entrada:</span>
                        <span className="font-medium">{format(startDate, 'HH:mm')}</span>
                        {getMethodBadge(entry.start_method)}
                      </div>
                      {endDate && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Salida:</span>
                          <span className="font-medium">{format(endDate, 'HH:mm')}</span>
                          {entry.end_method && getMethodBadge(entry.end_method)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
