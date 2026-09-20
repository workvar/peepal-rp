// Who may do what on the Appointments page.
//
// The backend already scopes the list: admins and front-desk staff get the
// whole tenant, everybody else only sees bookings where they are the
// clinician. So a non-admin, non-staff user can safely be treated as the
// owner of every row that reaches this component.

export type AppointmentPerms = {
  /** Book, reschedule, edit details, delete. */
  canModify: boolean;
  /** Accept (complete) or decline (cancel) a booking. */
  canDecide: boolean;
  /** Sees other clinicians' bookings, so the Clinician column matters. */
  seesAllClinicians: boolean;
};

export function appointmentPerms(role?: string | null): AppointmentPerms {
  const isAdmin = role === "admin" || role === "super_admin";
  const isStaff = role === "staff";

  return {
    canModify: isAdmin || isStaff,
    canDecide: isAdmin || (!isStaff && !!role),
    seesAllClinicians: isAdmin || isStaff,
  };
}
