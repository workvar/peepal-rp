'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { useListQuery } from '@/lib/hooks/useQueryState'
import QueryError from '@/components/ui/QueryError'
import { useAppSelector } from '@/store/hooks'
import { LIST_ANNOUNCEMENTS, LIST_ALL_ANNOUNCEMENTS } from '@/graphql/queries/announcements'
import {
  CREATE_ANNOUNCEMENT,
  UPDATE_ANNOUNCEMENT,
  DELETE_ANNOUNCEMENT,
} from '@/graphql/mutations/announcements'
import ConfirmDialog, { type ConfirmState } from '@/components/ui/ConfirmDialog'
import Can from '@/components/access/Can'
import toast from 'react-hot-toast'
import { useTerminology } from '@/store/hooks/useTerminology'
import { roleLabelPlural } from '@/lib/roleLabels'
import type { Terminology } from '@/constants/terminology'
import SearchableSelect from "@/components/ui/SearchableSelect"

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-muted/60 text-muted-foreground',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const PRIORITY_BORDER: Record<string, string> = {
  low: 'border-l-gray-300',
  normal: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
}

// Audience options are terminology-driven: a hospital targets Clinicians and
// Trainees, not Teachers and Students. The stored values never change.
const roleOptionsFor = (t: Terminology) => [
  { value: 'all', label: 'Everyone' },
  ...['student', 'teacher', 'staff', 'admin'].map(value => ({
    value,
    label: roleLabelPlural(value, t),
  })),
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const emptyForm = {
  title: '',
  body: '',
  targetRoles: 'all',
  priority: 'normal',
  isPublished: true,
  expiresAt: '',
}

interface AnnouncementGQL {
  id: string
  title: string
  body: string
  authorId: string
  author?: { id: string; name: string }
  targetRoles: string
  priority: string
  isPublished: boolean
  expiresAt?: string
  createdAt?: string
}

export default function AnnouncementsPage() {
  const { user } = useAppSelector(s => s.auth)
  const isAdmin = user?.role === 'admin'
  const terms = useTerminology()
  const roleOptions = roleOptionsFor(terms)

  const { rows: announcements, loading, errorMessage, refetch } = useListQuery<AnnouncementGQL>(
    isAdmin ? LIST_ALL_ANNOUNCEMENTS : LIST_ANNOUNCEMENTS,
    isAdmin ? 'allAnnouncements' : 'announcements'
  )

  const [createAnnouncement] = useMutation(CREATE_ANNOUNCEMENT, {
    onCompleted: () => refetch(),
  })
  const [updateAnnouncement] = useMutation(UPDATE_ANNOUNCEMENT, {
    onCompleted: () => refetch(),
  })
  const [deleteAnnouncement] = useMutation(DELETE_ANNOUNCEMENT, {
    onCompleted: () => refetch(),
  })

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AnnouncementGQL | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const [search, setSearch] = useState('')
  const filteredList = search
    ? announcements.filter(a =>
        [a.title, a.body, a.priority, a.targetRoles].some(v =>
          String(v ?? '').toLowerCase().includes(search.toLowerCase())
        )
      )
    : announcements

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(a: AnnouncementGQL) {
    setEditing(a)
    setForm({
      title: a.title,
      body: a.body,
      targetRoles: a.targetRoles,
      priority: a.priority,
      isPublished: a.isPublished,
      expiresAt: a.expiresAt ? a.expiresAt.slice(0, 10) : '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const input = {
        title: form.title,
        body: form.body,
        targetRoles: form.targetRoles,
        priority: form.priority,
        isPublished: form.isPublished,
        expiresAt: form.expiresAt || null,
      }
      if (editing) {
        await updateAnnouncement({ variables: { id: editing.id, input } })
      } else {
        await createAnnouncement({ variables: { input } })
      }
      setShowModal(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save announcement'
      alert(message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleDelete(id: string) {
    setConfirmState({
      title: 'Delete Announcement',
      message: 'This announcement will be permanently removed. This cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await deleteAnnouncement({ variables: { id } })
        toast.success('Announcement deleted')
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Notice board for the institution</p>
        </div>
        {isAdmin && (
          <Can module="announcements" action="create">
            <button
              onClick={openCreate}
              className="btn-primary text-white px-4 py-2 rounded-lg text-sm font-medium ">
              + New Announcement
            </button>
          </Can>
        )}
      </div>

      <div>
        <input
          className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          placeholder="Search announcements…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {errorMessage && <QueryError message={errorMessage} onRetry={refetch} />}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground/70">Loading announcements...</div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70">No announcements yet</div>
      ) : (
        <div className="space-y-4">
          {filteredList.map(a => (
            <div
              key={a.id}
              className={`bg-card rounded-xl border border-border border-l-4 ${PRIORITY_BORDER[a.priority] || 'border-l-blue-400'} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{a.title}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[a.priority]}`}>
                      {a.priority}
                    </span>
                    {!a.isPublished && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground">
                        Draft
                      </span>
                    )}
                    {a.targetRoles !== 'all' && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 capitalize">
                        → {a.targetRoles}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-foreground/80 text-sm whitespace-pre-wrap">{a.body}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground/70">
                    <span>By {a.author?.name || 'Admin'}</span>
                    <span>•</span>
                    <span>{a.createdAt ? timeAgo(a.createdAt) : ''}</span>
                    {a.expiresAt && (
                      <>
                        <span>•</span>
                        <span>Expires {new Date(a.expiresAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 shrink-0">
                    <Can module="announcements" action="edit">
                      <button onClick={() => openEdit(a)} className="text-xs text-blue-600 hover:underline">
                        Edit
                      </button>
                    </Can>
                    <Can module="announcements" action="delete">
                      <button onClick={() => handleDelete(a.id)} className="text-xs text-red-500 hover:underline">
                        Delete
                      </button>
                    </Can>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? 'Edit Announcement' : 'New Announcement'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Title *</label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Body *</label>
                <textarea
                  required
                  rows={5}
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Audience</label>
                  <SearchableSelect
                    value={form.targetRoles}
                    onChange={v => setForm(f => ({ ...f, targetRoles: v }))}
                    options={roleOptions.map(r => ({ value: r.value, label: r.label }))}
                    placeholder="Select roles"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Expires On (optional)
                </label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={form.isPublished}
                  onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="published" className="text-sm text-foreground/80">
                  Publish immediately
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-border rounded-lg py-2 text-sm font-medium text-foreground/80 hover:bg-muted/40">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary text-white rounded-lg py-2 text-sm font-medium  disabled:opacity-50">
                  {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  )
}
