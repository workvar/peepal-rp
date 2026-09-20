"use client";

import { useAppDispatch } from "@/store/hooks";
import { fetchRoutes, fetchVehicles, fetchAllocations } from "@/store/slices/transportSlice";
import Header from "@/components/layout/Header";
import { BulkUploadButton } from "@/components/ui/BulkUpload";
import RoutesTable from "./RoutesTable";
import VehiclesTable from "./VehiclesTable";
import AllocationsTable from "./AllocationsTable";
import TransportVisualizer from "./Visualizer";
import TransportModal from "./TransportModal";
import Can from "@/components/access/Can";
import { TRANSPORT_TABS, useTransportPage } from "./useTransportPage";
import { Plus } from "lucide-react";

export default function TransportPage({ initialTab = "routes" }: { initialTab?: string }) {
  const dispatch = useAppDispatch();
  const s = useTransportPage(initialTab);
  const { activeTab, isAdmin, loading, selected, sort, allSelected } = s;

  const selectionBar = isAdmin && selected.size > 0 ? (
    <div className="flex items-center justify-between bg-muted/60 border border-border rounded-lg px-4 py-2 mb-3">
      <span className="text-sm font-medium">{selected.size} selected</span>
      <div className="flex items-center gap-3">
        <button onClick={() => s.setSelected(new Set())} className="text-sm text-muted-foreground hover:text-foreground">Clear</button>
        <Can module="transport" action="delete">
          <button onClick={s.handleBulkDelete} className="text-sm text-red-500 hover:text-red-700 font-medium">Delete selected</button>
        </Can>
      </div>
    </div>
  ) : null;

  return (
    <div>
      <Header
        title="Transport Management"
        subtitle="Manage routes, vehicles, and student allocations"
        action={
          isAdmin && (
            <div className="flex items-center gap-2">
              {activeTab === "routes" && (
                <BulkUploadButton resource="transport_routes" onFinished={(st) => { if (st.successful > 0) dispatch(fetchRoutes()); }} />
              )}
              {activeTab === "vehicles" && (
                <BulkUploadButton resource="transport_vehicles" onFinished={(st) => { if (st.successful > 0) { dispatch(fetchVehicles()); dispatch(fetchRoutes()); } }} />
              )}
              {activeTab === "allocations" && (
                <BulkUploadButton resource="transport_allocations" onFinished={(st) => { if (st.successful > 0) { dispatch(fetchAllocations()); dispatch(fetchVehicles()); } }} />
              )}
              {activeTab !== "visualizer" && (
                <Can module="transport" action="create">
                  <button className="btn-primary flex items-center gap-2" onClick={() => { s.setAllocIds([]); s.setAllocType("student"); s.setShowModal(true); }}>
                    <Plus size={16} /> New {activeTab === "routes" ? "Route" : activeTab === "vehicles" ? "Vehicle" : "Allocation"}
                  </button>
                </Can>
              )}
            </div>
          )
        }
      />

      {activeTab !== "visualizer" && (
        <div className="mb-4">
          <input
            className="input-field w-full"
            placeholder={activeTab === "routes" ? "Search routes…" : activeTab === "vehicles" ? "Search vehicles…" : "Search allocations…"}
            value={s.search}
            onChange={(e) => s.setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        {TRANSPORT_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => s.selectTab(tab)}
            className={`px-4 py-2 font-medium text-sm transition capitalize ${
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "routes" && (
        <>
          {selectionBar}
          <RoutesTable
            routes={s.sortedRoutes}
            loading={loading}
            isAdmin={isAdmin}
            selected={selected}
            allSelected={allSelected}
            onToggleAll={s.toggleAll}
            onToggleSelect={s.toggleSelect}
            sort={sort}
            onSort={s.toggleSort}
            onEdit={s.openEditRoute}
          />
        </>
      )}

      {activeTab === "vehicles" && (
        <>
          {selectionBar}
          <VehiclesTable
            vehicles={s.sortedVehicles}
            loading={loading}
            isAdmin={isAdmin}
            selected={selected}
            allSelected={allSelected}
            onToggleAll={s.toggleAll}
            onToggleSelect={s.toggleSelect}
            sort={sort}
            onSort={s.toggleSort}
            onEdit={s.openEditVehicle}
          />
        </>
      )}

      {activeTab === "allocations" && (
        <>
          {selectionBar}
          <AllocationsTable
            allocations={s.sortedAllocations}
            loading={loading}
            isAdmin={isAdmin}
            selected={selected}
            allSelected={allSelected}
            onToggleAll={s.toggleAll}
            onToggleSelect={s.toggleSelect}
            sort={sort}
            onSort={s.toggleSort}
            onRemove={s.handleRemove}
          />
        </>
      )}

      {activeTab === "visualizer" && <TransportVisualizer />}

      {s.showModal && <TransportModal s={s} />}
    </div>
  );
}
