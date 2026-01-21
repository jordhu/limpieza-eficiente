import { User, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Worker {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'inactive' | 'break';
  hoursToday: number;
  avatar?: string;
}

interface WorkersListProps {
  workers: Worker[];
}

export function WorkersList({ workers }: WorkersListProps) {
  const statusLabels = {
    active: 'Trabajando',
    inactive: 'Desconectado',
    break: 'En descanso',
  };

  const statusStyles = {
    active: 'status-active',
    inactive: 'status-inactive',
    break: 'status-warning',
  };

  return (
    <div className="card-elevated">
      <div className="p-6 border-b border-border">
        <h3 className="font-semibold text-lg">Trabajadores Activos</h3>
        <p className="text-sm text-muted-foreground">
          {workers.filter(w => w.status === 'active').length} de {workers.length} en servicio
        </p>
      </div>
      <div className="divide-y divide-border">
        {workers.map((worker) => (
          <div
            key={worker.id}
            className="p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {worker.avatar ? (
                  <img
                    src={worker.avatar}
                    alt={worker.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{worker.name}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{worker.location}</span>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    'inline-block px-2.5 py-1 rounded-full text-xs font-medium',
                    statusStyles[worker.status]
                  )}
                >
                  {statusLabels[worker.status]}
                </span>
                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground justify-end">
                  <Clock className="w-3 h-3" />
                  <span>{worker.hoursToday}h hoy</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
