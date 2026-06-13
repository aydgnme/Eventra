import { useState, useMemo } from 'react'
import { Search, Users, ShieldAlert, Shield, GraduationCap } from 'lucide-react'
import { useAdminUsers, useActivateUser, useDeactivateUser, useDeleteUser, useUpdateUserRole } from '../../hooks/useAdmin'
import { useToast } from '../../context/ToastContext'
import useDocumentTitle from '../../hooks/useDocumentTitle'

const ROLE_BADGE = {
  student: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  organizer: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  admin: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const ROLE_ICON = {
  student: GraduationCap,
  organizer: Shield,
  admin: ShieldAlert,
}

function UserRow({ user, activateMut, deactivateMut, deleteMut, roleUpdateMut, handleToggleActive, handleRoleChange, handleDelete, formatDate }) {
  const RoleIcon = ROLE_ICON[user.role] ?? Users
  const busy = (activateMut.isPending && activateMut.variables === user.id)
    || (deactivateMut.isPending && deactivateMut.variables === user.id)
    || (deleteMut.isPending && deleteMut.variables === user.id)
    || (roleUpdateMut.isPending && roleUpdateMut.variables?.id === user.id)

  return (
    <tr className="border-b border-border hover:bg-surface-alt/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 text-xs font-bold shrink-0">
            {(user.full_name || user.email || '?')[0].toUpperCase()}
          </div>
          <span className="font-medium text-fg truncate max-w-32">{user.full_name || '—'}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-fg-3">{user.email}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize flex items-center gap-1 ${ROLE_BADGE[user.role] ?? 'bg-surface-alt text-fg-2 border-border'}`}>
            <RoleIcon className="w-3 h-3" />
            {user.role}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          user.is_active
            ? 'bg-green-500/10 text-green-500'
            : 'bg-surface-alt text-fg-3'
        }`}>
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3 text-fg-3 whitespace-nowrap">{formatDate(user.created_at)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <select
            value={user.role}
            onChange={(e) => handleRoleChange(user, e.target.value)}
            disabled={!!busy}
            className="px-2 py-1 rounded-lg bg-surface-alt border border-border text-fg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all disabled:opacity-50"
          >
            <option value="student">Student</option>
            <option value="organizer">Organizer</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={() => handleToggleActive(user)}
            disabled={!!busy}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
              user.is_active
                ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/20'
                : 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20'
            }`}
          >
            {(activateMut.isPending && activateMut.variables === user.id)
              || (deactivateMut.isPending && deactivateMut.variables === user.id)
              ? '...'
              : user.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => handleDelete(user)}
            disabled={!!busy}
            className="px-2 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50"
          >
            {deleteMut.isPending && deleteMut.variables === user.id ? '...' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  )
}

function TableSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 border-b border-border bg-surface-alt/40" />
      ))}
    </div>
  )
}

export default function UserManagementPage() {
  useDocumentTitle('User Management')
  const { addToast } = useToast()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const queryParams = {
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(statusFilter ? { is_active: statusFilter === 'active' } : {}),
  }
  const { data, isLoading } = useAdminUsers(queryParams)

  const activateMut = useActivateUser()
  const deactivateMut = useDeactivateUser()
  const deleteMut = useDeleteUser()
  const roleUpdateMut = useUpdateUserRole()

  const users = useMemo(() => data?.users ?? [], [data])

  const filtered = useMemo(() => {
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    )
  }, [users, search])

  function handleToggleActive(user) {
    if (user.is_active) {
      deactivateMut.mutate(user.id, {
        onSuccess: () => addToast('User deactivated', 'info'),
        onError: (err) => addToast(err.message || 'Failed to update user status', 'error'),
      })
    } else {
      activateMut.mutate(user.id, {
        onSuccess: () => addToast('User activated', 'success'),
        onError: (err) => addToast(err.message || 'Failed to update user status', 'error'),
      })
    }
  }

  function handleRoleChange(user, newRole) {
    if (newRole === user.role) return
    roleUpdateMut.mutate({ id: user.id, role: newRole }, {
      onSuccess: () => addToast(`Role updated to ${newRole}`, 'success'),
      onError: (err) => addToast(err.message || 'Failed to update role', 'error'),
    })
  }

  function handleDelete(user) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${user.full_name || user.email}"? This action cannot be undone.`
    )
    if (!confirmed) return
    deleteMut.mutate(user.id, {
      onSuccess: () => addToast('User deleted', 'info'),
      onError: (err) => addToast(err.message || 'Failed to delete user', 'error'),
    })
  }

  function formatDate(dt) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">User Management</h1>
        <p className="text-fg-3 text-sm mt-1">Manage platform users, roles and account status</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface border border-border text-fg placeholder-fg-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface border border-border text-fg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
        >
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="organizer">Organizer</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface border border-border text-fg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-fg-3 opacity-30" />
          <p className="font-medium text-fg-2">No users found</p>
          <p className="text-sm text-fg-3 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">Joined</th>
                  <th className="text-left px-4 py-3 font-semibold text-fg-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    activateMut={activateMut}
                    deactivateMut={deactivateMut}
                    deleteMut={deleteMut}
                    roleUpdateMut={roleUpdateMut}
                    handleToggleActive={handleToggleActive}
                    handleRoleChange={handleRoleChange}
                    handleDelete={handleDelete}
                    formatDate={formatDate}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border text-xs text-fg-3">
            Showing {filtered.length} of {users.length} users
          </div>
        </div>
      )}
    </div>
  )
}
