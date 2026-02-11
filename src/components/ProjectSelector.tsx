import { FolderOpen } from 'lucide-react';
import { useProject } from '../hooks/useProject';

export default function ProjectSelector() {
  const { projects, selectedProjectId, setSelectedProjectId, loading } = useProject();

  if (loading || projects.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <FolderOpen className="w-4 h-4 text-white/70" />
      <select
        value={selectedProjectId ?? ''}
        onChange={(e) => setSelectedProjectId(e.target.value)}
        className="bg-white/20 text-white text-sm rounded-lg px-3 py-1.5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer [&>option]:text-gray-800 [&>option]:bg-white"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}
