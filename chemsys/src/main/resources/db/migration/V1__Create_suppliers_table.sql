-- Migration: Create suppliers table
-- Version: V1
-- Description: Creates the suppliers table for supplier management functionality

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    physical_address TEXT,
    payment_terms VARCHAR(500),
    category VARCHAR(50) NOT NULL DEFAULT 'WHOLESALER',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    tax_identification_number VARCHAR(100),
    bank_account_details TEXT,
    credit_limit DECIMAL(15,2),
    notes TEXT,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT fk_suppliers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT chk_supplier_category CHECK (category IN ('WHOLESALER', 'MANUFACTURER', 'DISTRIBUTOR', 'IMPORTER', 'SPECIALTY')),
    CONSTRAINT chk_supplier_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLACKLISTED')),
    CONSTRAINT chk_supplier_credit_limit CHECK (credit_limit IS NULL OR credit_limit >= 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at);

-- Create unique constraint for supplier name within tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_tenant_name ON suppliers(tenant_id, LOWER(name));

-- Create unique constraint for supplier email within tenant (when email is provided)
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_tenant_email ON suppliers(tenant_id, LOWER(email)) WHERE email IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE suppliers IS 'Stores supplier information for procurement management';
COMMENT ON COLUMN suppliers.id IS 'Unique identifier for the supplier';
COMMENT ON COLUMN suppliers.name IS 'Name of the supplier company';
COMMENT ON COLUMN suppliers.contact_person IS 'Primary contact person at the supplier';
COMMENT ON COLUMN suppliers.phone IS 'Contact phone number';
COMMENT ON COLUMN suppliers.email IS 'Contact email address';
COMMENT ON COLUMN suppliers.physical_address IS 'Physical address of the supplier';
COMMENT ON COLUMN suppliers.payment_terms IS 'Payment terms and conditions';
COMMENT ON COLUMN suppliers.category IS 'Type of supplier (wholesaler, manufacturer, etc.)';
COMMENT ON COLUMN suppliers.status IS 'Current status of the supplier relationship';
COMMENT ON COLUMN suppliers.tax_identification_number IS 'Tax ID or VAT number';
COMMENT ON COLUMN suppliers.bank_account_details IS 'Bank account information for payments';
COMMENT ON COLUMN suppliers.credit_limit IS 'Maximum credit limit allowed for this supplier';
COMMENT ON COLUMN suppliers.notes IS 'Additional notes and comments';
COMMENT ON COLUMN suppliers.tenant_id IS 'Reference to the tenant this supplier belongs to';
COMMENT ON COLUMN suppliers.created_at IS 'Timestamp when the supplier was created';
COMMENT ON COLUMN suppliers.updated_at IS 'Timestamp when the supplier was last updated';


