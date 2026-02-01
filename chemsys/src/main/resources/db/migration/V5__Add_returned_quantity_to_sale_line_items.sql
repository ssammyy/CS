
-- Add returned_quantity column to sale_line_items table
-- This column tracks how much of each line item has been returned

ALTER TABLE sale_line_items 
ADD COLUMN returned_quantity INTEGER NOT NULL DEFAULT 0;

-- Add a check constraint to ensure returned_quantity is not negative
ALTER TABLE sale_line_items 
ADD CONSTRAINT chk_returned_quantity_non_negative 
CHECK (returned_quantity >= 0);

-- Add a check constraint to ensure returned_quantity doesn't exceed quantity
ALTER TABLE sale_line_items 
ADD CONSTRAINT chk_returned_quantity_not_exceed_quantity 
CHECK (returned_quantity <= quantity);

-- Create an index on returned_quantity for reporting queries
CREATE INDEX idx_sale_line_items_returned_quantity 
ON sale_line_items(returned_quantity);

-- Create a composite index for reporting queries that filter by product and returned quantity
CREATE INDEX idx_sale_line_items_product_returned_quantity 
ON sale_line_items(product_id, returned_quantity);

-- Update existing records to have returned_quantity = 0 (already handled by DEFAULT 0)
-- This is just for documentation purposes
UPDATE sale_line_items 
SET returned_quantity = 0 
WHERE returned_quantity IS NULL;
