-- Migration: Fix purchase order po_number column type
-- Version: V3
-- Description: Fixes the po_number column type from bytea to VARCHAR to resolve type mismatch issues

-- Check if the column exists and is of the wrong type
DO $$
BEGIN
    -- Check if po_number column exists and is of type bytea
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'po_number' 
        AND data_type = 'bytea'
    ) THEN
        -- Convert bytea column to VARCHAR
        ALTER TABLE purchase_orders 
        ALTER COLUMN po_number TYPE VARCHAR(100) USING po_number::text;
        
        RAISE NOTICE 'Converted po_number column from bytea to VARCHAR(100)';
    ELSE
        RAISE NOTICE 'po_number column is already VARCHAR or does not exist';
    END IF;
END $$;

-- Ensure the column has the correct constraints
ALTER TABLE purchase_orders 
ALTER COLUMN po_number SET NOT NULL;

-- Recreate the unique index if it doesn't exist
DROP INDEX IF EXISTS idx_purchase_orders_tenant_po_number;
CREATE UNIQUE INDEX idx_purchase_orders_tenant_po_number ON purchase_orders(tenant_id, po_number);

-- Add comment for documentation
COMMENT ON COLUMN purchase_orders.po_number IS 'Purchase order number - unique within tenant';

