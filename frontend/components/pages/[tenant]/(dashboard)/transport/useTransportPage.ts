"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchRoutes, fetchVehicles, fetchAllocations,
  createRoute, updateRoute, createVehicle, updateVehicle, allocateVehicle, removeAllocation,
  bulkDeleteRoutes, bulkDeleteVehicles, bulkDeleteAllocations,
} from "@/store/slices/transportSlice";
import { sortRows, nextSort, type SortState } from "@/lib/tableSort";
import toast from "react-hot-toast";
import type { TransportRoute, TransportVehicle } from "@/types";

export const TRANSPORT_TABS = ["routes", "vehicles", "allocations", "visualizer"];

// All transport page state and handlers; Page.tsx and the modal consume this
// hook so they stay purely presentational.
export function useTransportPage(initialTab: string) {
  const dispatch = useAppDispatch();
  const params = useParams();
  const tenant = (params?.tenant as string) ?? "";
  const { routes, vehicles, allocations, loading } = useAppSelector((s) => s.transport);
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState(() => (TRANSPORT_TABS.includes(initialTab) ? initialTab : "routes"));

  // Reflect the active tab in the URL (/<tenant>/transport/<tab>) so it survives
  // a refresh and back/forward, without a route navigation (avoids a refetch).
  const selectTab = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") window.history.pushState(null, "", `/${tenant}/transport/${tab}`);
  };

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortState | null>(null);
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<TransportVehicle | null>(null);
  const [allocType, setAllocType] = useState<"student" | "staff">("student");
  const [allocIds, setAllocIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    route_name: "",
    start_point: "",
    end_point: "",
    stops: "",
    distance: "",
    vehicle_number: "",
    vehicle_type: "",
    capacity: "",
    driver_name: "",
    driver_phone: "",
    route_id: "",
    vehicle_id: "",
    pickup_stop: "",
  });

  useEffect(() => {
    dispatch(fetchRoutes());
    dispatch(fetchVehicles());
    dispatch(fetchAllocations());
  }, [dispatch]);

  // Keep the tab in sync when the user uses browser back/forward.
  useEffect(() => {
    const onPop = () => {
      const seg = window.location.pathname.split("/").filter(Boolean);
      const t = seg[seg.indexOf("transport") + 1];
      setActiveTab(TRANSPORT_TABS.includes(t) ? t : "routes");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Clear selection, sorting and search when switching tabs.
  useEffect(() => {
    setSelected(new Set());
    setSort(null);
    setSearch("");
  }, [activeTab]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSort = (key: string) => setSort((s) => nextSort(s, key));

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(
      createRoute({
        route_name: form.route_name,
        start_point: form.start_point,
        end_point: form.end_point,
        stops: form.stops,
        distance: parseFloat(form.distance),
      })
    );
    if (createRoute.fulfilled.match(result)) {
      toast.success("Route created");
      setForm({ ...form, route_name: "", start_point: "", end_point: "", stops: "", distance: "" });
      setShowModal(false);
    } else {
      toast.error(result.payload as string);
    }
  };

  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;
    const result = await dispatch(
      updateRoute({
        id: editingRoute.id,
        input: {
          route_name: form.route_name,
          start_point: form.start_point,
          end_point: form.end_point,
          stops: form.stops,
          distance: parseFloat(form.distance),
        },
      })
    );
    if (updateRoute.fulfilled.match(result)) {
      toast.success("Route updated");
      setForm({ ...form, route_name: "", start_point: "", end_point: "", stops: "", distance: "" });
      setShowModal(false);
      setEditingRoute(null);
    } else {
      toast.error(result.payload as string);
    }
  };

  const openEditRoute = (route: TransportRoute) => {
    setEditingRoute(route);
    setForm({
      ...form,
      route_name: route.route_name,
      start_point: route.start_point,
      end_point: route.end_point,
      stops: route.stops,
      distance: route.distance.toString(),
    });
    setShowModal(true);
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(
      createVehicle({
        vehicle_number: form.vehicle_number,
        vehicle_type: form.vehicle_type,
        capacity: parseInt(form.capacity),
        driver_name: form.driver_name,
        driver_phone: form.driver_phone,
        route_id: form.route_id,
      })
    );
    if (createVehicle.fulfilled.match(result)) {
      toast.success("Vehicle created");
      setForm({ ...form, vehicle_number: "", vehicle_type: "", capacity: "", driver_name: "", driver_phone: "", route_id: "" });
      setShowModal(false);
    } else {
      toast.error(result.payload as string);
    }
  };

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    const result = await dispatch(
      updateVehicle({
        id: editingVehicle.id,
        input: {
          vehicle_number: form.vehicle_number,
          vehicle_type: form.vehicle_type,
          capacity: parseInt(form.capacity),
          driver_name: form.driver_name,
          driver_phone: form.driver_phone,
          route_id: form.route_id,
        },
      })
    );
    if (updateVehicle.fulfilled.match(result)) {
      toast.success("Vehicle updated");
      setForm({ ...form, vehicle_number: "", vehicle_type: "", capacity: "", driver_name: "", driver_phone: "", route_id: "" });
      setShowModal(false);
      setEditingVehicle(null);
    } else {
      toast.error(result.payload as string);
    }
  };

  const openEditVehicle = (vehicle: TransportVehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      ...form,
      vehicle_number: vehicle.vehicle_number,
      vehicle_type: vehicle.vehicle_type,
      capacity: vehicle.capacity.toString(),
      driver_name: vehicle.driver_name,
      driver_phone: vehicle.driver_phone,
      route_id: vehicle.route_id,
    });
    setShowModal(true);
  };

  // Allocate every selected person (students or staff) to the chosen vehicle.
  // The GraphQL input is camelCase and startDate is required — default it to
  // today since the modal has no date field. Each person is one mutation, sent
  // with studentId or employeeId depending on the active type.
  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    const noun = allocType === "staff" ? "staff member" : "student";
    if (allocIds.length === 0) {
      toast.error(`Select at least one ${noun}`);
      return;
    }
    const startDate = new Date().toISOString().split("T")[0];
    let ok = 0;
    let failed = 0;
    for (const id of allocIds) {
      const input: Record<string, string> = { vehicleId: form.vehicle_id, pickupStop: form.pickup_stop, startDate };
      if (allocType === "staff") input.employeeId = id;
      else input.studentId = id;
      const result = await dispatch(allocateVehicle(input));
      if (allocateVehicle.fulfilled.match(result)) ok++;
      else failed++;
    }
    if (ok > 0) {
      toast.success(`${ok} ${allocType === "staff" ? "staff member" : "student"}${ok > 1 ? "s" : ""} allocated`);
      dispatch(fetchAllocations());
    }
    if (failed > 0) toast.error(`${failed} could not be allocated (already assigned?)`);
    if (ok > 0) {
      setAllocIds([]);
      setForm({ ...form, vehicle_id: "", pickup_stop: "" });
      setShowModal(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove allocation?")) return;
    const result = await dispatch(removeAllocation({ id, input: { endDate: new Date().toISOString().split("T")[0] } }));
    if (removeAllocation.fulfilled.match(result)) {
      toast.success("Allocation removed");
    }
  };

  // ── Filter + sort the active tab's rows ─────────────────────────
  const lc = search.toLowerCase();
  const filteredRoutes = search
    ? routes.filter((r) => [r.route_name, r.start_point, r.end_point, r.stops].some((v) => String(v ?? "").toLowerCase().includes(lc)))
    : routes;
  const filteredVehicles = search
    ? vehicles.filter((v) => [v.vehicle_number, v.vehicle_type, v.driver_name, v.route?.route_name].some((f) => String(f ?? "").toLowerCase().includes(lc)))
    : vehicles;
  const filteredAllocations = search
    ? allocations.filter((a) => [a.student?.user?.name, a.employee?.user?.name, a.vehicle?.vehicle_number, a.vehicle?.route?.route_name, a.pickup_stop, a.status].some((v) => String(v ?? "").toLowerCase().includes(lc)))
    : allocations;

  const sortedRoutes = sortRows(filteredRoutes, sort, {
    route_name: (r) => r.route_name,
    start_point: (r) => r.start_point,
    end_point: (r) => r.end_point,
    stops: (r) => r.stops,
    distance: (r) => r.distance,
  });
  const sortedVehicles = sortRows(filteredVehicles, sort, {
    vehicle_number: (v) => v.vehicle_number,
    vehicle_type: (v) => v.vehicle_type,
    capacity: (v) => v.capacity,
    driver: (v) => v.driver_name,
    route: (v) => v.route?.route_name ?? "",
    status: (v) => v.status,
  });
  const sortedAllocations = sortRows(filteredAllocations, sort, {
    member: (a) => a.student?.user?.name ?? a.employee?.user?.name ?? "",
    vehicle: (a) => a.vehicle?.vehicle_number ?? "",
    route: (a) => a.vehicle?.route?.route_name ?? "",
    pickup_stop: (a) => a.pickup_stop,
    status: (a) => a.status,
  });

  // ── Bulk selection (acts on the active tab's visible rows) ───────
  const tabItems: { id: string }[] =
    activeTab === "vehicles" ? sortedVehicles : activeTab === "allocations" ? sortedAllocations : sortedRoutes;
  const allSelected = tabItems.length > 0 && tabItems.every((i) => selected.has(i.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(tabItems.map((i) => i.id)));

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected ${activeTab}? This cannot be undone.`)) return;
    let ok = false;
    let err = "";
    if (activeTab === "vehicles") {
      const r = await dispatch(bulkDeleteVehicles(ids));
      ok = bulkDeleteVehicles.fulfilled.match(r); err = r.payload as string;
      if (ok) dispatch(fetchAllocations()); // cascade may have removed some
    } else if (activeTab === "allocations") {
      const r = await dispatch(bulkDeleteAllocations(ids));
      ok = bulkDeleteAllocations.fulfilled.match(r); err = r.payload as string;
    } else {
      const r = await dispatch(bulkDeleteRoutes(ids));
      ok = bulkDeleteRoutes.fulfilled.match(r); err = r.payload as string;
      if (ok) { dispatch(fetchVehicles()); dispatch(fetchAllocations()); } // their route ref may now be empty
    }
    if (ok) {
      toast.success(`${ids.length} deleted`);
      setSelected(new Set());
    } else {
      toast.error(err || "Delete failed");
    }
  };

  // Pickup options for the allocation modal come from the selected vehicle's
  // route: its start point, its listed stops, then its end point (deduped).
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicle_id);
  const selectedRoute = routes.find((r) => r.id === selectedVehicle?.route_id);
  const pickupOptions: string[] = (() => {
    if (!selectedRoute) return [];
    const raw = [selectedRoute.start_point, ...String(selectedRoute.stops ?? "").split(","), selectedRoute.end_point];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of raw) {
      const t = String(s ?? "").trim();
      const key = t.toLowerCase();
      if (t && !seen.has(key)) { seen.add(key); out.push(t); }
    }
    return out;
  })();

  return {
    dispatch, routes, vehicles, allocations, loading, isAdmin,
    activeTab, selectTab, showModal, setShowModal, search, setSearch,
    selected, setSelected, sort, editingRoute, setEditingRoute,
    editingVehicle, setEditingVehicle, allocType, setAllocType,
    allocIds, setAllocIds, form, setForm,
    toggleSelect, toggleSort,
    handleCreateRoute, handleUpdateRoute, openEditRoute,
    handleCreateVehicle, handleUpdateVehicle, openEditVehicle,
    handleAllocate, handleRemove,
    sortedRoutes, sortedVehicles, sortedAllocations,
    allSelected, toggleAll, handleBulkDelete, pickupOptions,
  };
}

export type TransportPageState = ReturnType<typeof useTransportPage>;
