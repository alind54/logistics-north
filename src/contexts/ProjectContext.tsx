import { createContext, useState, useEffect, useCallback } from 'react';
import type { Project } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const STORAGE_KEY = 'logistics-selected-project';

interface ProjectContextType {
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  loading: boolean;
  refreshProjects: () => Promise<void>;
}

export const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  selectedProjectId: null,
  setSelectedProjectId: () => {},
  loading: true,
  refreshProjects: async () => {},
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('name');
    if (!error && data) {
      setProjects(data as Project[]);
    }
  }, []);

  const setSelectedProjectId = useCallback((id: string) => {
    setSelectedProjectIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  // Fetch projects when user is available
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProjects([]);
      setSelectedProjectIdState(null);
      setLoading(false);
      return;
    }

    fetchProjects().finally(() => setLoading(false));

    // Realtime subscription for projects and project_members
    const channel = supabase
      .channel('projects-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authLoading, fetchProjects]);

  // Restore or pick selected project once projects load
  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProjectIdState(null);
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && projects.some(p => p.id === stored)) {
      setSelectedProjectIdState(stored);
    } else {
      const firstId = projects[0].id;
      setSelectedProjectIdState(firstId);
      localStorage.setItem(STORAGE_KEY, firstId);
    }
  }, [projects]);

  return (
    <ProjectContext.Provider value={{ projects, selectedProjectId, setSelectedProjectId, loading, refreshProjects: fetchProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}
