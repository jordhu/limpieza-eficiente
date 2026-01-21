import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportParams {
  month: number;
  year: number;
  format: 'csv' | 'pdf';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generate report request received');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      console.error('User is not admin');
      return new Response(
        JSON.stringify({ error: 'Acceso denegado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { month, year, format }: ReportParams = await req.json();
    console.log(`Generating ${format} report for ${month}/${year}`);

    // Calculate date range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Fetch time entries with related data
    const { data: entries, error: entriesError } = await supabase
      .from('time_entries')
      .select(`
        id,
        user_id,
        start_time,
        end_time,
        start_method,
        end_method,
        profiles!inner(name, email),
        work_locations(name, address)
      `)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (entriesError) {
      console.error('Error fetching entries:', entriesError);
      throw entriesError;
    }

    console.log(`Found ${entries?.length || 0} entries`);

    // Process data for report
    const workerStats: Record<string, {
      name: string;
      email: string;
      totalHours: number;
      entries: number;
      locations: Set<string>;
    }> = {};

    const locationStats: Record<string, {
      name: string;
      address: string;
      totalHours: number;
      entries: number;
      workers: Set<string>;
    }> = {};

    const detailedEntries: Array<{
      date: string;
      worker: string;
      location: string;
      startTime: string;
      endTime: string;
      hours: number;
      method: string;
    }> = [];

    (entries || []).forEach((entry: any) => {
      const startTime = new Date(entry.start_time);
      const endTime = entry.end_time ? new Date(entry.end_time) : new Date();
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      const workerName = entry.profiles?.name || 'Desconocido';
      const workerEmail = entry.profiles?.email || '';
      const locationName = entry.work_locations?.name || 'Sin ubicación';
      const locationAddress = entry.work_locations?.address || '';

      // Worker stats
      if (!workerStats[entry.user_id]) {
        workerStats[entry.user_id] = {
          name: workerName,
          email: workerEmail,
          totalHours: 0,
          entries: 0,
          locations: new Set(),
        };
      }
      workerStats[entry.user_id].totalHours += hours;
      workerStats[entry.user_id].entries += 1;
      workerStats[entry.user_id].locations.add(locationName);

      // Location stats
      const locKey = entry.location_id || 'unknown';
      if (!locationStats[locKey]) {
        locationStats[locKey] = {
          name: locationName,
          address: locationAddress,
          totalHours: 0,
          entries: 0,
          workers: new Set(),
        };
      }
      locationStats[locKey].totalHours += hours;
      locationStats[locKey].entries += 1;
      locationStats[locKey].workers.add(workerName);

      // Detailed entry
      detailedEntries.push({
        date: startTime.toLocaleDateString('es-ES'),
        worker: workerName,
        location: locationName,
        startTime: startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        endTime: entry.end_time 
          ? endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          : 'En curso',
        hours: Math.round(hours * 100) / 100,
        method: entry.start_method?.toUpperCase() || 'N/A',
      });
    });

    // Calculate totals
    const totalHours = Object.values(workerStats).reduce((sum, w) => sum + w.totalHours, 0);
    const totalEntries = Object.values(workerStats).reduce((sum, w) => sum + w.entries, 0);

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthName = monthNames[month - 1];

    if (format === 'csv') {
      // Generate CSV
      const lines: string[] = [];
      
      // Header
      lines.push(`REPORTE MENSUAL DE HORAS - ${monthName} ${year}`);
      lines.push('');
      
      // Summary
      lines.push('RESUMEN GENERAL');
      lines.push(`Total Horas,${Math.round(totalHours * 10) / 10}`);
      lines.push(`Total Fichajes,${totalEntries}`);
      lines.push(`Trabajadores Activos,${Object.keys(workerStats).length}`);
      lines.push(`Ubicaciones,${Object.keys(locationStats).length}`);
      lines.push('');
      
      // Worker summary
      lines.push('HORAS POR TRABAJADOR');
      lines.push('Nombre,Email,Horas Totales,Fichajes,Ubicaciones');
      Object.values(workerStats)
        .sort((a, b) => b.totalHours - a.totalHours)
        .forEach(worker => {
          lines.push(`"${worker.name}","${worker.email}",${Math.round(worker.totalHours * 10) / 10},${worker.entries},${worker.locations.size}`);
        });
      lines.push('');
      
      // Location summary
      lines.push('HORAS POR UBICACIÓN');
      lines.push('Ubicación,Dirección,Horas Totales,Fichajes,Trabajadores');
      Object.values(locationStats)
        .sort((a, b) => b.totalHours - a.totalHours)
        .forEach(loc => {
          lines.push(`"${loc.name}","${loc.address}",${Math.round(loc.totalHours * 10) / 10},${loc.entries},${loc.workers.size}`);
        });
      lines.push('');
      
      // Detailed entries
      lines.push('DETALLE DE FICHAJES');
      lines.push('Fecha,Trabajador,Ubicación,Entrada,Salida,Horas,Método');
      detailedEntries.forEach(entry => {
        lines.push(`${entry.date},"${entry.worker}","${entry.location}",${entry.startTime},${entry.endTime},${entry.hours},${entry.method}`);
      });

      const csv = lines.join('\n');
      
      console.log('CSV generated successfully');
      
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="reporte_${monthName}_${year}.csv"`,
        },
      });
    } else {
      // Generate HTML for PDF (client will convert to PDF)
      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte ${monthName} ${year}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #3b82f6; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #3b82f6; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #e5e5e5; }
    tr:hover { background: #f9fafb; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .stat-box { background: #f3f4f6; padding: 20px; border-radius: 8px; flex: 1; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #3b82f6; }
    .stat-label { color: #6b7280; font-size: 14px; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <h1>📊 Reporte Mensual de Horas</h1>
  <p><strong>${monthName} ${year}</strong> - CleanTrack</p>
  
  <div class="summary">
    <div class="stat-box">
      <div class="stat-value">${Math.round(totalHours * 10) / 10}h</div>
      <div class="stat-label">Horas Totales</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${totalEntries}</div>
      <div class="stat-label">Fichajes</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${Object.keys(workerStats).length}</div>
      <div class="stat-label">Trabajadores</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${Object.keys(locationStats).length}</div>
      <div class="stat-label">Ubicaciones</div>
    </div>
  </div>

  <h2>👥 Horas por Trabajador</h2>
  <table>
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Email</th>
        <th>Horas</th>
        <th>Fichajes</th>
        <th>Ubicaciones</th>
      </tr>
    </thead>
    <tbody>
      ${Object.values(workerStats)
        .sort((a, b) => b.totalHours - a.totalHours)
        .map(w => `
          <tr>
            <td>${w.name}</td>
            <td>${w.email}</td>
            <td><strong>${Math.round(w.totalHours * 10) / 10}h</strong></td>
            <td>${w.entries}</td>
            <td>${w.locations.size}</td>
          </tr>
        `).join('')}
    </tbody>
  </table>

  <h2>📍 Horas por Ubicación</h2>
  <table>
    <thead>
      <tr>
        <th>Ubicación</th>
        <th>Dirección</th>
        <th>Horas</th>
        <th>Fichajes</th>
        <th>Trabajadores</th>
      </tr>
    </thead>
    <tbody>
      ${Object.values(locationStats)
        .sort((a, b) => b.totalHours - a.totalHours)
        .map(l => `
          <tr>
            <td>${l.name}</td>
            <td>${l.address}</td>
            <td><strong>${Math.round(l.totalHours * 10) / 10}h</strong></td>
            <td>${l.entries}</td>
            <td>${l.workers.size}</td>
          </tr>
        `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}</p>
    <p>CleanTrack - Sistema de Control de Asistencia</p>
  </div>
</body>
</html>`;

      console.log('HTML report generated successfully');
      
      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({ error: 'Error al generar el reporte' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
