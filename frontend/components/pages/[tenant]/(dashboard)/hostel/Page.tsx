"use client";

import Header from "@/components/layout/Header";
import { BulkUploadButton } from "@/components/ui/BulkUpload";
import { Plus } from "lucide-react";
import { fetchBlocks, fetchRooms, fetchAllocations, fetchRoomClasses } from "@/store/slices/hostelSlice";
import HostelVisualizer from "./Visualizer";
import Can from "@/components/access/Can";
import { HOSTEL_TABS, money } from "./helpers";
import { useHostelPage } from "./useHostelPage";
import BlocksTab from "./BlocksTab";
import RoomsTab from "./RoomsTab";
import ClassesTab from "./ClassesTab";
import HostelModal from "./HostelModal";

export default function HostelPage({ initialTab = "blocks" }: { initialTab?: string }) {
  const s = useHostelPage(initialTab);
  const { dispatch, activeTab, isAdmin, blockStats } = s;

  return (
    <div>
      <Header
        title="Hostel Management"
        subtitle="Manage hostel blocks, rooms, classes, and allocations"
        action={
          isAdmin && (
            <div className="flex items-center gap-2">
              {activeTab === "blocks" && (
                <BulkUploadButton resource="hostel_blocks" onFinished={(st) => { if (st.successful > 0) dispatch(fetchBlocks()); }} />
              )}
              {activeTab === "rooms" && (
                <BulkUploadButton resource="hostel_rooms" onFinished={(st) => { if (st.successful > 0) dispatch(fetchRooms()); }} />
              )}
              {activeTab === "visualizer" && (
                <BulkUploadButton resource="hostel_allocations" onFinished={(st) => { if (st.successful > 0) { dispatch(fetchAllocations()); dispatch(fetchRooms()); } }} />
              )}
              {activeTab === "classes" && (
                <BulkUploadButton resource="room_classes" onFinished={(st) => { if (st.successful > 0) dispatch(fetchRoomClasses()); }} />
              )}
              {!["overview", "visualizer"].includes(activeTab) && (
                <Can module="hostel" action="create">
                  <button className="btn-primary flex items-center gap-2" onClick={s.openNew}>
                    <Plus size={16} /> New {activeTab === "blocks" ? "Block" : activeTab === "rooms" ? "Room" : "Class"}
                  </button>
                </Can>
              )}
            </div>
          )
        }
      />

      {/* Stats */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-muted-foreground uppercase mb-1">Blocks</p>
            <p className="text-2xl font-bold">{blockStats.total}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted-foreground uppercase mb-1">Total Rooms</p>
            <p className="text-2xl font-bold">{blockStats.totalRooms}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted-foreground uppercase mb-1">Occupied</p>
            <p className="text-2xl font-bold text-orange-500">{blockStats.occupied}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted-foreground uppercase mb-1">Available</p>
            <p className="text-2xl font-bold text-green-500">{blockStats.available}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted-foreground uppercase mb-1">Monthly Revenue</p>
            <p className="text-2xl font-bold text-blue-500">{money(blockStats.revenue)}</p>
          </div>
        </div>
      )}

      {activeTab !== "visualizer" && (
        <div className="mb-4">
          <input
            className="input-field w-full"
            placeholder="Search rooms, classes or allocations…"
            value={s.search}
            onChange={(e) => s.setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        {HOSTEL_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => s.selectTab(tab)}
            className={`px-4 py-2 font-medium text-sm transition capitalize ${
              activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "visualizer" && <HostelVisualizer />}
      {activeTab === "blocks" && <BlocksTab s={s} />}
      {activeTab === "rooms" && <RoomsTab s={s} />}
      {activeTab === "classes" && <ClassesTab s={s} />}

      {s.showModal && <HostelModal s={s} />}
    </div>
  );
}
