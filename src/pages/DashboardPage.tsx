import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TabId } from '../types';
import { useRequests } from '../hooks/useRequests';
import { useTodos } from '../hooks/useTodos';
import { useProject } from '../hooks/useProject';
import Header from '../components/Header';
import TabNavigation from '../components/TabNavigation';
import ProjectSelector from '../components/ProjectSelector';
import RequestTracker from '../components/request-tracker/RequestTracker';
import TodoList from '../components/todo-list/TodoList';
import ProjectDashboard from '../components/dashboard/ProjectDashboard';
import RoleGate from '../components/auth/RoleGate';
import { FolderOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('requests');
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const { selectedProjectId, projects, loading: projectsLoading } = useProject();
  const { isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const requestsHook = useRequests(selectedProjectId);
  const todosHook = useTodos(selectedProjectId);

  const doneCount = requestsHook.requests.filter(r => r.stage === 'done_orders' || r.stage === 'done_contracts').length;

  const handleClearDone = async () => {
    if (window.confirm(`Clear all ${doneCount} done item(s)?`)) {
      const count = await requestsHook.clearDoneRequests();
      alert(`Cleared ${count} done item(s)!`);
    }
  };

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

      {/* Project bar + action buttons */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <ProjectSelector />
          <div className="flex items-center gap-2">
            {activeTab === 'requests' && (
              <RoleGate allowed={['admin', 'manager']}>
                {doneCount > 0 && (
                  <button
                    onClick={handleClearDone}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all shadow-md text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Done ({doneCount})
                  </button>
                )}
                <button
                  onClick={() => setShowNewRequestModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  New Request
                </button>
              </RoleGate>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'requests' ? (
          <RequestTracker
            {...requestsHook}
            projectId={selectedProjectId}
            showNewRequestModal={showNewRequestModal}
            onCloseNewRequestModal={() => setShowNewRequestModal(false)}
          />
        ) : activeTab === 'todos' ? (
          <TodoList {...todosHook} />
        ) : activeTab === 'dashboard' ? (
          <ProjectDashboard projectId={selectedProjectId} />
        ) : null}
      </main>
    </div>
  );
}
