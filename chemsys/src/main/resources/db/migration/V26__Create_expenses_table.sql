-- Expenses module: track delivery, advertisements, rent, wifi, commissions paid, and miscellaneous costs.
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    expense_type VARCHAR(32) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_expenses_tenant_id ON expenses(tenant_id);
CREATE INDEX idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_expense_type ON expenses(expense_type);

COMMENT ON TABLE expenses IS 'Outgoing costs: delivery, advertisements, rent, wifi, commissions paid, miscellaneous';
COMMENT ON COLUMN expenses.expense_type IS 'One of: DELIVERY, ADVERTISEMENTS, RENT, WIFI, COMMISSIONS_PAID, MISCELLANEOUS';
