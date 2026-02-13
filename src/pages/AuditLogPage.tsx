import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { useAuditLogs, type AuditLogFilters } from '../hooks/useAuditLogs';
import AuditLogFiltersComponent from '../components/audit/AuditLogFilters';
import AuditLogTable from '../components/audit/AuditLogTable';

export default function AuditLogPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const { logs, loading, totalCount, page, setPage, pageSize } = useAuditLogs(filters);

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

        <h2 className="text-xl font-bold text-gray-800 mb-6">Audit Log</h2>

        <AuditLogFiltersComponent filters={filters} onChange={setFilters} />
        <AuditLogTable
          logs={logs}
          loading={loading}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
