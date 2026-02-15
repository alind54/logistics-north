import { Package, Clock, CheckCircle2, FileText, ListTodo } from 'lucide-react';

interface SummaryCardsProps {
  requestsByStage: Record<string, number>;
  totalAttachments: number;
  todoStats: { total: number; completed: number };
}

export default function SummaryCards({ requestsByStage, totalAttachments, todoStats }: SummaryCardsProps) {
  const totalRequests = Object.values(requestsByStage).reduce((sum, count) => sum + count, 0);
  const completedRequests = (requestsByStage['done_orders'] || 0) + (requestsByStage['done_contracts'] || 0);
  const inProgressRequests = totalRequests - completedRequests;

  const cards = [
    {
      label: 'Total Requests',
      value: totalRequests,
      icon: Package,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'In Progress',
      value: inProgressRequests,
      icon: Clock,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Completed',
      value: completedRequests,
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Documents',
      value: totalAttachments,
      icon: FileText,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Todos',
      value: `${todoStats.completed}/${todoStats.total}`,
      icon: ListTodo,
      iconColor: 'text-indigo-500',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className={`${card.bgColor} rounded-lg p-2`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
