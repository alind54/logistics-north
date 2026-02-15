import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useProject } from '../hooks/useProject';

const MAX_VISIBLE = 5;

export default function ProjectSelector() {
  const { projects, selectedProjectId, setSelectedProjectId, loading } = useProject();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading || projects.length === 0) return null;

  const visibleProjects = projects.slice(0, MAX_VISIBLE);
  const overflowProjects = projects.slice(MAX_VISIBLE);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {visibleProjects.map((p) => (
        <button
          key={p.id}
          onClick={() => setSelectedProjectId(p.id)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            selectedProjectId === p.id
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
              : 'bg-white text-gray-600 border border-gray-200 hover:shadow-sm hover:border-gray-300'
          }`}
        >
          {p.name}
        </button>
      ))}
      {overflowProjects.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              overflowProjects.some(p => p.id === selectedProjectId)
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:shadow-sm hover:border-gray-300'
            }`}
          >
            More
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]">
              {overflowProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    selectedProjectId === p.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
