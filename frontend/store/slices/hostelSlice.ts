import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apolloClient } from "@/lib/apollo";
import {
  GET_HOSTEL_BLOCKS,
  GET_HOSTEL_ROOMS,
  GET_HOSTEL_ALLOCATIONS,
  GET_ROOM_CLASSES,
} from "@/graphql/queries/hostel";
import {
  CREATE_HOSTEL_BLOCK,
  BULK_DELETE_HOSTEL_BLOCKS,
  CREATE_HOSTEL_ROOM,
  UPDATE_HOSTEL_ROOM,
  ALLOCATE_HOSTEL_ROOM,
  VACATE_HOSTEL_ROOM,
  CREATE_ROOM_CLASS,
  UPDATE_ROOM_CLASS,
  DELETE_ROOM_CLASS,
  BULK_DELETE_HOSTEL_ROOMS,
  BULK_DELETE_HOSTEL_ALLOCATIONS,
  BULK_DELETE_ROOM_CLASSES,
} from "@/graphql/mutations/hostel";
import type { HostelBlock, HostelRoom, HostelAllocation, RoomClass } from "@/types";

interface HostelState {
  blocks: HostelBlock[];
  rooms: HostelRoom[];
  allocations: HostelAllocation[];
  roomClasses: RoomClass[];
  loading: boolean;
  error: string | null;
}

const initialState: HostelState = {
  blocks: [],
  rooms: [],
  allocations: [],
  roomClasses: [],
  loading: false,
  error: null,
};

// ── Blocks ──────────────────────────────────────────────────────
export const fetchBlocks = createAsyncThunk("hostel/fetchBlocks", async () => {
  const { data } = await apolloClient.query({
    query: GET_HOSTEL_BLOCKS,
    fetchPolicy: "network-only",
  });
  return data.hostelBlocks as HostelBlock[];
});

export const createBlock = createAsyncThunk(
  "hostel/createBlock",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_HOSTEL_BLOCK,
        variables: { input },
      });
      return data.createHostelBlock as HostelBlock;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to create block");
    }
  }
);

export const bulkDeleteBlocks = createAsyncThunk(
  "hostel/bulkDeleteBlocks",
  async (ids: string[], { rejectWithValue }) => {
    try {
      await apolloClient.mutate({
        mutation: BULK_DELETE_HOSTEL_BLOCKS,
        variables: { ids },
      });
      return ids;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to delete blocks");
    }
  }
);

// ── Rooms ───────────────────────────────────────────────────────
export const fetchRooms = createAsyncThunk(
  "hostel/fetchRooms",
  async (params?: { blockId?: string }) => {
    const { data } = await apolloClient.query({
      query: GET_HOSTEL_ROOMS,
      variables: { blockId: params?.blockId },
      fetchPolicy: "network-only",
    });
    return data.hostelRooms as HostelRoom[];
  }
);

export const createRoom = createAsyncThunk(
  "hostel/createRoom",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_HOSTEL_ROOM,
        variables: { input },
      });
      return data.createHostelRoom as HostelRoom;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to create room");
    }
  }
);

export const updateRoom = createAsyncThunk(
  "hostel/updateRoom",
  async ({ id, input }: { id: string; input: object }, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_HOSTEL_ROOM,
        variables: { id, input },
      });
      return data.updateHostelRoom as HostelRoom;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to update room");
    }
  }
);

// ── Allocations ─────────────────────────────────────────────────
export const fetchAllocations = createAsyncThunk(
  "hostel/fetchAllocations",
  async (params?: { status?: string }) => {
    const { data } = await apolloClient.query({
      query: GET_HOSTEL_ALLOCATIONS,
      variables: { status: params?.status },
      fetchPolicy: "network-only",
    });
    return data.hostelAllocations as HostelAllocation[];
  }
);

export const allocateRoom = createAsyncThunk(
  "hostel/allocateRoom",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: ALLOCATE_HOSTEL_ROOM,
        variables: { input },
      });
      return data.allocateHostelRoom as HostelAllocation;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to allocate room");
    }
  }
);

export const vacateRoom = createAsyncThunk(
  "hostel/vacateRoom",
  async ({ id, input }: { id: string; input: { vacateDate: string } }, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: VACATE_HOSTEL_ROOM,
        variables: { id, input },
      });
      return data.vacateHostelRoom as HostelAllocation;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to vacate room");
    }
  }
);

// ── Room Classes ────────────────────────────────────────────────
export const fetchRoomClasses = createAsyncThunk("hostel/fetchRoomClasses", async () => {
  const { data } = await apolloClient.query({
    query: GET_ROOM_CLASSES,
    fetchPolicy: "network-only",
  });
  return data.roomClasses as RoomClass[];
});

export const createRoomClass = createAsyncThunk(
  "hostel/createRoomClass",
  async (input: object, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_ROOM_CLASS,
        variables: { input },
      });
      return data.createRoomClass as RoomClass;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to create class");
    }
  }
);

export const updateRoomClass = createAsyncThunk(
  "hostel/updateRoomClass",
  async ({ id, input }: { id: string; input: object }, { rejectWithValue }) => {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_ROOM_CLASS,
        variables: { id, input },
      });
      return data.updateRoomClass as RoomClass;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to update class");
    }
  }
);

export const deleteRoomClass = createAsyncThunk(
  "hostel/deleteRoomClass",
  async (id: string, { rejectWithValue }) => {
    try {
      await apolloClient.mutate({
        mutation: DELETE_ROOM_CLASS,
        variables: { id },
      });
      return id;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to delete class");
    }
  }
);

export const bulkDeleteRooms = createAsyncThunk(
  "hostel/bulkDeleteRooms",
  async (ids: string[], { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: BULK_DELETE_HOSTEL_ROOMS, variables: { ids } });
      return ids;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to delete rooms");
    }
  }
);

export const bulkDeleteAllocations = createAsyncThunk(
  "hostel/bulkDeleteAllocations",
  async (ids: string[], { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: BULK_DELETE_HOSTEL_ALLOCATIONS, variables: { ids } });
      return ids;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to delete allocations");
    }
  }
);

export const bulkDeleteRoomClasses = createAsyncThunk(
  "hostel/bulkDeleteRoomClasses",
  async (ids: string[], { rejectWithValue }) => {
    try {
      await apolloClient.mutate({ mutation: BULK_DELETE_ROOM_CLASSES, variables: { ids } });
      return ids;
    } catch (err: unknown) {
      const e = err as { message?: string };
      return rejectWithValue(e.message || "Failed to delete classes");
    }
  }
);

const hostelSlice = createSlice({
  name: "hostel",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBlocks.pending, (state) => { state.loading = true; })
      .addCase(fetchBlocks.fulfilled, (state, action) => {
        state.loading = false;
        state.blocks = action.payload;
      })
      .addCase(fetchBlocks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Error";
      })
      .addCase(createBlock.fulfilled, (state, action) => {
        state.blocks.push(action.payload);
      })
      .addCase(bulkDeleteBlocks.fulfilled, (state, action) => {
        const deleted = new Set(action.payload);
        state.blocks = state.blocks.filter((b) => !deleted.has(b.id));
      })
      .addCase(fetchRooms.pending, (state) => { state.loading = true; })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = action.payload;
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Error";
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.rooms.push(action.payload);
      })
      .addCase(updateRoom.fulfilled, (state, action) => {
        const idx = state.rooms.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.rooms[idx] = action.payload;
      })
      .addCase(fetchAllocations.pending, (state) => { state.loading = true; })
      .addCase(fetchAllocations.fulfilled, (state, action) => {
        state.loading = false;
        state.allocations = action.payload;
      })
      .addCase(fetchAllocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Error";
      })
      .addCase(allocateRoom.fulfilled, (state, action) => {
        state.allocations.push(action.payload);
      })
      .addCase(vacateRoom.fulfilled, (state, action) => {
        const idx = state.allocations.findIndex((a) => a.id === action.payload.id);
        if (idx !== -1) state.allocations[idx] = action.payload;
      })
      .addCase(fetchRoomClasses.fulfilled, (state, action) => {
        state.roomClasses = action.payload;
      })
      .addCase(createRoomClass.fulfilled, (state, action) => {
        state.roomClasses.push(action.payload);
      })
      .addCase(updateRoomClass.fulfilled, (state, action) => {
        const idx = state.roomClasses.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.roomClasses[idx] = action.payload;
      })
      .addCase(deleteRoomClass.fulfilled, (state, action) => {
        state.roomClasses = state.roomClasses.filter((c) => c.id !== action.payload);
      })
      .addCase(bulkDeleteRooms.fulfilled, (state, action) => {
        const del = new Set(action.payload);
        state.rooms = state.rooms.filter((r) => !del.has(r.id));
      })
      .addCase(bulkDeleteAllocations.fulfilled, (state, action) => {
        const del = new Set(action.payload);
        state.allocations = state.allocations.filter((a) => !del.has(a.id));
      })
      .addCase(bulkDeleteRoomClasses.fulfilled, (state, action) => {
        const del = new Set(action.payload);
        state.roomClasses = state.roomClasses.filter((c) => !del.has(c.id));
      });
  },
});

export default hostelSlice.reducer;
