import { Package, ClipboardList, Shield, FolderOpen } from 'lucide-react';
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

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'requests', label: 'Request Tracker', icon: <Package className="w-5 h-5" /> },
    { id: 'todos', label: 'To-Do List', icon: <ClipboardList className="w-5 h-5" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6">
      <div className="flex gap-2">
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
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 bg-white text-gray-500 hover:shadow-md hover:scale-[1.02]"
          >
            <Shield className="w-5 h-5" />
            Admin
          </button>
        )}
      </div>
    </div>
  );
}
