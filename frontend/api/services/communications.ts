import apiClient from "@/api/client";

// Announcements and notifications still have REST shims because the
// notification slice (used by the NotificationBell widget) was not
// migrated to Apollo. GraphQL equivalents exist (announcements query,
// createAnnouncement mutation, myNotifications query, etc.) and new UI
// should prefer those — see graphql/queries/announcements.ts,
// graphql/queries/notifications.ts, and the matching mutation files.

export const announcementsAPI = {
  list: () => apiClient.get("/announcements"),
  listAll: () => apiClient.get("/announcements/all"),
  create: (data: object) => apiClient.post("/announcements", data),
  update: (id: string, data: object) => apiClient.put(`/announcements/${id}`, data),
  delete: (id: string) => apiClient.delete(`/announcements/${id}`),
};

export const notificationsAPI = {
  list: () => apiClient.get("/notifications"),
  unreadCount: () => apiClient.get("/notifications/unread-count"),
  send: (data: object) => apiClient.post("/notifications", data),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`, {}),
  markAllRead: () => apiClient.patch("/notifications/read-all", {}),
  delete: (id: string) => apiClient.delete(`/notifications/${id}`),
};
