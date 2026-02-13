import { useDashboardData } from '../../hooks/useDashboardData';
import SummaryCards from './SummaryCards';
import StageDistribution from './StageDistribution';
import RecentActivity from './RecentActivity';
import { LayoutDashboard, Loader2 } from 'lucide-react';

interface ProjectDashboardProps {
  projectId: string | null;
}

export default function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const { stageData, totalAttachments, todoStats, recentLogs, loading } = useDashboardData(projectId);

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <LayoutDashboard className="w-16 h-16 mb-4" />
        <p className="text-lg font-medium">Select a project</p>
        <p className="text-sm mt-1">Choose a project from the selector above to view its dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SummaryCards
        requestsByStage={stageData}
        totalAttachments={totalAttachments}
        todoStats={todoStats}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StageDistribution requestsByStage={stageData} />
        <RecentActivity logs={recentLogs} />
      </div>
    </div>
  );
}
