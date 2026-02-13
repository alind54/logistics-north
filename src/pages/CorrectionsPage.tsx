import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { useCorrections } from '../hooks/useCorrections';
import RequestsTable from '../components/corrections/RequestsTable';
import TodosTable from '../components/corrections/TodosTable';
import DeletedItemsTable from '../components/corrections/DeletedItemsTable';

type SubTab = 'requests' | 'todos' | 'deleted';

export default function CorrectionsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<SubTab>('requests');
  const corrections = useCorrections();

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-500">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'requests', label: 'Requests' },
    { id: 'todos', label: 'Todos' },
    { id: 'deleted', label: 'Deleted Items' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-6">Admin Corrections</h2>

        <div className="flex gap-2 mb-6">
          {subTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                subTab === t.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                  : 'bg-white text-gray-500 hover:shadow-md'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {subTab === 'requests' && <RequestsTable corrections={corrections} />}
        {subTab === 'todos' && <TodosTable corrections={corrections} />}
        {subTab === 'deleted' && <DeletedItemsTable corrections={corrections} />}
      </div>
    </div>
  );
}
