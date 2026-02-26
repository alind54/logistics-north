import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Users } from 'lucide-react';
import Header from '../components/Header';
import ProjectFormModal from '../components/projects/ProjectFormModal';
import MemberManagementModal from '../components/projects/MemberManagementModal';
import { useAuth } from '../hooks/useAuth';
import { useProject } from '../hooks/useProject';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';
import type { Project } from '../types';

export default function ProjectsPage() {
  const { user, isAdmin, isManager } = useAuth();
  const { projects, refreshProjects } = useProject();
  const navigate = useNavigate();
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [membersProjectId, setMembersProjectId] = useState<string | null>(null);
  const [membersProjectName, setMembersProjectName] = useState('');

  if (!isAdmin && !isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <p className="text-gray-500">Access denied. Admin or Manager role required.</p>
      </div>
    );
  }

  const handleCreate = async (name: string, description: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('projects')
      .insert({ name, description, created_by: user.id });
    if (error) throw new Error(error.message);
    await refreshProjects();
  };

  const handleUpdate = async (name: string, description: string) => {
    if (!editingProject) return;
    const { error } = await supabase
      .from('projects')
      .update({ name, description })
      .eq('id', editingProject.id);
    if (error) throw new Error(error.message);
    await refreshProjects();
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Delete project "${project.name}"? All requests and todos in this project will be permanently deleted.`)) return;
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);
    if (error) {
      showToast('error', 'Failed to delete project: ' + error.message);
    } else {
      await refreshProjects();
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setShowFormModal(true);
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    setEditingProject(null);
  };

  const handleManageMembers = (project: Project) => {
    setMembersProjectId(project.id);
    setMembersProjectName(project.name);
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
          <h2 className="text-xl font-bold text-gray-800">Projects</h2>
          <button
            onClick={() => setShowFormModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all text-sm font-medium shadow-md"
          >
            + New Project
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[200px]">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{p.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleManageMembers(p)}
                        className="p-1.5 rounded hover:bg-emerald-50 text-emerald-400 hover:text-emerald-600 transition-colors"
                        title="Manage Members"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-1.5 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
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
          {projects.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No projects yet. Create your first one!</div>
          )}
        </div>

        <ProjectFormModal
          isOpen={showFormModal}
          onClose={handleCloseFormModal}
          onSubmit={editingProject ? handleUpdate : handleCreate}
          editingProject={editingProject}
        />

        <MemberManagementModal
          isOpen={membersProjectId !== null}
          onClose={() => setMembersProjectId(null)}
          projectId={membersProjectId}
          projectName={membersProjectName}
          onMembersChanged={refreshProjects}
        />
      </div>
    </div>
  );
}
