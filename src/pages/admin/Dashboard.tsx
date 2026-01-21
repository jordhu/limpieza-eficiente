import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { WorkersList } from '@/components/dashboard/WorkersList';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Users, Clock, MapPin, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

// Mock data
const mockStats = {
  activeWorkers: 12,
  totalHoursToday: 87.5,
  totalHoursWeek: 412,
  totalHoursMonth: 1847,
  pendingIncidents: 3,
  locationsCount: 24,
};

const mockWorkers = [
  { id: '1', name: 'María García', location: 'Oficina Central', status: 'active' as const, hoursToday: 6.5 },
  { id: '2', name: 'Carlos López', location: 'Centro Comercial Norte', status: 'active' as const, hoursToday: 5.2 },
  { id: '3', name: 'Ana Martínez', location: 'Hospital San Juan', status: 'break' as const, hoursToday: 4.0 },
  { id: '4', name: 'Pedro Sánchez', location: 'Colegio La Paz', status: 'active' as const, hoursToday: 7.0 },
  { id: '5', name: 'Laura Fernández', location: 'Gimnasio Fitness', status: 'inactive' as const, hoursToday: 0 },
];

const mockActivities = [
  { id: '1', type: 'check-in' as const, user: 'María García', location: 'Oficina Central', time: '08:30' },
  { id: '2', type: 'check-in' as const, user: 'Carlos López', location: 'Centro Comercial Norte', time: '08:15' },
  { id: '3', type: 'incident' as const, user: 'Ana Martínez', location: 'Hospital San Juan', time: '07:45', description: 'Grifo roto en baño planta 2' },
  { id: '4', type: 'check-out' as const, user: 'Jorge Ruiz', location: 'Biblioteca Municipal', time: '07:00' },
  { id: '5', type: 'check-in' as const, user: 'Pedro Sánchez', location: 'Colegio La Paz', time: '06:30' },
];

export default function Dashboard() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Resumen de la actividad de hoy
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Hoy</span>
            </Button>
            <Button variant="default" className="gap-2">
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Trabajadores Activos"
            value={mockStats.activeWorkers}
            subtitle="en servicio ahora"
            icon={Users}
            variant="primary"
            trend={{ value: 8, positive: true }}
          />
          <StatCard
            title="Horas Hoy"
            value={`${mockStats.totalHoursToday}h`}
            subtitle="acumuladas"
            icon={Clock}
            variant="success"
            trend={{ value: 12, positive: true }}
          />
          <StatCard
            title="Ubicaciones"
            value={mockStats.locationsCount}
            subtitle="activas"
            icon={MapPin}
            variant="default"
          />
          <StatCard
            title="Incidencias"
            value={mockStats.pendingIncidents}
            subtitle="pendientes"
            icon={AlertTriangle}
            variant="warning"
          />
        </div>

        {/* Hours Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Esta semana</p>
                <p className="text-2xl font-bold">{mockStats.totalHoursWeek}h</p>
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
                <p className="text-2xl font-bold">{mockStats.totalHoursMonth}h</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-accent/10">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Promedio/trabajador</p>
                <p className="text-2xl font-bold">7.3h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Workers and Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <WorkersList workers={mockWorkers} />
          <RecentActivity activities={mockActivities} />
        </div>
      </div>
    </AdminLayout>
  );
}
