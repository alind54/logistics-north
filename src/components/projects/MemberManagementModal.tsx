import { useState, useEffect, useCallback } from 'react';
import { UserPlus, X as XIcon, Loader2 } from 'lucide-react';
import type { Profile } from '../../types';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../lib/toast';
import Modal from '../Modal';

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  projectName: string;
  onMembersChanged: () => void;
}

interface MemberWithProfile {
  user_id: string;
  profile: Profile;
}

export default function MemberManagementModal({ isOpen, onClose, projectId, projectName, onMembersChanged }: MemberManagementModalProps) {
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUserId, setAddingUserId] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const fetchMembers = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from('project_members')
      .select('user_id, profiles!inner(id, email, full_name, role, created_at, updated_at)')
      .eq('project_id', projectId);

    if (data) {
      const mapped = data.map((row: Record<string, unknown>) => ({
        user_id: row.user_id as string,
        profile: row.profiles as unknown as Profile,
      }));
      setMembers(mapped);
    }
  }, [projectId]);

  const fetchAllUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    if (data) setAllUsers(data as Profile[]);
  }, []);

  useEffect(() => {
    if (isOpen && projectId) {
      setLoading(true);
      Promise.all([fetchMembers(), fetchAllUsers()]).finally(() => setLoading(false));
    }
  }, [isOpen, projectId, fetchMembers, fetchAllUsers]);

  const memberIds = new Set(members.map(m => m.user_id));
  const nonMembers = allUsers.filter(u => !memberIds.has(u.id));

  const handleAddMember = async () => {
    if (!projectId || !addingUserId) return;
    setActionLoading(addingUserId);
    const { error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: addingUserId });
    if (error) {
      showToast('error', 'Failed to add member: ' + error.message);
    } else {
      await fetchMembers();
      onMembersChanged();
    }
    setAddingUserId('');
    setActionLoading('');
  };

  const handleRemoveMember = async (userId: string) => {
    if (!projectId) return;
    if (!window.confirm('Remove this member from the project?')) return;
    setActionLoading(userId);
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);
    if (error) {
      showToast('error', 'Failed to remove member: ' + error.message);
    } else {
      await fetchMembers();
      onMembersChanged();
    }
    setActionLoading('');
  };

  const roleBadgeColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    manager: 'bg-blue-100 text-blue-700',
    logistics: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Members — ${projectName}`}>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Add member */}
          {nonMembers.length > 0 && (
            <div className="flex gap-2">
              <select
                value={addingUserId}
                onChange={(e) => setAddingUserId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select user to add...</option>
                {nonMembers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email} ({u.role})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!addingUserId || actionLoading === addingUserId}
                className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Member list */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {members.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No members yet</p>
            ) : (
              members.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                      {(m.profile.full_name || m.profile.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.profile.full_name || m.profile.email}</p>
                      <p className="text-xs text-gray-400">{m.profile.email}</p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${roleBadgeColors[m.profile.role] || 'bg-gray-100 text-gray-700'}`}>
                      {m.profile.role}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(m.user_id)}
                    disabled={actionLoading === m.user_id}
                    className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Remove member"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <p className="text-xs text-gray-400 text-center">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </Modal>
  );
}
