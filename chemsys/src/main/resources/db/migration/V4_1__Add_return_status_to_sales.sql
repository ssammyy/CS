-- Add return_status column to sales table
-- This column tracks the return status of a sale (NONE, PARTIAL, FULL)

-- First, add the column with a default value
ALTER TABLE sales 
ADD COLUMN return_status VARCHAR(20) NOT NULL DEFAULT 'NONE';

-- Add a check constraint to ensure valid return status values
ALTER TABLE sales 
ADD CONSTRAINT chk_return_status_valid 
CHECK (return_status IN ('NONE', 'PARTIAL', 'FULL'));

-- Create an index on return_status for reporting queries
CREATE INDEX idx_sales_return_status 
ON sales(return_status);

-- Create a composite index for reporting queries that filter by branch and return status
CREATE INDEX idx_sales_branch_return_status 
ON sales(branch_id, return_status);

-- Update existing records to have return_status = 'NONE' (already handled by DEFAULT 'NONE')
-- This is just for documentation purposes
UPDATE sales 
SET return_status = 'NONE' 
WHERE return_status IS NULL;
