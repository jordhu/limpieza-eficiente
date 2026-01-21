import { Clock, LogIn, LogOut, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'check-in' | 'check-out' | 'incident';
  user: string;
  location: string;
  time: string;
  description?: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const icons = {
    'check-in': LogIn,
    'check-out': LogOut,
    incident: AlertTriangle,
  };

  const iconStyles = {
    'check-in': 'bg-success/10 text-success',
    'check-out': 'bg-primary/10 text-primary',
    incident: 'bg-warning/10 text-warning',
  };

  const labels = {
    'check-in': 'Entrada',
    'check-out': 'Salida',
    incident: 'Incidencia',
  };

  return (
    <div className="card-elevated">
      <div className="p-6 border-b border-border">
        <h3 className="font-semibold text-lg">Actividad Reciente</h3>
        <p className="text-sm text-muted-foreground">Últimos movimientos</p>
      </div>
      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
        {activities.map((activity) => {
          const Icon = icons[activity.type];
          return (
            <div key={activity.id} className="flex gap-3">
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                  iconStyles[activity.type]
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{activity.user}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {labels[activity.type]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {activity.location}
                </p>
                {activity.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock className="w-3 h-3" />
                {activity.time}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
