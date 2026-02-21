-- One-time fix: if status column exists with NULLs (e.g. added by Hibernate ddl-auto), backfill and set NOT NULL.
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
