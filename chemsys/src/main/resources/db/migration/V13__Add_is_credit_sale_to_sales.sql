-- Add is_credit_sale column to sales table
-- This column will store whether a sale is a credit sale for efficient querying

ALTER TABLE sales ADD COLUMN is_credit_sale BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing sales to set is_credit_sale based on their payments
UPDATE sales 
SET is_credit_sale = TRUE 
WHERE id IN (
    SELECT DISTINCT sp.sale_id 
    FROM sale_payments sp 
    WHERE sp.payment_method = 'CREDIT'
);

-- Add comment for documentation
COMMENT ON COLUMN sales.is_credit_sale IS 'Indicates whether this sale is a credit sale (has CREDIT payment method)';










