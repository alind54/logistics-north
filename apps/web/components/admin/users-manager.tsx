'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select } from '@request-tracker/ui';
import type { UserDTO } from '@request-tracker/shared';

interface UsersManagerProps {
  initialUsers: UserDTO[];
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-500/15 text-red-400',
  MANAGER: 'bg-blue-500/15 text-blue-400',
  OPERATOR: 'bg-green-500/15 text-green-400',
  VIEWER: 'bg-gray-500/15 text-gray-400',
};

export function UsersManager({ initialUsers }: UsersManagerProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  // Create form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('OPERATOR');

  const refresh = async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(data.data.users);
  };

  const startEdit = (user: UserDTO) => {
    setEditingId(user.id);
    setEditRole(user.role);
    setError('');
  };

  const handleCreate = async () => {
    if (!newEmail.trim() || !newPassword) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), password: newPassword, role: newRole }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Failed to create user');
      }
      setNewEmail('');
      setNewPassword('');
      setNewRole('OPERATOR');
      setShowCreate(false);
      await refresh();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateResetLink = async (email: string) => {
    setSaving(true);
    setError('');
    setResetLink(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Failed to generate reset link');
      }
      const body = await res.json();
      const token = body.data.token;
      setResetLink(`${window.location.origin}/reset-password?token=${token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate reset link');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Failed to update user role');
      }
      setEditingId(null);
      await refresh();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update user role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">Manage user roles and access</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'Create User'}
        </Button>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {resetLink && (
        <div className="mx-6 mt-4 rounded border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm">
          <p className="mb-1 font-medium text-blue-300">Password Reset Link Generated</p>
          <p className="mb-2 text-blue-400">Share this link with the user (expires in 24 hours):</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-muted px-2 py-1 text-xs">{resetLink}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(resetLink);
              }}
            >
              Copy
            </Button>
          </div>
          <button
            type="button"
            className="mt-2 text-xs text-blue-400 hover:underline"
            onClick={() => setResetLink(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create user form */}
      {showCreate && (
        <div className="border-b px-6 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Email</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Role</label>
              <Select
                value={newRole}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewRole(e.target.value)}
              >
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="OPERATOR">Operator</option>
                <option value="VIEWER">Viewer</option>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={saving || !newEmail.trim() || newPassword.length < 8}
            >
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="pb-3 text-left text-sm font-medium">Email</th>
              <th className="pb-3 text-left text-sm font-medium">Role</th>
              <th className="hidden pb-3 text-left text-sm font-medium sm:table-cell">
                Last Login
              </th>
              <th className="hidden pb-3 text-left text-sm font-medium md:table-cell">Created</th>
              <th className="pb-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="py-3 font-medium">{user.email}</td>
                <td className="py-3">
                  {editingId === user.id ? (
                    <Select
                      value={editRole}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditRole(e.target.value)}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="OPERATOR">Operator</option>
                      <option value="VIEWER">Viewer</option>
                    </Select>
                  ) : (
                    <span className={`rounded px-2 py-1 text-xs ${ROLE_COLORS[user.role] ?? ''}`}>
                      {user.role}
                    </span>
                  )}
                </td>
                <td className="hidden py-3 text-sm text-muted-foreground sm:table-cell">
                  {formatDate(user.lastLoginAt)}
                </td>
                <td className="hidden py-3 text-sm text-muted-foreground md:table-cell">
                  {formatDate(user.createdAt)}
                </td>
                <td className="py-3 text-right">
                  {editingId === user.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateRole(user.id)}
                        disabled={saving}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(user)}>
                        Change Role
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateResetLink(user.email)}
                        disabled={saving}
                      >
                        Reset PW
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
