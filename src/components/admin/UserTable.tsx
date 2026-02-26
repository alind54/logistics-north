import { useState } from 'react';
import { Edit2, Trash2, Key } from 'lucide-react';
import type { Profile } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../Modal';

interface UserTableProps {
  users: Profile[];
  onEdit: (user: Profile) => void;
  onDelete: (userId: string) => Promise<void>;
  onResetPassword: (userId: string, newPassword: string) => Promise<void>;
}

export default function UserTable({ users, onEdit, onDelete, onResetPassword }: UserTableProps) {
  const { user: currentUser } = useAuth();
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const roleBadgeColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    manager: 'bg-blue-100 text-blue-700',
    logistics: 'bg-emerald-100 text-emerald-700',
  };

  const handleDelete = async (userId: string, email: string) => {
    if (userId === currentUser?.id) {
      alert('You cannot delete your own account');
      return;
    }
    if (!window.confirm(`Delete user "${email}"? This cannot be undone.`)) return;
    setActionLoading(userId);
    try {
      await onDelete(userId);
    } catch (err) {
      alert('Failed to delete user: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    setActionLoading('');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || resetPassword.length < 6) {
      setActionMsg('Password must be at least 6 characters');
      return;
    }
    setActionLoading(resetUserId);
    setActionMsg('');
    try {
      await onResetPassword(resetUserId, resetPassword);
      setActionMsg('Password reset successfully');
      setTimeout(() => {
        setResetUserId(null);
        setResetPassword('');
        setActionMsg('');
      }, 1500);
    } catch (err) {
      setActionMsg('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    setActionLoading('');
  };

  function getInitials(name: string, email: string): string {
    const source = name || email;
    const parts = source.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                      {getInitials(u.full_name, u.email)}
                    </div>
                    <span className="font-medium text-gray-800 truncate max-w-[180px] inline-block">{u.full_name || '(no name)'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 truncate max-w-[220px]">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleBadgeColors[u.role] || 'bg-gray-100 text-gray-700'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(u)}
                      className="p-1.5 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setResetUserId(u.id); setResetPassword(''); setActionMsg(''); }}
                      className="p-1.5 rounded hover:bg-amber-50 text-amber-400 hover:text-amber-600 transition-colors"
                      title="Reset Password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.email)}
                      disabled={actionLoading === u.id}
                      className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No users found</div>
        )}
      </div>

      <Modal
        isOpen={resetUserId !== null}
        onClose={() => { setResetUserId(null); setResetPassword(''); setActionMsg(''); }}
        title="Reset Password"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-gray-500">
            Set a new password for {users.find(u => u.id === resetUserId)?.email}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="At least 6 characters"
              required
            />
          </div>
          {actionMsg && (
            <p className={`text-sm ${actionMsg.includes('success') ? 'text-emerald-600' : 'text-red-600'}`}>
              {actionMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={actionLoading === resetUserId}
            className="w-full py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all text-sm font-medium disabled:opacity-50"
          >
            {actionLoading === resetUserId ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </Modal>
    </>
  );
}
