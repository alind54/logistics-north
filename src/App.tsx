import { useState } from 'react';
import type { TabId } from './types';
import { useRequests } from './hooks/useRequests';
import { useTodos } from './hooks/useTodos';
import Header from './components/Header';
import TabNavigation from './components/TabNavigation';
import RequestTracker from './components/request-tracker/RequestTracker';
import TodoList from './components/todo-list/TodoList';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('requests');
  const requestsHook = useRequests();
  const todosHook = useTodos();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'requests' ? (
          <RequestTracker {...requestsHook} />
        ) : (
          <TodoList {...todosHook} />
        )}
      </main>
    </div>
  );
}

export default App;
