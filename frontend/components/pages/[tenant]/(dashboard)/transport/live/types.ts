// Shared types for the Live Transport page (Phase 6c).

export type GqlLiveVehicle = {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: number;
  status: string;
  routeId?: string | null;
  routeName?: string | null;
  latitude: number;
  longitude: number;
  lastPingAt?: string | null;
  driverEmployeeId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
};

export type GqlDriverAttendance = {
  id: string;
  employeeId: string;
  employeeName: string;
  vehicleId?: string | null;
  vehicleNumber?: string | null;
  date: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status: string;
};

/** A vehicle has never reported when lat/lng are both still zero. */
export function hasPosition(v: GqlLiveVehicle): boolean {
  return !!v.lastPingAt && !(v.latitude === 0 && v.longitude === 0);
}

/**
 * Minutes since the last ping, or null when never tracked. Used to fade
 * vehicles whose position is too old to trust.
 */
export function minutesSincePing(v: GqlLiveVehicle): number | null {
  if (!v.lastPingAt) return null;
  const then = new Date(v.lastPingAt).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.round((Date.now() - then) / 60000));
}

/** Human label for ping age: "live", "8m ago", or "never". */
export function pingLabel(v: GqlLiveVehicle): string {
  const mins = minutesSincePing(v);
  if (mins === null) return "never";
  if (mins < 2) return "live";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}
