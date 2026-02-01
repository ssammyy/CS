-- V12__Recreate_credit_tables.sql

-- Drop existing credit tables that don't match our new structure
DROP TABLE IF EXISTS credit_payments CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS customer_credit_accounts CASCADE;

-- Create credit_accounts table
CREATE TABLE IF NOT EXISTS credit_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_number VARCHAR(100) NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    sale_id UUID NOT NULL UNIQUE,
    total_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(15,2) NOT NULL,
    expected_payment_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_credit_accounts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_credit_accounts_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_credit_accounts_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_credit_accounts_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    CONSTRAINT fk_credit_accounts_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_credit_status CHECK (status IN ('ACTIVE', 'PAID', 'OVERDUE', 'CLOSED', 'SUSPENDED')),
    CONSTRAINT chk_credit_amounts CHECK (total_amount >= 0 AND paid_amount >= 0 AND remaining_amount >= 0)
);

-- Create credit_payments table
CREATE TABLE IF NOT EXISTS credit_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_account_id UUID NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(255),
    notes TEXT,
    received_by UUID NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_credit_payments_credit_account FOREIGN KEY (credit_account_id) REFERENCES credit_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_credit_payments_received_by FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_payment_amount CHECK (amount > 0),
    CONSTRAINT chk_payment_method CHECK (payment_method IN ('CASH', 'MPESA', 'CARD', 'CHEQUE', 'BANK_TRANSFER', 'CREDIT'))
);

-- Add indexes for performance
CREATE INDEX idx_credit_accounts_tenant_branch_customer ON credit_accounts (tenant_id, branch_id, customer_id);
CREATE INDEX idx_credit_accounts_status ON credit_accounts (status);
CREATE INDEX idx_credit_accounts_expected_payment_date ON credit_accounts (expected_payment_date);
CREATE INDEX idx_credit_payments_credit_account ON credit_payments (credit_account_id);
CREATE INDEX idx_credit_payments_payment_date ON credit_payments (payment_date);

-- Add comments for documentation
COMMENT ON TABLE credit_accounts IS 'Tracks credit accounts for customers who purchase items on credit';
COMMENT ON TABLE credit_payments IS 'Records installment payments made against credit accounts';

