"use client";

import StudentMultiSelect from "@/components/ui/StudentMultiSelect";
import { X } from "lucide-react";
import { money } from "./helpers";
import type { HostelPageState } from "./useHostelPage";
import SearchableSelect from "@/components/ui/SearchableSelect";

// Single modal that hosts the create/edit form for whichever tab is active
// (block, room, room class, or allocation).
export default function HostelModal({ s }: { s: HostelPageState }) {
  const { activeTab, form, setForm, editingRoom, editingClass, blocks, rooms, roomClasses, selectedClass } = s;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {activeTab === "blocks" && "New Block"}
            {activeTab === "rooms" && (editingRoom ? "Edit Room" : "New Room")}
            {activeTab === "classes" && (editingClass ? "Edit Class" : "New Room Class")}
            {activeTab === "allocations" && "Allocate Room"}
          </h3>
          <button onClick={s.closeModal} className="p-1 hover:bg-muted rounded">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={
            activeTab === "blocks" ? s.handleCreateBlock
              : activeTab === "rooms" ? (editingRoom ? s.handleUpdateRoom : s.handleCreateRoom)
              : activeTab === "classes" ? s.handleSubmitClass
              : s.handleAllocate
          }
          className="space-y-4"
        >
          {activeTab === "blocks" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Block Name</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="e.g., Block A" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <input type="text" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="e.g., boys" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Floors</label>
                <input type="number" value={form.floors} onChange={(e) => setForm({ ...form, floors: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
            </>
          )}

          {activeTab === "rooms" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Block</label>
                <SearchableSelect
                  required
                  value={form.blockId}
                  onChange={(v) => setForm({ ...form, blockId: v })}
                  options={blocks.map((b) => ({ value: b.id, label: b.name }))}
                  placeholder="Select block"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Room Number</label>
                <input type="text" required value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="e.g., 101" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Floor</label>
                  <input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Capacity</label>
                  <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                  <option value="single">Single</option>
                  <option value="shared">Shared</option>
                  <option value="deluxe">Deluxe</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Room Class</label>
                <SearchableSelect
                  value={form.roomClassId}
                  onChange={(v) => setForm({ ...form, roomClassId: v })}
                  options={roomClasses.map((c) => ({ value: c.id, label: `${c.name} — ${money(c.semesterRate)}/sem` }))}
                  placeholder="No class (use room rate below)"
                />
                {selectedClass && !form.rateType && (
                  <p className="text-xs text-muted-foreground mt-1">Inherits {money(selectedClass.semesterRate)}/sem ({money(selectedClass.annualRate)}/yr) from this class.</p>
                )}
              </div>
              <div className="border border-border rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Rate override (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1">Rate type</label>
                    <select value={form.rateType} onChange={(e) => setForm({ ...form, rateType: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                      <option value="">Inherit / fee</option>
                      <option value="monthly">Monthly</option>
                      <option value="semester">Semester</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                  {form.rateType && (
                    <div>
                      <label className="block text-xs mb-1">Amount</label>
                      <input type="number" value={form.rateAmount} onChange={(e) => setForm({ ...form, rateAmount: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="e.g., 30000" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Fee (fallback)</label>
                <input type="number" value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                <p className="text-xs text-muted-foreground mt-1">Used only when no class and no override are set.</p>
              </div>
            </>
          )}

          {activeTab === "classes" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Class Name</label>
                <input type="text" required value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="e.g., 3-Sharing AC" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input type="text" value={form.classDescription} onChange={(e) => setForm({ ...form, classDescription: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Rate Type</label>
                  <select value={form.classRateType} onChange={(e) => setForm({ ...form, classRateType: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
                    <option value="monthly">Monthly</option>
                    <option value="semester">Semester</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input type="number" required value={form.classRateAmount} onChange={(e) => setForm({ ...form, classRateAmount: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">An annual rate is split across the current academic year's semesters. With no semesters, a semester equals the whole year.</p>
            </>
          )}

          {activeTab === "allocations" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Students</label>
                <StudentMultiSelect value={s.allocStudentIds} onChange={s.setAllocStudentIds} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Room</label>
                <SearchableSelect
                  required
                  value={form.roomId}
                  onChange={(v) => setForm({ ...form, roomId: v })}
                  options={rooms.filter((r) => r.occupied < r.capacity).map((r) => ({
                    value: r.id,
                    label: `${r.block?.name} • Room ${r.roomNumber} (${r.occupied}/${r.capacity})`,
                  }))}
                  placeholder="Select room"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Allocation Date</label>
                <input type="date" required value={form.allocDate} onChange={(e) => setForm({ ...form, allocDate: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
            </>
          )}

          <button type="submit" className="w-full btn-primary mt-6">
            {activeTab === "blocks" ? "Create Block"
              : activeTab === "rooms" ? (editingRoom ? "Save Room" : "Create Room")
              : activeTab === "classes" ? (editingClass ? "Save Class" : "Create Class")
              : "Allocate"}
          </button>
        </form>
      </div>
    </div>
  );
}
