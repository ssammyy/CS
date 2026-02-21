-- Ensures expense approval columns exist (handles "missing column [status]" when V27 did not run or DB was created by Hibernate).
-- Idempotent: safe to run even if columns already exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'expenses' AND column_name = 'status') THEN
    ALTER TABLE expenses ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'APPROVED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'expenses' AND column_name = 'approved_by_id') THEN
    ALTER TABLE expenses ADD COLUMN approved_by_id UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'expenses' AND column_name = 'approved_at') THEN
    ALTER TABLE expenses ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'expenses' AND column_name = 'rejection_reason') THEN
    ALTER TABLE expenses ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

UPDATE expenses SET status = 'APPROVED' WHERE status IS NULL OR status = '';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'expenses' AND column_name = 'status' AND is_nullable = 'YES') THEN
    ALTER TABLE expenses ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_expense_status') THEN
    ALTER TABLE expenses ADD CONSTRAINT chk_expense_status CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
