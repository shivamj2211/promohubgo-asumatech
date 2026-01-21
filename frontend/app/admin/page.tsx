'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { TopNav } from '@/components/top-nav'

type AdminValue = {
  id: number
  key: string
  value: string
  label?: string | null
  meta?: any
  sort_order?: number
  is_active?: boolean
  metaText?: string
}

type AdminUser = {
  id: string
  email?: string | null
  username?: string | null
  phone?: string | null
  countryCode?: string | null
  role?: string | null
  isAdmin?: boolean
  isLocked?: boolean
  createdAt?: string
}

type ContactRequest = {
  id: string
  message: string
  status: string
  createdAt: string
  fromUser: { id: string; name: string; role?: string | null }
  toUser: { id: string; name: string; role?: string | null }
}

export default function AdminPage() {
  const [me, setMe] = useState<{ isAdmin?: boolean; isLocked?: boolean } | null>(null)
  const [loadingMe, setLoadingMe] = useState(true)

  const [valueRole, setValueRole] = useState<'influencer' | 'brand'>('influencer')
  const [valueKey, setValueKey] = useState('')
  const [values, setValues] = useState<AdminValue[]>([])
  const [valuesLoading, setValuesLoading] = useState(false)
  const [valuesError, setValuesError] = useState('')

  const [newValue, setNewValue] = useState({
    key: '',
    value: '',
    label: '',
    metaText: '{}',
    sort_order: '0',
    is_active: true,
  })

  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [userQuery, setUserQuery] = useState('')

  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState('')
  const [lastApprovedThread, setLastApprovedThread] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoadingMe(true)
        const res = await apiFetch('/api/me')
        if (!active) return
        setMe(res?.user || null)
      } catch {
        if (active) setMe(null)
      } finally {
        if (active) setLoadingMe(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const isAdmin = Boolean(me?.isAdmin)
  const isLocked = Boolean(me?.isLocked)

  const preparedValues = useMemo(
    () =>
      values.map((item) => ({
        ...item,
        metaText:
          item.metaText ??
          JSON.stringify(item.meta || {}, null, 2),
      })),
    [values]
  )

  async function loadValues() {
    if (!valueKey.trim()) {
      setValuesError('Enter a key to load values.')
      return
    }
    try {
      setValuesLoading(true)
      setValuesError('')
      const res = await apiFetch(
        `/api/admin/values/${valueRole}?key=${encodeURIComponent(valueKey.trim())}`
      )
      const items = Array.isArray(res?.data) ? res.data : []
      setValues(
        items.map((item: AdminValue) => ({
          ...item,
          metaText: JSON.stringify(item.meta || {}, null, 2),
        }))
      )
    } catch (e: any) {
      setValuesError(e?.message || 'Failed to load values')
    } finally {
      setValuesLoading(false)
    }
  }

  function updateValueField(id: number, field: keyof AdminValue, value: any) {
    setValues((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  async function saveValue(item: AdminValue) {
    try {
      await apiFetch(`/api/admin/values/${valueRole}/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          key: item.key,
          value: item.value,
          label: item.label,
          meta: item.metaText || '{}',
          sort_order: Number(item.sort_order) || 0,
          is_active: Boolean(item.is_active),
        }),
      })
    } catch (e: any) {
      setValuesError(e?.message || 'Failed to update value')
    }
  }

  async function deleteValue(id: number) {
    try {
      await apiFetch(`/api/admin/values/${valueRole}/${id}`, { method: 'DELETE' })
      setValues((prev) => prev.filter((item) => item.id !== id))
    } catch (e: any) {
      setValuesError(e?.message || 'Failed to delete value')
    }
  }

  async function createValue() {
    if (!newValue.key.trim() || !newValue.value.trim()) {
      setValuesError('Key and value are required to create a new entry.')
      return
    }
    try {
      setValuesError('')
      const res = await apiFetch(`/api/admin/values/${valueRole}`, {
        method: 'POST',
        body: JSON.stringify({
          key: newValue.key.trim(),
          value: newValue.value.trim(),
          label: newValue.label.trim() || null,
          meta: newValue.metaText || '{}',
          sort_order: Number(newValue.sort_order) || 0,
          is_active: newValue.is_active,
        }),
      })
      if (res?.data) {
        setValues((prev) => [
          { ...res.data, metaText: JSON.stringify(res.data.meta || {}, null, 2) },
          ...prev,
        ])
      }
      setNewValue({
        key: '',
        value: '',
        label: '',
        metaText: '{}',
        sort_order: '0',
        is_active: true,
      })
    } catch (e: any) {
      setValuesError(e?.message || 'Failed to create value')
    }
  }

  async function loadUsers() {
    try {
      setUsersLoading(true)
      setUsersError('')
      const url = userQuery.trim()
        ? `/api/admin/users?query=${encodeURIComponent(userQuery.trim())}`
        : '/api/admin/users'
      const res = await apiFetch(url)
      const items = Array.isArray(res?.data) ? res.data : []
      setUsers(items)
    } catch (e: any) {
      setUsersError(e?.message || 'Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }

  async function loadRequests() {
    try {
      setRequestsLoading(true)
      setRequestsError('')
      const res = await apiFetch('/api/admin/contact-requests?status=pending')
      const items = Array.isArray(res?.data) ? res.data : []
      setRequests(items)
    } catch (e: any) {
      setRequestsError(e?.message || 'Failed to load contact requests')
    } finally {
      setRequestsLoading(false)
    }
  }

  async function approveRequest(id: string) {
    try {
      const res = await apiFetch(`/api/admin/contact-requests/${id}/approve`, {
        method: 'POST',
      })
      setRequests((prev) => prev.filter((item) => item.id !== id))
      const threadId = res?.threadId
      if (threadId) setLastApprovedThread(threadId)
    } catch (e: any) {
      setRequestsError(e?.message || 'Failed to approve request')
    }
  }

  async function rejectRequest(id: string) {
    try {
      await apiFetch(`/api/admin/contact-requests/${id}/reject`, { method: 'POST' })
      setRequests((prev) => prev.filter((item) => item.id !== id))
    } catch (e: any) {
      setRequestsError(e?.message || 'Failed to reject request')
    }
  }

  function updateUserField(id: string, field: keyof AdminUser, value: any) {
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, [field]: value } : user))
    )
  }

  async function saveUser(user: AdminUser) {
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          email: user.email,
          username: user.username,
          role: user.role,
          isAdmin: Boolean(user.isAdmin),
          isLocked: Boolean(user.isLocked),
          phone: user.phone,
          countryCode: user.countryCode,
        }),
      })
    } catch (e: any) {
      setUsersError(e?.message || 'Failed to update user')
    }
  }

  async function deleteUser(userId: string) {
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      setUsers((prev) => prev.filter((user) => user.id !== userId))
    } catch (e: any) {
      setUsersError(e?.message || 'Failed to delete user')
    }
  }

  useEffect(() => {
    if (!isAdmin) return
    loadUsers()
    loadRequests()
  }, [isAdmin])

  if (loadingMe) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">
        <TopNav />
        <div className="max-w-5xl mx-auto px-4 py-10 text-sm">Loading admin panel...</div>
      </div>
    )
  }

  if (!isAdmin || isLocked) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">
        <TopNav />
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold mb-2">Admin access required</h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">
      <TopNav />
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">Dynamic Values</h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Manage onboarding and profile dropdown options by role and key.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-sm">
              <span className="block text-xs text-gray-500 dark:text-zinc-400">Role</span>
              <select
                value={valueRole}
                onChange={(e) => setValueRole(e.target.value as 'influencer' | 'brand')}
                className="border rounded-lg px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-800"
              >
                <option value="influencer">Influencer</option>
                <option value="brand">Brand</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="block text-xs text-gray-500 dark:text-zinc-400">Key</span>
              <input
                value={valueKey}
                onChange={(e) => setValueKey(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-56 dark:bg-zinc-900 dark:border-zinc-800"
                placeholder="e.g. languages"
              />
            </label>
            <button
              onClick={loadValues}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm"
            >
              {valuesLoading ? 'Loading...' : 'Load'}
            </button>
          </div>

          {valuesError && <div className="text-sm text-red-600">{valuesError}</div>}

          <div className="border rounded-xl p-4 dark:border-zinc-800 space-y-3">
            <h2 className="text-sm font-semibold">Add New Value</h2>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
              <input
                className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800"
                placeholder="key"
                value={newValue.key}
                onChange={(e) => setNewValue({ ...newValue, key: e.target.value })}
              />
              <input
                className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800"
                placeholder="value"
                value={newValue.value}
                onChange={(e) => setNewValue({ ...newValue, value: e.target.value })}
              />
              <input
                className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800"
                placeholder="label"
                value={newValue.label}
                onChange={(e) => setNewValue({ ...newValue, label: e.target.value })}
              />
              <input
                className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800"
                placeholder="sort"
                value={newValue.sort_order}
                onChange={(e) => setNewValue({ ...newValue, sort_order: e.target.value })}
              />
              <textarea
                className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800 md:col-span-2"
                placeholder='meta JSON e.g. {"icon":"instagram"}'
                value={newValue.metaText}
                onChange={(e) => setNewValue({ ...newValue, metaText: e.target.value })}
              />
            </div>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={newValue.is_active}
                onChange={(e) => setNewValue({ ...newValue, is_active: e.target.checked })}
              />
              Active
            </label>
            <button
              onClick={createValue}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm"
            >
              Add Value
            </button>
          </div>

          <div className="space-y-3">
            {preparedValues.map((item) => (
              <div
                key={item.id}
                className="border rounded-xl p-4 dark:border-zinc-800 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
                  <input
                    className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800"
                    value={item.key}
                    onChange={(e) => updateValueField(item.id, 'key', e.target.value)}
                  />
                  <input
                    className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800"
                    value={item.value}
                    onChange={(e) => updateValueField(item.id, 'value', e.target.value)}
                  />
                  <input
                    className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800"
                    value={item.label || ''}
                    onChange={(e) => updateValueField(item.id, 'label', e.target.value)}
                  />
                  <input
                    className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800"
                    value={String(item.sort_order ?? 0)}
                    onChange={(e) =>
                      updateValueField(item.id, 'sort_order', Number(e.target.value))
                    }
                  />
                  <textarea
                    className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800 md:col-span-2"
                    value={item.metaText || '{}'}
                    onChange={(e) => updateValueField(item.id, 'metaText', e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(item.is_active)}
                      onChange={(e) => updateValueField(item.id, 'is_active', e.target.checked)}
                    />
                    Active
                  </label>
                  <button
                    onClick={() => saveValue(item)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => deleteValue(item.id)}
                    className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!valuesLoading && preparedValues.length === 0 && (
              <div className="text-sm text-gray-500 dark:text-zinc-400">
                No values loaded yet.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">Requests Inbox</h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Review incoming contact requests and open chats.
            </p>
          </div>

          {requestsError && <div className="text-sm text-red-600">{requestsError}</div>}
          {lastApprovedThread && (
            <div className="text-sm text-emerald-600">
              Thread created.{' '}
              <Link href={`/inbox/${lastApprovedThread}`} className="underline">
                Open chat
              </Link>
            </div>
          )}

          <div className="border rounded-xl p-4 dark:border-zinc-800">
            {requestsLoading ? (
              <div className="text-sm text-gray-500 dark:text-zinc-400">
                Loading contact requests...
              </div>
            ) : requests.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-zinc-400">
                No pending requests.
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="border rounded-xl p-4 dark:border-zinc-800 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {req.fromUser.name} - {req.toUser.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                          {new Date(req.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveRequest(req.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectRequest(req.id)}
                          className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-600 text-xs"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">
                      {req.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">User Management</h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Lock accounts, update user details, or remove accounts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search email, username, phone"
              className="border rounded-lg px-3 py-2 text-sm w-64 dark:bg-zinc-900 dark:border-zinc-800"
            />
            <button
              onClick={loadUsers}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm"
            >
              Search
            </button>
          </div>

          {usersError && <div className="text-sm text-red-600">{usersError}</div>}

          {usersLoading ? (
            <div className="text-sm text-gray-500 dark:text-zinc-400">Loading users...</div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="border rounded-xl p-4 dark:border-zinc-800 space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
                    <input
                      className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800 md:col-span-2"
                      value={user.email || ''}
                      onChange={(e) => updateUserField(user.id, 'email', e.target.value)}
                      placeholder="Email"
                    />
                    <input
                      className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800"
                      value={user.username || ''}
                      onChange={(e) => updateUserField(user.id, 'username', e.target.value)}
                      placeholder="Username"
                    />
                    <select
                      className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800"
                      value={user.role || ''}
                      onChange={(e) => updateUserField(user.id, 'role', e.target.value)}
                    >
                      <option value="">Role</option>
                      <option value="INFLUENCER">Influencer</option>
                      <option value="BRAND">Brand</option>
                    </select>
                    <input
                      className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800"
                      value={user.phone || ''}
                      onChange={(e) => updateUserField(user.id, 'phone', e.target.value)}
                      placeholder="Phone"
                    />
                    <input
                      className="border rounded-lg px-3 py-2 dark:bg-zinc-900 dark:border-zinc-800"
                      value={user.countryCode || ''}
                      onChange={(e) => updateUserField(user.id, 'countryCode', e.target.value)}
                      placeholder="Country Code"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(user.isAdmin)}
                        onChange={(e) => updateUserField(user.id, 'isAdmin', e.target.checked)}
                      />
                      Admin
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(user.isLocked)}
                        onChange={(e) => updateUserField(user.id, 'isLocked', e.target.checked)}
                      />
                      Locked
                    </label>
                    <button
                      onClick={() => saveUser(user)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600"
                    >
                      Delete
                    </button>
                    
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
