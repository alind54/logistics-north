import { STAGES } from '../../constants';

interface RequestsByStageProps {
  requestsByStage: Record<string, number>;
}

const STAGE_BORDER_COLORS: Record<string, string> = {
  mrf: 'border-blue-500',
  supplier: 'border-purple-500',
  requisition: 'border-amber-500',
  order: 'border-orange-500',
  inventory: 'border-emerald-500',
  done: 'border-gray-600',
};

const STAGE_TEXT_COLORS: Record<string, string> = {
  mrf: 'text-blue-600',
  supplier: 'text-purple-600',
  requisition: 'text-amber-600',
  order: 'text-orange-600',
  inventory: 'text-emerald-600',
  done: 'text-gray-600',
};

const STAGE_BG_COLORS: Record<string, string> = {
  mrf: 'bg-blue-50',
  supplier: 'bg-purple-50',
  requisition: 'bg-amber-50',
  order: 'bg-orange-50',
  inventory: 'bg-emerald-50',
  done: 'bg-gray-50',
};

export default function RequestsByStage({ requestsByStage }: RequestsByStageProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Requests by Stage</h3>
      <div className="space-y-2">
        {STAGES.map((stage) => {
          const count = requestsByStage[stage.id] || 0;
          const borderColor = STAGE_BORDER_COLORS[stage.id] || 'border-gray-400';
          const textColor = STAGE_TEXT_COLORS[stage.id] || 'text-gray-600';
          const bgColor = STAGE_BG_COLORS[stage.id] || 'bg-gray-50';

          return (
            <div
              key={stage.id}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border-l-4 ${borderColor} ${bgColor}`}
            >
              <span className={`text-sm font-medium ${textColor}`}>{stage.name}</span>
              <span className={`text-lg font-bold ${textColor}`}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
