"use client";

import StudentMultiSelect from "@/components/ui/StudentMultiSelect";
import StaffMultiSelect from "@/components/ui/StaffMultiSelect";
import { X } from "lucide-react";
import type { TransportPageState } from "./useTransportPage";
import SearchableSelect from "@/components/ui/SearchableSelect";

// Single modal hosting the create/edit form for whichever tab is active
// (route, vehicle, or allocation).
export default function TransportModal({ s }: { s: TransportPageState }) {
  const { activeTab, form, setForm, editingRoute, editingVehicle, routes, vehicles, allocType, allocIds, pickupOptions } = s;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-2xl p-6 w-full max-w-md max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {activeTab === "routes" && (editingRoute ? "Edit Route" : "New Route")}
            {activeTab === "vehicles" && (editingVehicle ? "Edit Vehicle" : "New Vehicle")}
            {activeTab === "allocations" && "Allocate Vehicle"}
          </h3>
          <button onClick={() => { s.setShowModal(false); s.setEditingRoute(null); s.setEditingVehicle(null); s.setAllocIds([]); }} className="p-1 hover:bg-muted rounded">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={
            activeTab === "routes"
              ? (editingRoute ? s.handleUpdateRoute : s.handleCreateRoute)
              : activeTab === "vehicles"
                ? (editingVehicle ? s.handleUpdateVehicle : s.handleCreateVehicle)
                : s.handleAllocate
          }
          className="space-y-4"
        >
          {activeTab === "routes" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Route Name</label>
                <input
                  type="text"
                  required
                  value={form.route_name}
                  onChange={(e) => setForm({ ...form, route_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  placeholder="e.g., Route A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Point</label>
                <input
                  type="text"
                  required
                  value={form.start_point}
                  onChange={(e) => setForm({ ...form, start_point: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Point</label>
                <input
                  type="text"
                  required
                  value={form.end_point}
                  onChange={(e) => setForm({ ...form, end_point: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stops</label>
                <textarea
                  value={form.stops}
                  onChange={(e) => setForm({ ...form, stops: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm h-16"
                  placeholder="Comma separated"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Distance (km)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={form.distance}
                  onChange={(e) => setForm({ ...form, distance: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>
            </>
          )}

          {activeTab === "vehicles" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Number</label>
                <input
                  type="text"
                  required
                  value={form.vehicle_number}
                  onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  placeholder="e.g., MH01AB1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  required
                  value={form.vehicle_type}
                  onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                >
                  <option value="">Select type</option>
                  <option value="bus">Bus</option>
                  <option value="van">Van</option>
                  <option value="minibus">Minibus</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Capacity</label>
                <input
                  type="number"
                  required
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Driver Name</label>
                <input
                  type="text"
                  required
                  value={form.driver_name}
                  onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Driver Phone</label>
                <input
                  type="tel"
                  required
                  value={form.driver_phone}
                  onChange={(e) => setForm({ ...form, driver_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Route</label>
                <SearchableSelect
                  required
                  value={form.route_id}
                  onChange={(v) => setForm({ ...form, route_id: v })}
                  options={routes.map((r) => ({ value: r.id, label: r.route_name }))}
                  placeholder="Select route"
                />
              </div>
            </>
          )}

          {activeTab === "allocations" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Allocate to</label>
                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 w-fit mb-2">
                  {(["student", "staff"] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => { s.setAllocType(t); s.setAllocIds([]); }}
                      className={`px-3 py-1 text-xs rounded-md capitalize transition ${allocType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {allocType === "student" ? (
                  <StudentMultiSelect value={allocIds} onChange={s.setAllocIds} />
                ) : (
                  <StaffMultiSelect value={allocIds} onChange={s.setAllocIds} />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle</label>
                <SearchableSelect
                  required
                  value={form.vehicle_id}
                  onChange={(v) => setForm({ ...form, vehicle_id: v, pickup_stop: "" })}
                  options={vehicles.map((v) => ({ value: v.id, label: `${v.vehicle_number} - ${v.route?.route_name}` }))}
                  placeholder="Select vehicle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pickup Stop</label>
                {pickupOptions.length > 0 ? (
                  <SearchableSelect
                    required
                    value={form.pickup_stop}
                    onChange={(v) => setForm({ ...form, pickup_stop: v })}
                    options={pickupOptions.map((stop) => ({ value: stop, label: stop }))}
                    placeholder="Select pickup stop"
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={form.pickup_stop}
                    onChange={(e) => setForm({ ...form, pickup_stop: e.target.value })}
                    placeholder={form.vehicle_id ? "Route has no stops — type a pickup point" : "Select a vehicle first"}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                )}
              </div>
            </>
          )}

          <button type="submit" className="w-full btn-primary mt-6">
            {activeTab === "routes" ? (editingRoute ? "Save Route" : "Create Route") : activeTab === "vehicles" ? (editingVehicle ? "Save Vehicle" : "Create Vehicle") : "Allocate"}
          </button>
        </form>
      </div>
    </div>
  );
}
