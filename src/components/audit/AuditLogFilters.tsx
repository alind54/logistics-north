import { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import type { AuditLogFilters as Filters } from '../../hooks/useAuditLogs';
import { useProject } from '../../hooks/useProject';
import { supabase } from '../../lib/supabase';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const ACTIONS = ['create', 'update', 'delete', 'move_stage', 'correction', 'upload', 'delete_file'];
const ENTITY_TYPES = ['request', 'todo', 'project', 'attachment'];

export default function AuditLogFilters({ filters, onChange }: Props) {
  const { projects } = useProject();
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string }[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, email').order('full_name').then(({ data }) => {
      if (data) setUsers(data);
    });
  }, []);

  const update = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filters</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <select
          value={filters.projectId ?? ''}
          onChange={e => update('projectId', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={filters.userId ?? ''}
          onChange={e => update('userId', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Users</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </select>

        <select
          value={filters.action ?? ''}
          onChange={e => update('action', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
        </select>

        <select
          value={filters.entityType ?? ''}
          onChange={e => update('entityType', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={e => update('dateFrom', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="From"
        />

        <input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={e => update('dateTo', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="To"
        />
      </div>
    </div>
  );
}
