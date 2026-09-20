'use client'

import { useQuery, useMutation } from '@apollo/client'
import { MY_NOTIFICATIONS } from '@/graphql/queries/notifications'
import {
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
  DELETE_NOTIFICATION,
} from '@/graphql/mutations/notifications'

const TYPE_DOT: Record<string, string> = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-orange-500',
  error: 'bg-red-500',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface NotificationGQL {
  id: string
  userId: string
  title: string
  body?: string
  type: string
  category: string
  refId?: string
  refType?: string
  isRead: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const { data, loading, refetch } = useQuery(MY_NOTIFICATIONS)
  const notifications: NotificationGQL[] = data?.myNotifications ?? []
  const unreadCount = notifications.filter(n => !n.isRead).length

  const [markNotificationRead] = useMutation(MARK_NOTIFICATION_READ, {
    onCompleted: () => refetch(),
  })
  const [markAllNotificationsRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ, {
    onCompleted: () => refetch(),
  })
  const [deleteNotification] = useMutation(DELETE_NOTIFICATION, {
    onCompleted: () => refetch(),
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllNotificationsRead()}
            className="text-sm text-blue-600 hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground/70">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70">No notifications</div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 transition-colors ${n.isRead ? 'bg-card border-border' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-start gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.isRead ? (TYPE_DOT[n.type] || 'bg-blue-500') : 'bg-gray-300'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${n.isRead ? 'text-foreground/80' : 'text-foreground'}`}>
                      {n.title}
                    </p>
                    <span className="text-xs text-muted-foreground/70 shrink-0">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    {n.category !== 'general' && (
                      <span className="text-xs capitalize text-muted-foreground/70">{n.category}</span>
                    )}
                    {!n.isRead && (
                      <button
                        onClick={() => markNotificationRead({ variables: { id: n.id } })}
                        className="text-xs text-blue-600 hover:underline">
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification({ variables: { id: n.id } })}
                      className="text-xs text-red-500 hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
