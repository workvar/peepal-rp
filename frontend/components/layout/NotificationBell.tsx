'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchNotifications, fetchUnreadCount,
  markNotificationRead, markAllNotificationsRead
} from '@/store/slices/notificationSlice'
import Link from 'next/link'

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

export default function NotificationBell() {
  const dispatch = useAppDispatch()
  const { notifications, unreadCount } = useAppSelector(s => s.notification)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dispatch(fetchUnreadCount())
    dispatch(fetchNotifications())
    // Poll every 60 seconds
    const interval = setInterval(() => {
      dispatch(fetchUnreadCount())
    }, 60000)
    return () => clearInterval(interval)
  }, [dispatch])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const recent = notifications.slice(0, 5)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => dispatch(markAllNotificationsRead())}
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No notifications</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {recent.map(n => (
                <div key={n.id}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!n.is_read ? 'bg-blue-50/60' : ''}`}
                  onClick={() => { if (!n.is_read) dispatch(markNotificationRead(n.id)) }}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!n.is_read ? (TYPE_DOT[n.type] || 'bg-blue-500') : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${n.is_read ? 'text-gray-600' : 'text-gray-900'}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-gray-400 truncate mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 px-4 py-2">
            <Link href="/notifications" onClick={() => setOpen(false)}
              className="text-xs text-blue-600 hover:underline">
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
