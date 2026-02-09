'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@request-tracker/ui';
import type { StageDTO, TransitionDTO, TagDTO, UserDTO } from '@request-tracker/shared';

const TabSkeleton = () => (
  <div className="space-y-3 p-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
    ))}
  </div>
);

const StagesManager = dynamic(
  () => import('./stages-manager').then((m) => ({ default: m.StagesManager })),
  { loading: TabSkeleton }
);
const TransitionsManager = dynamic(
  () => import('./transitions-manager').then((m) => ({ default: m.TransitionsManager })),
  { loading: TabSkeleton }
);
const TagsManager = dynamic(
  () => import('./tags-manager').then((m) => ({ default: m.TagsManager })),
  { loading: TabSkeleton }
);
const UsersManager = dynamic(
  () => import('./users-manager').then((m) => ({ default: m.UsersManager })),
  { loading: TabSkeleton }
);

interface TransitionWithStages extends TransitionDTO {
  fromStageName: string;
  toStageName: string;
}

interface AdminTabsProps {
  initialStages: StageDTO[];
  initialTransitions: TransitionWithStages[];
  initialTags: TagDTO[];
  initialUsers: UserDTO[];
}

const tabs = [
  { id: 'stages', label: 'Stages' },
  { id: 'transitions', label: 'Transitions' },
  { id: 'tags', label: 'Tags' },
  { id: 'users', label: 'Users' },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function AdminTabs({
  initialStages,
  initialTransitions,
  initialTags,
  initialUsers,
}: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('stages');

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'stages' && <StagesManager initialStages={initialStages} />}
      {activeTab === 'transitions' && (
        <TransitionsManager initialTransitions={initialTransitions} stages={initialStages} />
      )}
      {activeTab === 'tags' && <TagsManager initialTags={initialTags} />}
      {activeTab === 'users' && <UsersManager initialUsers={initialUsers} />}
    </div>
  );
}
