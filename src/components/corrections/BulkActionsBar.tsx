import { useState } from 'react';
import { ChevronDown, Trash2, ArrowRightLeft } from 'lucide-react';
import { STAGES } from '../../constants';

interface BulkActionsBarProps {
  selectedCount: number;
  onBulkMove: (stageId: string) => void;
  onBulkDelete: () => void;
}

export default function BulkActionsBar({
  selectedCount,
  onBulkMove,
  onBulkDelete,
}: BulkActionsBarProps) {
  const [showStageDropdown, setShowStageDropdown] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-4 px-6 py-3 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl">
        <span className="text-sm font-medium text-gray-700">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </span>

        <div className="h-6 w-px bg-gray-200" />

        <div className="relative">
          <button
            onClick={() => setShowStageDropdown(!showStageDropdown)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Move to Stage
            <ChevronDown className="w-3 h-3" />
          </button>

          {showStageDropdown && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-1 overflow-hidden">
              {STAGES.map(stage => (
                <button
                  key={stage.id}
                  onClick={() => {
                    onBulkMove(stage.id);
                    setShowStageDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${stage.color}`} />
                  {stage.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onBulkDelete}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md"
        >
          <Trash2 className="w-4 h-4" />
          Delete Selected
        </button>
      </div>
    </div>
  );
}
