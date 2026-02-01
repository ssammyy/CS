-- Create M-Pesa Configuration table
CREATE TABLE IF NOT EXISTS mpesa_configurations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    tier_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    default_till_number VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create Branch M-Pesa Till Numbers table
CREATE TABLE IF NOT EXISTS branch_mpesa_tills (
    id UUID PRIMARY KEY,
    mpesa_config_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    till_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(mpesa_config_id, branch_id),
    FOREIGN KEY (mpesa_config_id) REFERENCES mpesa_configurations(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- Create M-Pesa Transactions table
CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id UUID PRIMARY KEY,
    sale_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    till_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    checkout_request_id VARCHAR(255),
    mpesa_receipt_number VARCHAR(100),
    error_code VARCHAR(50),
    error_message TEXT,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    callback_received BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mpesa_config_tenant ON mpesa_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branch_till_config ON branch_mpesa_tills(mpesa_config_id);
CREATE INDEX IF NOT EXISTS idx_branch_till_branch ON branch_mpesa_tills(branch_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transaction_sale ON mpesa_transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transaction_tenant ON mpesa_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transaction_status ON mpesa_transactions(status);
CREATE INDEX IF NOT EXISTS idx_mpesa_transaction_checkout ON mpesa_transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transaction_requested ON mpesa_transactions(requested_at DESC);
