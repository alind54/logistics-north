import { useState } from 'react';
import type { TabId } from '../types';
import { useRequests } from '../hooks/useRequests';
import { useTodos } from '../hooks/useTodos';
import { useProject } from '../hooks/useProject';
import Header from '../components/Header';
import TabNavigation from '../components/TabNavigation';
import RequestTracker from '../components/request-tracker/RequestTracker';
import TodoList from '../components/todo-list/TodoList';
import ProjectDashboard from '../components/dashboard/ProjectDashboard';
import { FolderOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('requests');
  const { selectedProjectId, projects, loading: projectsLoading } = useProject();
  const { isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const requestsHook = useRequests(selectedProjectId);
  const todosHook = useTodos(selectedProjectId);

  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-12 text-center">
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No projects yet.</p>
          {(isAdmin || isManager) ? (
            <button
              onClick={() => navigate('/projects')}
              className="mt-4 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all text-sm font-medium shadow-md"
            >
              Create Your First Project
            </button>
          ) : (
            <p className="text-gray-400 text-sm mt-2">Ask an admin or manager to add you to a project.</p>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'requests' ? (
          <RequestTracker {...requestsHook} projectId={selectedProjectId} />
        ) : activeTab === 'todos' ? (
          <TodoList {...todosHook} />
        ) : activeTab === 'dashboard' ? (
          <ProjectDashboard projectId={selectedProjectId} />
        ) : null}
      </main>
    </div>
  );
}
