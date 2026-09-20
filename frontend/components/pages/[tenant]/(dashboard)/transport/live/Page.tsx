"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useAppSelector } from "@/store/hooks";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { Plus, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { LIST_LIVE_VEHICLES, LIST_DRIVER_ATTENDANCE } from "@/graphql/queries/campus";
import { MARK_DRIVER_ATTENDANCE, DELETE_DRIVER_ATTENDANCE } from "@/graphql/mutations/campus";
import { LIST_EMPLOYEE_OPTIONS } from "@/graphql/queries/hr";
import LiveMap from "./LiveMap";
import VehicleTable from "./VehicleTable";
import DriverAttendanceTable from "./DriverAttendanceTable";
import DriverAttendanceModal, { type DriverForm, type PickerEmployee } from "./DriverAttendanceModal";
import type { GqlDriverAttendance, GqlLiveVehicle } from "./types";

export default function LiveTransportPage() {
  const user = useAppSelector((s) => s.auth.user);
  const canWrite = user?.role === "admin" || user?.role === "super_admin" || user?.role === "staff";

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // Vehicles poll so the map keeps up with pings without a manual refresh.
  const { data: vehicleData, loading: vehiclesLoading, refetch } = useQuery(LIST_LIVE_VEHICLES, {
    pollInterval: 30000,
  });
  const attendanceVars = { date, from: null, to: null, employeeId: null, vehicleId: null };
  const { data: attendanceData } = useQuery(LIST_DRIVER_ATTENDANCE, { variables: attendanceVars });
  const { data: employeeData } = useQuery(LIST_EMPLOYEE_OPTIONS);

  const [markMut] = useMutation(MARK_DRIVER_ATTENDANCE, {
    refetchQueries: [{ query: LIST_DRIVER_ATTENDANCE, variables: attendanceVars }],
  });
  const [deleteMut] = useMutation(DELETE_DRIVER_ATTENDANCE, {
    refetchQueries: [{ query: LIST_DRIVER_ATTENDANCE, variables: attendanceVars }],
  });

  const vehicles: GqlLiveVehicle[] = vehicleData?.liveVehicles ?? [];
  const attendance: GqlDriverAttendance[] = attendanceData?.driverAttendance ?? [];
  const employees: PickerEmployee[] = employeeData?.employees ?? [];

  const saveAttendance = async (form: DriverForm) => {
    try {
      await markMut({
        variables: {
          input: {
            employeeId: form.employee_id,
            vehicleId: form.vehicle_id || null,
            date: form.date,
            checkInAt: form.check_in_at || null,
            checkOutAt: form.check_out_at || null,
            status: form.status,
          },
        },
      });
      toast.success("Attendance recorded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record attendance");
      throw err;
    }
  };

  const removeAttendance = (row: GqlDriverAttendance) =>
    setConfirmState({
      title: "Delete Attendance",
      message: `${row.employeeName}'s ${row.date} record will be removed.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteMut({ variables: { id: row.id } });
        toast.success("Deleted");
      },
    });

  return (
    <div className="space-y-6">
      <Header
        title="Live Transport"
        subtitle="Vehicle positions and driver attendance"
        action={
          <button className="btn-secondary flex items-center gap-2" onClick={() => refetch()}>
            <RefreshCw size={16} /> Refresh
          </button>
        }
      />

      {vehiclesLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <LiveMap vehicles={vehicles} selectedId={selectedId} onSelect={(v) => setSelectedId(v.id)} />
          <VehicleTable vehicles={vehicles} selectedId={selectedId} onSelect={(v) => setSelectedId(v.id)} />
        </>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground/70 block mb-1">Attendance date</label>
            <input type="date" className="input-field" value={date}
              onChange={(e) => setDate(e.target.value)} />
          </div>
          <Can module="transport-live" action="create">
            <button className="btn-primary flex items-center gap-2 self-end"
              onClick={() => setShowModal(true)}>
              <Plus size={16} /> Record Attendance
            </button>
          </Can>
        </div>

        <DriverAttendanceTable rows={attendance} canWrite={canWrite} onDelete={removeAttendance} />
      </div>

      <DriverAttendanceModal
        isOpen={showModal}
        date={date}
        employees={employees}
        vehicles={vehicles}
        onClose={() => setShowModal(false)}
        onSave={saveAttendance}
      />

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
