-- Expense approval workflow: non-admins create as PENDING_APPROVAL; admins approve/reject.
-- Idempotent: safe to run if columns already exist (e.g. after manual fix).
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

-- Fix NULLs (e.g. if column was added by Hibernate ddl-auto without DEFAULT)
UPDATE expenses SET status = 'APPROVED' WHERE status IS NULL OR status = '';

-- If column exists but is nullable, set NOT NULL (handles Hibernate-added column)
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
COMMENT ON COLUMN expenses.status IS 'PENDING_APPROVAL until admin approves; only APPROVED count in reports';
