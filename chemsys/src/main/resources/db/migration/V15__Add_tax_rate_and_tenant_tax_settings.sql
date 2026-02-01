-- Add tax_rate column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2);

-- Create tenant_tax_settings table
CREATE TABLE IF NOT EXISTS tenant_tax_settings (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL UNIQUE,
    charge_vat BOOLEAN NOT NULL DEFAULT TRUE,
    default_vat_rate NUMERIC(5,2) NOT NULL DEFAULT 16.00,
    pricing_mode VARCHAR(50) NOT NULL DEFAULT 'EXCLUSIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create index for tenant_tax_settings
CREATE INDEX IF NOT EXISTS idx_tenant_tax_settings_tenant ON tenant_tax_settings(tenant_id);

-- Add constraint for pricing_mode
ALTER TABLE tenant_tax_settings ADD CONSTRAINT tenant_tax_settings_pricing_mode_check
    CHECK (pricing_mode IN ('INCLUSIVE', 'EXCLUSIVE'));

-- Insert default tax settings for existing tenants (if any)
INSERT INTO tenant_tax_settings (id, tenant_id, charge_vat, default_vat_rate, pricing_mode)
SELECT gen_random_uuid(), id, TRUE, 16.00, 'EXCLUSIVE'
FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM tenant_tax_settings ts WHERE ts.tenant_id = tenants.id)
ON CONFLICT DO NOTHING;
