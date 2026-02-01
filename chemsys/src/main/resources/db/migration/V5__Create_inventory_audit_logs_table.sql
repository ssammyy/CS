-- Migration: Create inventory audit logs table
-- Version: V5
-- Description: Creates the inventory_audit_logs table for tracking all inventory mutations

-- Create inventory_audit_logs table
CREATE TABLE IF NOT EXISTS inventory_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    quantity_changed INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    batch_number VARCHAR(255),
    expiry_date DATE,
    source_reference VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    performed_by UUID NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    is_duplicate BOOLEAN NOT NULL DEFAULT false,
    duplicate_reference VARCHAR(255),
    
    -- Constraints
    CONSTRAINT fk_audit_logs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_audit_logs_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_audit_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_logs_performed_by FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_audit_log_transaction_type CHECK (transaction_type IN (
        'PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 
        'RETURN', 'EXPIRY_WRITE_OFF', 'DAMAGE_WRITE_OFF', 'INITIAL_STOCK'
    )),
    CONSTRAINT chk_audit_log_source_type CHECK (source_type IN (
        'SALE', 'PURCHASE_ORDER', 'GOODS_RECEIVED_NOTE', 'INVENTORY_ADJUSTMENT',
        'INVENTORY_TRANSFER', 'RETURN', 'EXPIRY_WRITE_OFF', 'DAMAGE_WRITE_OFF',
        'INITIAL_STOCK', 'SYSTEM_ADJUSTMENT'
    )),
    CONSTRAINT chk_audit_log_quantity_consistency CHECK (quantity_after = quantity_before + quantity_changed),
    CONSTRAINT chk_audit_log_quantity_changed CHECK (quantity_changed != 0),
    CONSTRAINT chk_audit_log_prices CHECK (
        (unit_cost IS NULL OR unit_cost >= 0) AND 
        (selling_price IS NULL OR selling_price >= 0)
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_product_id ON inventory_audit_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_id ON inventory_audit_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON inventory_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON inventory_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_transaction_type ON inventory_audit_logs(transaction_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_source_type ON inventory_audit_logs(source_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_source_reference ON inventory_audit_logs(source_reference);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_at ON inventory_audit_logs(performed_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_batch_number ON inventory_audit_logs(batch_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_expiry_date ON inventory_audit_logs(expiry_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_is_duplicate ON inventory_audit_logs(is_duplicate);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_product_branch ON inventory_audit_logs(product_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_performed_at ON inventory_audit_logs(tenant_id, performed_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_source_reference_type ON inventory_audit_logs(source_reference, source_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_transaction_performed_at ON inventory_audit_logs(transaction_type, performed_at);

-- Create unique constraint to prevent duplicate audit logs for the same transaction
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_unique_transaction ON inventory_audit_logs(
    product_id, branch_id, source_reference, source_type, performed_at
) WHERE is_duplicate = false;

-- Add comments for documentation
COMMENT ON TABLE inventory_audit_logs IS 'Audit trail for all inventory mutations to ensure data consistency and compliance';
COMMENT ON COLUMN inventory_audit_logs.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN inventory_audit_logs.product_id IS 'Reference to the product that was modified';
COMMENT ON COLUMN inventory_audit_logs.branch_id IS 'Reference to the branch where the inventory change occurred';
COMMENT ON COLUMN inventory_audit_logs.tenant_id IS 'Reference to the tenant this audit log belongs to';
COMMENT ON COLUMN inventory_audit_logs.transaction_type IS 'Type of inventory transaction (SALE, PURCHASE, etc.)';
COMMENT ON COLUMN inventory_audit_logs.quantity_changed IS 'Amount of quantity change (positive for increase, negative for decrease)';
COMMENT ON COLUMN inventory_audit_logs.quantity_before IS 'Quantity before the transaction';
COMMENT ON COLUMN inventory_audit_logs.quantity_after IS 'Quantity after the transaction';
COMMENT ON COLUMN inventory_audit_logs.unit_cost IS 'Unit cost of the product at the time of transaction';
COMMENT ON COLUMN inventory_audit_logs.selling_price IS 'Selling price of the product at the time of transaction';
COMMENT ON COLUMN inventory_audit_logs.batch_number IS 'Batch number of the product (if applicable)';
COMMENT ON COLUMN inventory_audit_logs.expiry_date IS 'Expiry date of the product (if applicable)';
COMMENT ON COLUMN inventory_audit_logs.source_reference IS 'Reference to the source transaction (e.g., sale number, PO number)';
COMMENT ON COLUMN inventory_audit_logs.source_type IS 'Type of source transaction (SALE, PURCHASE_ORDER, etc.)';
COMMENT ON COLUMN inventory_audit_logs.performed_by IS 'Reference to the user who performed the transaction';
COMMENT ON COLUMN inventory_audit_logs.performed_at IS 'Timestamp when the transaction was performed';
COMMENT ON COLUMN inventory_audit_logs.notes IS 'Additional notes or comments about the transaction';
COMMENT ON COLUMN inventory_audit_logs.is_duplicate IS 'Flag indicating if this is a duplicate audit log entry';
COMMENT ON COLUMN inventory_audit_logs.duplicate_reference IS 'Reference to the original audit log entry if this is a duplicate';

