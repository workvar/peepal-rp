import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { announcementsAPI, notificationsAPI } from '@/lib/api'
import type { Announcement, Notification } from '@/types'

interface NotificationState {
  announcements: Announcement[]
  allAnnouncements: Announcement[]
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
}

const initialState: NotificationState = {
  announcements: [],
  allAnnouncements: [],
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
}

export const fetchAnnouncements = createAsyncThunk(
  'notification/fetchAnnouncements',
  async () => {
    const res = await announcementsAPI.list()
    return res.data.data as Announcement[]
  }
)

export const fetchAllAnnouncements = createAsyncThunk(
  'notification/fetchAllAnnouncements',
  async () => {
    const res = await announcementsAPI.listAll()
    return res.data.data as Announcement[]
  }
)

export const createAnnouncement = createAsyncThunk(
  'notification/createAnnouncement',
  async (data: object) => {
    const res = await announcementsAPI.create(data)
    return res.data.data as Announcement
  }
)

export const updateAnnouncement = createAsyncThunk(
  'notification/updateAnnouncement',
  async ({ id, data }: { id: string; data: object }) => {
    const res = await announcementsAPI.update(id, data)
    return res.data.data as Announcement
  }
)

export const deleteAnnouncement = createAsyncThunk(
  'notification/deleteAnnouncement',
  async (id: string) => {
    await announcementsAPI.delete(id)
    return id
  }
)

export const fetchNotifications = createAsyncThunk(
  'notification/fetchNotifications',
  async () => {
    const res = await notificationsAPI.list()
    return res.data.data as Notification[]
  }
)

export const fetchUnreadCount = createAsyncThunk(
  'notification/fetchUnreadCount',
  async () => {
    const res = await notificationsAPI.unreadCount()
    return (res.data.data as { count: number }).count
  }
)

export const markNotificationRead = createAsyncThunk(
  'notification/markRead',
  async (id: string) => {
    await notificationsAPI.markRead(id)
    return id
  }
)

export const markAllNotificationsRead = createAsyncThunk(
  'notification/markAllRead',
  async () => {
    await notificationsAPI.markAllRead()
  }
)

export const deleteNotification = createAsyncThunk(
  'notification/delete',
  async (id: string) => {
    await notificationsAPI.delete(id)
    return id
  }
)

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnnouncements.pending, (state) => { state.loading = true })
      .addCase(fetchAnnouncements.fulfilled, (state, action) => {
        state.loading = false
        state.announcements = action.payload ?? []
      })
      .addCase(fetchAnnouncements.rejected, (state) => { state.loading = false })

      .addCase(fetchAllAnnouncements.fulfilled, (state, action) => {
        state.allAnnouncements = action.payload ?? []
      })

      .addCase(createAnnouncement.fulfilled, (state, action) => {
        state.allAnnouncements.unshift(action.payload)
        if (action.payload.is_published) {
          state.announcements.unshift(action.payload)
        }
      })

      .addCase(updateAnnouncement.fulfilled, (state, action) => {
        const idx = state.allAnnouncements.findIndex(a => a.id === action.payload.id)
        if (idx !== -1) state.allAnnouncements[idx] = action.payload
        const idx2 = state.announcements.findIndex(a => a.id === action.payload.id)
        if (idx2 !== -1) state.announcements[idx2] = action.payload
      })

      .addCase(deleteAnnouncement.fulfilled, (state, action) => {
        state.allAnnouncements = state.allAnnouncements.filter(a => a.id !== action.payload)
        state.announcements = state.announcements.filter(a => a.id !== action.payload)
      })

      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload ?? []
      })

      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload
      })

      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const n = state.notifications.find(n => n.id === action.payload)
        if (n && !n.is_read) {
          n.is_read = true
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
      })

      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.notifications.forEach(n => { n.is_read = true })
        state.unreadCount = 0
      })

      .addCase(deleteNotification.fulfilled, (state, action) => {
        const n = state.notifications.find(n => n.id === action.payload)
        if (n && !n.is_read) state.unreadCount = Math.max(0, state.unreadCount - 1)
        state.notifications = state.notifications.filter(n => n.id !== action.payload)
      })
  },
})

export default notificationSlice.reducer
