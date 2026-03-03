-- Migration 009: Stage history tracking for MRF requests
-- Tracks when each request entered each stage of the workflow

CREATE TABLE IF NOT EXISTS request_stage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_history_request_id ON request_stage_history(request_id);

ALTER TABLE request_stage_history ENABLE ROW LEVEL SECURITY;

-- Project members can read history for requests in their projects
CREATE POLICY "stage_history_select" ON request_stage_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      JOIN requests r ON r.id = request_id
      WHERE pm.project_id = r.project_id AND pm.user_id = auth.uid()
    )
  );

-- Project members can insert (when moving stages)
CREATE POLICY "stage_history_insert" ON request_stage_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      JOIN requests r ON r.id = request_id
      WHERE pm.project_id = r.project_id AND pm.user_id = auth.uid()
    )
  );

-- Best-effort backfill: create a single history entry for all existing requests
-- using their current stage and created_at as an approximation
INSERT INTO request_stage_history (request_id, stage_id, entered_at)
SELECT id, stage_id, created_at
FROM requests
WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;
