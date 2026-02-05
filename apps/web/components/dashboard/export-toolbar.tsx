'use client';

import { useState } from 'react';
import { Button, Input } from '@request-tracker/ui';

export function ExportToolbar() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const res = await fetch(`/api/export/requests?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `requests-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">From</label>
        <Input
          type="date"
          value={fromDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFromDate(e.target.value)}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">To</label>
        <Input
          type="date"
          value={toDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToDate(e.target.value)}
          className="w-40"
        />
      </div>
      <Button size="sm" onClick={handleExport} disabled={exporting}>
        {exporting ? 'Exporting...' : 'Export CSV'}
      </Button>
      {(fromDate || toDate) && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => { setFromDate(''); setToDate(''); }}
        >
          Clear dates
        </button>
      )}
    </div>
  );
}
