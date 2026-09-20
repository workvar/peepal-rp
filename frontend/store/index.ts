import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import tenantReducer from "./slices/tenantSlice";
import orgReducer from "./slices/orgSlice";
import holidayReducer from "./slices/holidaySlice";
import calendarReducer from "./slices/calendarSlice";
import notificationReducer from "./slices/notificationSlice";
import reportReducer from "./slices/reportSlice";
import subscriptionReducer from "./slices/subscriptionSlice";
import quotaReducer from "./slices/quotaSlice";
import timetableReducer from "./slices/timetableSlice";
import hostelReducer from "./slices/hostelSlice";
import transportReducer from "./slices/transportSlice";
import libraryReducer from "./slices/librarySlice";
import terminologyReducer from "./slices/terminologySlice";
import accessReducer from "./slices/accessSlice";

// Slices removed during the GraphQL migration — their data is now read/written
// through Apollo (useQuery / useMutation) directly in the relevant page
// components. See:
//   employees, students, users, attendance, marks, leaves, leaveType,
//   academic, payroll, fee, events, results — all migrated to Apollo.

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tenant: tenantReducer,
    org: orgReducer,
    holiday: holidayReducer,
    calendar: calendarReducer,
    notification: notificationReducer,
    report: reportReducer,
    subscription: subscriptionReducer,
    quota: quotaReducer,
    timetable: timetableReducer,
    hostel: hostelReducer,
    transport: transportReducer,
    library: libraryReducer,
    terminology: terminologyReducer,
    access: accessReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
