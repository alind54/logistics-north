import { STAGES } from '../../constants';

interface StageDistributionProps {
  requestsByStage: Record<string, number>;
}

const STAGE_BAR_COLORS: Record<string, string> = {
  mrf: 'bg-blue-500',
  supplier: 'bg-purple-500',
  requisition: 'bg-amber-500',
  order: 'bg-orange-500',
  inventory: 'bg-emerald-500',
  done: 'bg-gray-600',
};

export default function StageDistribution({ requestsByStage }: StageDistributionProps) {
  const total = Object.values(requestsByStage).reduce((sum, count) => sum + count, 0);
  const maxCount = Math.max(...Object.values(requestsByStage), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Stage Distribution</h3>
      {total === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No requests yet</p>
      ) : (
        <div className="space-y-3">
          {STAGES.map((stage) => {
            const count = requestsByStage[stage.id] || 0;
            const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const barColor = STAGE_BAR_COLORS[stage.id] || 'bg-gray-400';

            return (
              <div key={stage.id} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-36 shrink-0 truncate">
                  {stage.name}
                </span>
                <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${widthPercent}%`, minWidth: count > 0 ? '8px' : '0' }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-8 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
