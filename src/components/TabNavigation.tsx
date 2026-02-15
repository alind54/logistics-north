import { Package, ClipboardList, Shield, FolderOpen, BarChart3, ScrollText, Wrench } from 'lucide-react';
import type { TabId } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { isAdmin, isManager } = useAuth();
  const navigate = useNavigate();

  const allTabs: { id: TabId; label: string; icon: React.ReactNode; roles?: ('admin' | 'manager')[] }[] = [
    { id: 'requests', label: 'Request Tracker', icon: <Package className="w-5 h-5" /> },
    { id: 'todos', label: 'To-Do List', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-5 h-5" />, roles: ['admin', 'manager'] },
  ];

  const tabs = allTabs.filter(t => !t.roles || (isAdmin && t.roles.includes('admin')) || (isManager && t.roles.includes('manager')));

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6">
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105'
                : 'bg-white text-gray-500 hover:shadow-md hover:scale-[1.02]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        {(isAdmin || isManager) && (
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 bg-white text-gray-500 hover:shadow-md hover:scale-[1.02]"
          >
            <FolderOpen className="w-5 h-5" />
            Projects
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => navigate('/audit')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 bg-white text-gray-500 hover:shadow-md hover:scale-[1.02]"
          >
            <ScrollText className="w-5 h-5" />
            Audit Log
          </button>
        )}
        {(isAdmin || isManager) && (
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 bg-white text-gray-500 hover:shadow-md hover:scale-[1.02]"
          >
            <Shield className="w-5 h-5" />
            Admin
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => navigate('/corrections')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 bg-white text-gray-500 hover:shadow-md hover:scale-[1.02]"
          >
            <Wrench className="w-5 h-5" />
            Corrections
          </button>
        )}
      </div>
    </div>
  );
}
