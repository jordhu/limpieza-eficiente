import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { WorkersList } from '@/components/dashboard/WorkersList';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Users, Clock, MapPin, AlertTriangle, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { stats, activeWorkers, recentActivity, loading, refresh } = useDashboardData();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Calculate average hours per worker
  const avgHoursPerWorker = stats.totalWorkers > 0 
    ? Math.round((stats.totalHoursMonth / stats.totalWorkers) * 10) / 10 
    : 0;

  // Format workers for WorkersList component
  const formattedWorkers = activeWorkers.map(w => ({
    id: w.id,
    name: w.name,
    location: w.location,
    status: w.status,
    hoursToday: w.hoursToday,
  }));

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Resumen de la actividad en tiempo real
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button variant="default" className="gap-2">
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="stat-card p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Trabajadores Activos"
                value={stats.activeWorkers}
                subtitle={`de ${stats.totalWorkers} registrados`}
                icon={Users}
                variant="primary"
              />
              <StatCard
                title="Horas Hoy"
                value={`${stats.totalHoursToday}h`}
                subtitle="acumuladas"
                icon={Clock}
                variant="success"
              />
              <StatCard
                title="Ubicaciones"
                value={stats.locationsCount}
                subtitle="activas"
                icon={MapPin}
                variant="default"
              />
              <StatCard
                title="Incidencias"
                value={stats.pendingIncidents}
                subtitle="pendientes"
                icon={AlertTriangle}
                variant={stats.pendingIncidents > 0 ? 'warning' : 'default'}
              />
            </>
          )}
        </div>

        {/* Hours Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="stat-card p-6">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Esta semana</p>
                    <p className="text-2xl font-bold">{stats.totalHoursWeek}h</p>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-success/10">
                    <Calendar className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Este mes</p>
                    <p className="text-2xl font-bold">{stats.totalHoursMonth}h</p>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <Users className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Promedio/trabajador</p>
                    <p className="text-2xl font-bold">{avgHoursPerWorker}h</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Workers and Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {loading ? (
            <>
              <div className="card-elevated p-6">
                <Skeleton className="h-6 w-40 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </div>
              <div className="card-elevated p-6">
                <Skeleton className="h-6 w-40 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <WorkersList workers={formattedWorkers} />
              <RecentActivity activities={recentActivity} />
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
