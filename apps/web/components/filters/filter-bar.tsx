'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button, Input, Select } from '@request-tracker/ui';
import type { StageDTO } from '@request-tracker/shared';

interface FilterBarProps {
  stages: StageDTO[];
  showFlowType?: boolean;
}

export function FilterBar({ stages, showFlowType = true }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('query') ?? '');
  const [stageId, setStageId] = useState(searchParams.get('stageId') ?? '');
  const [priority, setPriority] = useState(searchParams.get('priority') ?? '');
  const [flowType, setFlowType] = useState(searchParams.get('flowType') ?? '');
  const [dueBefore, setDueBefore] = useState(searchParams.get('dueBefore') ?? '');
  const [dueAfter, setDueAfter] = useState(searchParams.get('dueAfter') ?? '');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const applyFilters = useCallback((overrides?: {
    query?: string;
    stageId?: string;
    priority?: string;
    flowType?: string;
    dueBefore?: string;
    dueAfter?: string;
  }) => {
    const q = overrides?.query ?? query;
    const s = overrides?.stageId ?? stageId;
    const p = overrides?.priority ?? priority;
    const f = overrides?.flowType ?? flowType;
    const db = overrides?.dueBefore ?? dueBefore;
    const da = overrides?.dueAfter ?? dueAfter;

    const params = new URLSearchParams();
    if (q) params.set('query', q);
    if (s) params.set('stageId', s);
    if (p) params.set('priority', p);
    if (f) params.set('flowType', f);
    if (db) params.set('dueBefore', db);
    if (da) params.set('dueAfter', da);
    params.set('page', '1');

    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, query, stageId, priority, flowType, dueBefore, dueAfter]);

  const clearFilters = useCallback(() => {
    setQuery('');
    setStageId('');
    setPriority('');
    setFlowType('');
    setDueBefore('');
    setDueAfter('');
    router.push(pathname);
  }, [router, pathname]);

  // Debounced search - auto-apply after 300ms of no typing (skip initial mount)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      applyFilters({ query });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // Only trigger on query changes, not on every applyFilters reference change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Auto-apply handlers for dropdowns and date inputs
  const handleStageChange = (value: string) => {
    setStageId(value);
    applyFilters({ stageId: value });
  };

  const handlePriorityChange = (value: string) => {
    setPriority(value);
    applyFilters({ priority: value });
  };

  const handleFlowTypeChange = (value: string) => {
    setFlowType(value);
    applyFilters({ flowType: value });
  };

  const handleDueAfterChange = (value: string) => {
    setDueAfter(value);
    applyFilters({ dueAfter: value });
  };

  const handleDueBeforeChange = (value: string) => {
    setDueBefore(value);
    applyFilters({ dueBefore: value });
  };

  const hasActiveFilters = query || stageId || priority || flowType || dueBefore || dueAfter;

  // Active filter chips
  const chips: { label: string; onRemove: () => void }[] = [];
  if (query) chips.push({ label: `Search: "${query}"`, onRemove: () => { setQuery(''); applyFilters({ query: '' }); } });
  if (stageId) {
    const stageName = stages.find((s) => s.id === stageId)?.name ?? 'Unknown';
    chips.push({ label: `Stage: ${stageName}`, onRemove: () => { setStageId(''); applyFilters({ stageId: '' }); } });
  }
  if (priority) chips.push({ label: `Priority: ${priority}`, onRemove: () => { setPriority(''); applyFilters({ priority: '' }); } });
  if (flowType) chips.push({ label: `Flow: ${flowType}`, onRemove: () => { setFlowType(''); applyFilters({ flowType: '' }); } });
  if (dueBefore) chips.push({ label: `Due before: ${dueBefore}`, onRemove: () => { setDueBefore(''); applyFilters({ dueBefore: '' }); } });
  if (dueAfter) chips.push({ label: `Due after: ${dueAfter}`, onRemove: () => { setDueAfter(''); applyFilters({ dueAfter: '' }); } });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-muted/50 p-4">
        {/* Search */}
        <div className="w-full space-y-1 sm:w-auto sm:flex-1">
          <label className="text-xs font-medium text-muted-foreground">Search</label>
          <Input
            placeholder="Search description or notes..."
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          />
        </div>

        {/* Stage */}
        <div className="w-full space-y-1 sm:w-auto">
          <label className="text-xs font-medium text-muted-foreground">Stage</label>
          <Select
            value={stageId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleStageChange(e.target.value)}
          >
            <option value="">All stages</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Priority */}
        <div className="w-full space-y-1 sm:w-auto">
          <label className="text-xs font-medium text-muted-foreground">Priority</label>
          <Select
            value={priority}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePriorityChange(e.target.value)}
          >
            <option value="">All</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>

        {/* Flow Type */}
        {showFlowType && (
          <div className="w-full space-y-1 sm:w-auto">
            <label className="text-xs font-medium text-muted-foreground">Flow Type</label>
            <Select
              value={flowType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFlowTypeChange(e.target.value)}
            >
              <option value="">All</option>
              <option value="ORDER">Order</option>
              <option value="CONTRACT">Contract</option>
            </Select>
          </div>
        )}

        {/* Due Date Range */}
        <div className="w-full space-y-1 sm:w-auto">
          <label className="text-xs font-medium text-muted-foreground">Due After</label>
          <Input
            type="date"
            value={dueAfter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDueAfterChange(e.target.value)}
          />
        </div>

        <div className="w-full space-y-1 sm:w-auto">
          <label className="text-xs font-medium text-muted-foreground">Due Before</label>
          <Input
            type="date"
            value={dueBefore}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDueBeforeChange(e.target.value)}
          />
        </div>

        {/* Clear button - only when filters are active */}
        {hasActiveFilters && (
          <Button size="sm" variant="outline" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs"
            >
              {chip.label}
              <button
                type="button"
                className="ml-1 rounded-full hover:bg-accent"
                onClick={chip.onRemove}
                aria-label={`Remove filter: ${chip.label}`}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
