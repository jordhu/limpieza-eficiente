import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns';

interface DashboardStats {
  activeWorkers: number;
  totalHoursToday: number;
  totalHoursWeek: number;
  totalHoursMonth: number;
  pendingIncidents: number;
  locationsCount: number;
  totalWorkers: number;
}

interface ActiveWorker {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'break' | 'inactive';
  hoursToday: number;
  entryId: string;
  startTime: Date;
}

interface RecentActivityItem {
  id: string;
  type: 'check-in' | 'check-out' | 'incident';
  user: string;
  location: string;
  time: string;
  description?: string;
}

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>({
    activeWorkers: 0,
    totalHoursToday: 0,
    totalHoursWeek: 0,
    totalHoursMonth: 0,
    pendingIncidents: 0,
    locationsCount: 0,
    totalWorkers: 0,
  });
  const [activeWorkers, setActiveWorkers] = useState<ActiveWorker[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const monthStart = startOfMonth(now).toISOString();

    try {
      // Fetch all data in parallel
      const [
        activeEntriesResult,
        todayEntriesResult,
        weekEntriesResult,
        monthEntriesResult,
        incidentsResult,
        locationsResult,
        workersResult,
        recentEntriesResult,
        recentIncidentsResult,
      ] = await Promise.all([
        // Active workers (entries without end_time)
        supabase
          .from('time_entries')
          .select(`
            id,
            user_id,
            start_time,
            location_id,
            profiles!inner(name),
            work_locations(name)
          `)
          .is('end_time', null),
        
        // Today's entries for hours calculation
        supabase
          .from('time_entries')
          .select('id, user_id, start_time, end_time')
          .gte('start_time', todayStart)
          .lte('start_time', todayEnd),
        
        // This week's entries
        supabase
          .from('time_entries')
          .select('id, start_time, end_time')
          .gte('start_time', weekStart),
        
        // This month's entries
        supabase
          .from('time_entries')
          .select('id, start_time, end_time')
          .gte('start_time', monthStart),
        
        // Pending incidents
        supabase
          .from('incidents')
          .select('id')
          .eq('resolved', false),
        
        // Locations count
        supabase.from('work_locations').select('id'),
        
        // Total workers count
        supabase
          .from('user_roles')
          .select('id')
          .eq('role', 'worker'),
        
        // Recent time entries for activity feed
        supabase
          .from('time_entries')
          .select(`
            id,
            user_id,
            start_time,
            end_time,
            profiles!inner(name),
            work_locations(name)
          `)
          .gte('start_time', todayStart)
          .order('start_time', { ascending: false })
          .limit(10),
        
        // Recent incidents for activity feed
        supabase
          .from('incidents')
          .select(`
            id,
            user_id,
            created_at,
            description,
            profiles!inner(name),
            work_locations(name)
          `)
          .gte('created_at', todayStart)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // Calculate hours from entries
      const calculateHours = (entries: any[]): number => {
        return entries.reduce((total, entry) => {
          const start = new Date(entry.start_time);
          const end = entry.end_time ? new Date(entry.end_time) : new Date();
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return total + hours;
        }, 0);
      };

      // Process active workers
      const activeWorkersData: ActiveWorker[] = (activeEntriesResult.data || []).map((entry) => {
        const startTime = new Date(entry.start_time);
        const hoursToday = (Date.now() - startTime.getTime()) / (1000 * 60 * 60);
        
        return {
          id: entry.user_id,
          name: (entry.profiles as any)?.name || 'Desconocido',
          location: (entry.work_locations as any)?.name || 'Sin ubicación',
          status: 'active' as const,
          hoursToday: Math.round(hoursToday * 10) / 10,
          entryId: entry.id,
          startTime,
        };
      });

      // Process recent activity
      const activityItems: RecentActivityItem[] = [];
      
      // Add time entries to activity
      (recentEntriesResult.data || []).forEach((entry) => {
        const time = new Date(entry.start_time).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        activityItems.push({
          id: `entry-${entry.id}`,
          type: 'check-in',
          user: (entry.profiles as any)?.name || 'Desconocido',
          location: (entry.work_locations as any)?.name || 'Sin ubicación',
          time,
        });
        
        if (entry.end_time) {
          const endTime = new Date(entry.end_time).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          activityItems.push({
            id: `exit-${entry.id}`,
            type: 'check-out',
            user: (entry.profiles as any)?.name || 'Desconocido',
            location: (entry.work_locations as any)?.name || 'Sin ubicación',
            time: endTime,
          });
        }
      });
      
      // Add incidents to activity
      (recentIncidentsResult.data || []).forEach((incident) => {
        const time = new Date(incident.created_at).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        activityItems.push({
          id: `incident-${incident.id}`,
          type: 'incident',
          user: (incident.profiles as any)?.name || 'Desconocido',
          location: (incident.work_locations as any)?.name || 'Sin ubicación',
          time,
          description: incident.description,
        });
      });
      
      // Sort by time (most recent first)
      activityItems.sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return (timeB[0] * 60 + timeB[1]) - (timeA[0] * 60 + timeA[1]);
      });

      setStats({
        activeWorkers: activeEntriesResult.data?.length || 0,
        totalHoursToday: Math.round(calculateHours(todayEntriesResult.data || []) * 10) / 10,
        totalHoursWeek: Math.round(calculateHours(weekEntriesResult.data || []) * 10) / 10,
        totalHoursMonth: Math.round(calculateHours(monthEntriesResult.data || [])),
        pendingIncidents: incidentsResult.data?.length || 0,
        locationsCount: locationsResult.data?.length || 0,
        totalWorkers: workersResult.data?.length || 0,
      });
      
      setActiveWorkers(activeWorkersData);
      setRecentActivity(activityItems.slice(0, 10));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set up realtime subscription for live updates
  useEffect(() => {
    fetchDashboardData();

    // Subscribe to time_entries changes
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_entries' },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    stats,
    activeWorkers,
    recentActivity,
    loading,
    refresh: fetchDashboardData,
  };
}
