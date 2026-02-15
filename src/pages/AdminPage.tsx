import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Header from '../components/Header';
import UserTable from '../components/admin/UserTable';
import UserFormModal from '../components/admin/UserFormModal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import type { Profile, AppRole } from '../types';

export default function AdminPage() {
  const { isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setUsers((data ?? []) as Profile[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (!isAdmin && !isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <p className="text-gray-500">Access denied. Admin or manager role required.</p>
      </div>
    );
  }

  const callEdgeFunction = async (payload: Record<string, unknown>) => {
    const { data, error: fnError } = await supabase.functions.invoke('admin-user-management', {
      body: payload,
    });
    if (fnError) {
      // Extract the actual error message from the edge function response body
      const context = (fnError as Record<string, unknown>).context;
      if (context instanceof Response) {
        try {
          const body = await context.json();
          if (body?.error) throw new Error(body.error);
        } catch (e) {
          if (e instanceof Error && e.message !== fnError.message) throw e;
        }
      }
      throw new Error(fnError.message);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleCreate = async (email: string, password: string, fullName: string, role: AppRole) => {
    await callEdgeFunction({
      action: 'create-user',
      email,
      password,
      full_name: fullName,
      role,
    });
    await fetchUsers();
  };

  const handleUpdate = async (userId: string, fullName: string, role: AppRole, email?: string) => {
    await callEdgeFunction({
      action: 'update-user',
      user_id: userId,
      full_name: fullName,
      role,
      ...(email ? { email } : {}),
    });
    await fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    await callEdgeFunction({
      action: 'delete-user',
      user_id: userId,
    });
    await fetchUsers();
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    await callEdgeFunction({
      action: 'reset-password',
      user_id: userId,
      new_password: newPassword,
    });
  };

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">User Management</h2>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all text-sm font-medium shadow-md"
          >
            + New User
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <UserTable
            users={users}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onResetPassword={handleResetPassword}
          />
        )}

        <UserFormModal
          isOpen={showModal}
          onClose={handleCloseModal}
          onCreateUser={handleCreate}
          onUpdateUser={handleUpdate}
          editingUser={editingUser}
        />
      </div>
    </div>
  );
}
