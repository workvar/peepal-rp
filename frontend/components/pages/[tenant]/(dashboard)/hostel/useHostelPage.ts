"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchBlocks, fetchRooms, fetchAllocations,
  createBlock, bulkDeleteBlocks, createRoom, updateRoom, allocateRoom, vacateRoom,
  fetchRoomClasses, createRoomClass, updateRoomClass, deleteRoomClass,
  bulkDeleteRooms, bulkDeleteAllocations, bulkDeleteRoomClasses,
} from "@/store/slices/hostelSlice";
import toast from "react-hot-toast";
import type { HostelRoom, RoomClass } from "@/types";
import { HOSTEL_TABS, sortRows, type SortState } from "./helpers";
import type { HostelForm, RoomInput } from "./types";

// All hostel page state and handlers live here; Page.tsx and the tab/modal
// components are purely presentational consumers of this hook.
export function useHostelPage(initialTab: string) {
  const dispatch = useAppDispatch();
  const params = useParams();
  const tenant = (params?.tenant as string) ?? "";
  const { blocks, rooms, allocations, roomClasses, loading } = useAppSelector((s) => s.hostel);
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState(() => (HOSTEL_TABS.includes(initialTab) ? initialTab : "blocks"));

  // Reflect the active tab in the URL (/<tenant>/hostel/<tab>) so it survives a
  // refresh and back/forward, without a route navigation (avoids a data refetch).
  const selectTab = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") window.history.pushState(null, "", `/${tenant}/hostel/${tab}`);
  };
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortState>(null);
  const [search, setSearch] = useState("");
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<HostelRoom | null>(null);
  const [editingClass, setEditingClass] = useState<RoomClass | null>(null);
  const [form, setForm] = useState<HostelForm>({
    name: "", type: "", floors: "4",
    blockId: "", roomNumber: "", floor: "1", capacity: "4", roomType: "shared", monthlyFee: "5000",
    roomClassId: "", rateType: "", rateAmount: "",
    roomId: "", allocDate: new Date().toISOString().split("T")[0],
    className: "", classDescription: "", classRateType: "semester", classRateAmount: "5000",
  });
  const [allocStudentIds, setAllocStudentIds] = useState<string[]>([]);

  useEffect(() => {
    dispatch(fetchBlocks());
    dispatch(fetchRooms());
    dispatch(fetchAllocations());
    dispatch(fetchRoomClasses());
  }, [dispatch]);

  // Keep the tab in sync when the user uses browser back/forward.
  useEffect(() => {
    const onPop = () => {
      const seg = window.location.pathname.split("/").filter(Boolean);
      const t = seg[seg.indexOf("hostel") + 1];
      setActiveTab(HOSTEL_TABS.includes(t) ? t : "blocks");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Clear bulk selection and column sorting when switching tabs.
  useEffect(() => {
    setSelected(new Set());
    setSort(null);
  }, [activeTab]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(createBlock({ name: form.name, type: form.type, floors: parseInt(form.floors) }));
    if (createBlock.fulfilled.match(result)) {
      toast.success("Block created");
      setForm({ ...form, name: "", type: "", floors: "4" });
      setShowModal(false);
    } else {
      toast.error(result.payload as string);
    }
  };

  // Build the room create/update input (camelCase, matching the GraphQL schema).
  const roomInput = (): RoomInput => ({
    blockId: form.blockId,
    roomNumber: form.roomNumber,
    floor: parseInt(form.floor),
    capacity: parseInt(form.capacity),
    roomType: form.roomType,
    monthlyFee: parseFloat(form.monthlyFee) || 0,
    roomClassId: form.roomClassId || "",
    rateType: form.rateType || "",
    rateAmount: form.rateType ? parseFloat(form.rateAmount) || 0 : 0,
  });

  const resetRoomForm = () =>
    setForm((f) => ({ ...f, blockId: "", roomNumber: "", floor: "1", capacity: "4", roomType: "shared", monthlyFee: "5000", roomClassId: "", rateType: "", rateAmount: "" }));

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rooms.some((r) => r.blockId === form.blockId && String(r.roomNumber).trim() === form.roomNumber.trim())) {
      toast.error(`Room ${form.roomNumber} already exists in this block`);
      return;
    }
    const result = await dispatch(createRoom(roomInput()));
    if (createRoom.fulfilled.match(result)) {
      toast.success("Room created");
      setShowModal(false);
      resetRoomForm();
    } else {
      toast.error(result.payload as string);
    }
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    if (rooms.some((r) => r.blockId === form.blockId && String(r.roomNumber).trim() === form.roomNumber.trim() && r.id !== editingRoom.id)) {
      toast.error(`Room ${form.roomNumber} already exists in this block`);
      return;
    }
    const result = await dispatch(updateRoom({ id: editingRoom.id, input: roomInput() }));
    if (updateRoom.fulfilled.match(result)) {
      toast.success("Room updated");
      setShowModal(false);
      setEditingRoom(null);
      resetRoomForm();
    } else {
      toast.error(result.payload as string);
    }
  };

  const openEditRoom = (room: HostelRoom) => {
    setEditingRoom(room);
    setForm({
      ...form,
      blockId: room.blockId,
      roomNumber: room.roomNumber,
      floor: String(room.floor),
      capacity: String(room.capacity),
      roomType: room.roomType,
      monthlyFee: String(room.monthlyFee),
      roomClassId: room.roomClassId || "",
      rateType: room.rateType || "",
      rateAmount: room.rateAmount != null ? String(room.rateAmount) : "",
    });
    setShowModal(true);
  };

  // Allocate every selected student to the chosen room, one mutation each. Each
  // call consumes a bed and re-checks capacity server-side, so we report how
  // many succeeded and refresh room occupancy after.
  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (allocStudentIds.length === 0) {
      toast.error("Select at least one student");
      return;
    }
    let ok = 0;
    let failed = 0;
    for (const studentId of allocStudentIds) {
      const result = await dispatch(allocateRoom({ studentId, roomId: form.roomId, allocDate: form.allocDate }));
      if (allocateRoom.fulfilled.match(result)) ok++;
      else failed++;
    }
    if (ok > 0) {
      toast.success(`${ok} student${ok > 1 ? "s" : ""} allocated`);
      dispatch(fetchRooms());
    }
    if (failed > 0) toast.error(`${failed} could not be allocated (room full or already allocated?)`);
    if (ok > 0) {
      setAllocStudentIds([]);
      setForm({ ...form, roomId: "" });
      setShowModal(false);
    }
  };

  const handleVacate = async (id: string) => {
    if (!confirm("Vacate room?")) return;
    const result = await dispatch(vacateRoom({ id, input: { vacateDate: new Date().toISOString().split("T")[0] } }));
    if (vacateRoom.fulfilled.match(result)) toast.success("Room vacated");
  };

  // ── Room Classes ──────────────────────────────────────────────
  const handleSubmitClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      name: form.className,
      description: form.classDescription,
      rateType: form.classRateType,
      rateAmount: parseFloat(form.classRateAmount) || 0,
    };
    const result = editingClass
      ? await dispatch(updateRoomClass({ id: editingClass.id, input }))
      : await dispatch(createRoomClass(input));
    const ok = editingClass ? updateRoomClass.fulfilled.match(result) : createRoomClass.fulfilled.match(result);
    if (ok) {
      toast.success(editingClass ? "Class updated" : "Class created");
      setShowModal(false);
      setEditingClass(null);
      setForm((f) => ({ ...f, className: "", classDescription: "", classRateType: "semester", classRateAmount: "5000" }));
      dispatch(fetchRooms()); // linked rooms may show a new rate
    } else {
      toast.error(result.payload as string);
    }
  };

  const openEditClass = (rc: RoomClass) => {
    setEditingClass(rc);
    setForm((f) => ({ ...f, className: rc.name, classDescription: rc.description || "", classRateType: rc.rateType, classRateAmount: String(rc.rateAmount) }));
    setShowModal(true);
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Delete this class? Rooms using it will fall back to their own rate.")) return;
    const result = await dispatch(deleteRoomClass(id));
    if (deleteRoomClass.fulfilled.match(result)) {
      toast.success("Class deleted");
      dispatch(fetchRooms());
    } else {
      toast.error(result.payload as string);
    }
  };

  const openNew = () => {
    setEditingRoom(null);
    setEditingClass(null);
    setAllocStudentIds([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRoom(null);
    setEditingClass(null);
    setAllocStudentIds([]);
  };

  const blockStats = {
    total: blocks.length,
    totalRooms: rooms.length,
    occupied: rooms.reduce((sum, r) => sum + r.occupied, 0),
    available: rooms.reduce((sum, r) => sum + (r.capacity - r.occupied), 0),
    revenue: rooms.reduce((sum, r) => sum + r.occupied * (r.monthlyRate ?? r.monthlyFee ?? 0), 0),
  };

  const filteredRooms = search
    ? rooms.filter((r) => [r.block?.name, r.roomNumber, r.roomType, r.status, r.roomClass?.name].some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase())))
    : rooms;

  const filteredAllocations = search
    ? allocations.filter((a) => [a.student?.user?.name, a.room?.roomNumber, a.room?.block?.name, a.status].some((v) => String(v ?? "").toLowerCase().includes(search.toLowerCase())))
    : allocations;

  const selectedClass = roomClasses.find((c) => c.id === form.roomClassId);

  // Bulk selection acts on whichever tab is active; tabItems is the visible list.
  const tabItems: { id: string }[] =
    activeTab === "rooms" ? filteredRooms
    : activeTab === "classes" ? roomClasses
    : activeTab === "allocations" ? filteredAllocations
    : blocks;
  const allSelected = tabItems.length > 0 && tabItems.every((i) => selected.has(i.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(tabItems.map((i) => i.id)));

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected ${activeTab}? This cannot be undone.`)) return;
    let ok = false;
    let err = "";
    if (activeTab === "rooms") {
      const r = await dispatch(bulkDeleteRooms(ids));
      ok = bulkDeleteRooms.fulfilled.match(r); err = r.payload as string;
      if (ok) dispatch(fetchAllocations());
    } else if (activeTab === "classes") {
      const r = await dispatch(bulkDeleteRoomClasses(ids));
      ok = bulkDeleteRoomClasses.fulfilled.match(r); err = r.payload as string;
      if (ok) dispatch(fetchRooms());
    } else if (activeTab === "allocations") {
      const r = await dispatch(bulkDeleteAllocations(ids));
      ok = bulkDeleteAllocations.fulfilled.match(r); err = r.payload as string;
      if (ok) dispatch(fetchRooms());
    } else {
      const r = await dispatch(bulkDeleteBlocks(ids));
      ok = bulkDeleteBlocks.fulfilled.match(r); err = r.payload as string;
    }
    if (ok) {
      toast.success(`${ids.length} deleted`);
      setSelected(new Set());
    } else {
      toast.error(err || "Delete failed");
    }
  };

  // Click a header to sort by it; click again to flip direction.
  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const sortedRooms = sortRows(filteredRooms, sort, {
    block: (r) => r.block?.name,
    room: (r) => r.roomNumber,
    floor: (r) => r.floor,
    type: (r) => r.roomType,
    class: (r) => r.roomClass?.name ?? "",
    occupied: (r) => (r.capacity ? r.occupied / r.capacity : 0),
    status: (r) => r.status,
    rate: (r) => r.semesterRate,
  });
  const sortedClasses = sortRows(roomClasses, sort, {
    name: (c) => c.name,
    description: (c) => c.description ?? "",
    rate: (c) => c.rateAmount,
    semester: (c) => c.semesterRate,
    year: (c) => c.annualRate,
    month: (c) => c.monthlyRate,
  });
  const sortedAllocations = sortRows(filteredAllocations, sort, {
    student: (a) => a.student?.user?.name ?? a.student?.name ?? "",
    room: (a) => a.room?.roomNumber ?? "",
    block: (a) => a.room?.block?.name ?? "",
    date: (a) => a.allocDate ?? "",
    status: (a) => a.status,
  });

  return {
    dispatch, blocks, rooms, allocations, roomClasses, loading, isAdmin,
    activeTab, selectTab, showModal, selected, setSelected, sort, search, setSearch,
    expandedBlock, setExpandedBlock, editingRoom, editingClass, form, setForm,
    allocStudentIds, setAllocStudentIds, toggleSelect,
    handleCreateBlock, handleCreateRoom, handleUpdateRoom, openEditRoom,
    handleAllocate, handleVacate, handleSubmitClass, openEditClass, handleDeleteClass,
    openNew, closeModal, blockStats, filteredRooms, selectedClass,
    allSelected, toggleAll, handleBulkDelete, toggleSort,
    sortedRooms, sortedClasses, sortedAllocations,
  };
}

export type HostelPageState = ReturnType<typeof useHostelPage>;
