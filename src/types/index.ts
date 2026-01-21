export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'worker';
  avatar?: string;
  createdAt: Date;
}

export interface WorkLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  qrCode: string;
  radiusMeters: number;
}

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  locationId: string;
  locationName: string;
  startTime: Date;
  endTime?: Date;
  startMethod: 'qr' | 'gps' | 'manual';
  endMethod?: 'qr' | 'gps' | 'manual';
  startCoords?: { lat: number; lng: number };
  endCoords?: { lat: number; lng: number };
  synced: boolean;
  notes?: string;
}

export interface Incident {
  id: string;
  userId: string;
  userName: string;
  locationId: string;
  locationName: string;
  description: string;
  photoUrl?: string;
  createdAt: Date;
  resolved: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  code: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}

export interface DashboardStats {
  activeWorkers: number;
  totalHoursToday: number;
  totalHoursWeek: number;
  totalHoursMonth: number;
  pendingIncidents: number;
  locationsCount: number;
}
