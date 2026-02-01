-- Migration: Create sales tables
-- Version: V4
-- Description: Creates the sales, customers, and related tables for point-of-sale functionality

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_number VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    date_of_birth DATE,
    address TEXT,
    insurance_provider VARCHAR(255),
    insurance_number VARCHAR(255),
    tenant_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT fk_customers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT chk_customer_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_customer_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$')
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number VARCHAR(100) NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    customer_id UUID,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2),
    discount_amount DECIMAL(15,2),
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    notes TEXT,
    cashier_id UUID NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT fk_sales_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_cashier FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_sale_status CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED', 'SUSPENDED', 'REFUNDED')),
    CONSTRAINT chk_sale_amounts CHECK (subtotal >= 0 AND total_amount >= 0),
    CONSTRAINT chk_sale_tax_discount CHECK (
        (tax_amount IS NULL OR tax_amount >= 0) AND 
        (discount_amount IS NULL OR discount_amount >= 0)
    )
);

-- Create sale_line_items table
CREATE TABLE IF NOT EXISTS sale_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL,
    product_id UUID NOT NULL,
    inventory_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2),
    discount_amount DECIMAL(10,2),
    tax_percentage DECIMAL(5,2),
    tax_amount DECIMAL(10,2),
    line_total DECIMAL(10,2) NOT NULL,
    batch_number VARCHAR(255),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_line_items_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    CONSTRAINT fk_line_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_line_items_inventory FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE RESTRICT,
    CONSTRAINT chk_line_item_quantity CHECK (quantity > 0),
    CONSTRAINT chk_line_item_prices CHECK (unit_price >= 0 AND line_total >= 0),
    CONSTRAINT chk_line_item_discounts CHECK (
        (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100)) AND
        (discount_amount IS NULL OR discount_amount >= 0)
    ),
    CONSTRAINT chk_line_item_tax CHECK (
        (tax_percentage IS NULL OR (tax_percentage >= 0 AND tax_percentage <= 100)) AND
        (tax_amount IS NULL OR tax_amount >= 0)
    )
);

-- Create sale_payments table
CREATE TABLE IF NOT EXISTS sale_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    reference_number VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_payments_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_method CHECK (payment_method IN ('CASH', 'MPESA', 'CARD', 'INSURANCE', 'CREDIT', 'CHEQUE')),
    CONSTRAINT chk_payment_amount CHECK (amount > 0)
);

-- Create sale_returns table
CREATE TABLE IF NOT EXISTS sale_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number VARCHAR(100) NOT NULL UNIQUE,
    sale_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    return_reason VARCHAR(500) NOT NULL,
    total_refund_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    processed_by UUID NOT NULL,
    return_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT fk_returns_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
    CONSTRAINT fk_returns_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_returns_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_returns_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_return_status CHECK (status IN ('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED')),
    CONSTRAINT chk_return_amount CHECK (total_refund_amount >= 0)
);

-- Create sale_return_line_items table
CREATE TABLE IF NOT EXISTS sale_return_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_return_id UUID NOT NULL,
    original_sale_line_item_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity_returned INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    refund_amount DECIMAL(10,2) NOT NULL,
    restore_to_inventory BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_return_line_items_return FOREIGN KEY (sale_return_id) REFERENCES sale_returns(id) ON DELETE CASCADE,
    CONSTRAINT fk_return_line_items_original FOREIGN KEY (original_sale_line_item_id) REFERENCES sale_line_items(id) ON DELETE RESTRICT,
    CONSTRAINT fk_return_line_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT chk_return_line_item_quantity CHECK (quantity_returned > 0),
    CONSTRAINT chk_return_line_item_prices CHECK (unit_price >= 0 AND refund_amount >= 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_customer_number ON customers(customer_number);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

CREATE INDEX IF NOT EXISTS idx_line_items_sale_id ON sale_line_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_line_items_product_id ON sale_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_line_items_inventory_id ON sale_line_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_line_items_batch_number ON sale_line_items(batch_number);
CREATE INDEX IF NOT EXISTS idx_line_items_expiry_date ON sale_line_items(expiry_date);

CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON sale_payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON sale_payments(created_at);

CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON sale_returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_tenant_id ON sale_returns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_returns_branch_id ON sale_returns(branch_id);
CREATE INDEX IF NOT EXISTS idx_returns_processed_by ON sale_returns(processed_by);
CREATE INDEX IF NOT EXISTS idx_returns_return_number ON sale_returns(return_number);
CREATE INDEX IF NOT EXISTS idx_returns_status ON sale_returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_return_date ON sale_returns(return_date);

CREATE INDEX IF NOT EXISTS idx_return_line_items_return_id ON sale_return_line_items(sale_return_id);
CREATE INDEX IF NOT EXISTS idx_return_line_items_original_id ON sale_return_line_items(original_sale_line_item_id);
CREATE INDEX IF NOT EXISTS idx_return_line_items_product_id ON sale_return_line_items(product_id);

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_customer_number ON customers(tenant_id, customer_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_email ON customers(tenant_id, LOWER(email)) WHERE email IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE customers IS 'Stores customer information for sales tracking and loyalty programs';
COMMENT ON COLUMN customers.id IS 'Unique identifier for the customer';
COMMENT ON COLUMN customers.customer_number IS 'Unique customer number within the tenant';
COMMENT ON COLUMN customers.first_name IS 'Customer first name';
COMMENT ON COLUMN customers.last_name IS 'Customer last name';
COMMENT ON COLUMN customers.phone IS 'Customer phone number';
COMMENT ON COLUMN customers.email IS 'Customer email address';
COMMENT ON COLUMN customers.date_of_birth IS 'Customer date of birth';
COMMENT ON COLUMN customers.address IS 'Customer physical address';
COMMENT ON COLUMN customers.insurance_provider IS 'Customer insurance provider';
COMMENT ON COLUMN customers.insurance_number IS 'Customer insurance policy number';
COMMENT ON COLUMN customers.tenant_id IS 'Reference to the tenant this customer belongs to';
COMMENT ON COLUMN customers.is_active IS 'Whether the customer account is active';
COMMENT ON COLUMN customers.created_at IS 'Timestamp when the customer was created';
COMMENT ON COLUMN customers.updated_at IS 'Timestamp when the customer was last updated';

COMMENT ON TABLE sales IS 'Stores point-of-sale transaction information';
COMMENT ON COLUMN sales.id IS 'Unique identifier for the sale';
COMMENT ON COLUMN sales.sale_number IS 'Unique sale number for the transaction';
COMMENT ON COLUMN sales.tenant_id IS 'Reference to the tenant this sale belongs to';
COMMENT ON COLUMN sales.branch_id IS 'Reference to the branch where the sale occurred';
COMMENT ON COLUMN sales.customer_id IS 'Reference to the customer (if registered)';
COMMENT ON COLUMN sales.customer_name IS 'Customer name for walk-in transactions';
COMMENT ON COLUMN sales.customer_phone IS 'Customer phone for walk-in transactions';
COMMENT ON COLUMN sales.subtotal IS 'Subtotal amount before tax and discount';
COMMENT ON COLUMN sales.tax_amount IS 'Total tax amount applied to the sale';
COMMENT ON COLUMN sales.discount_amount IS 'Total discount amount applied to the sale';
COMMENT ON COLUMN sales.total_amount IS 'Final total amount for the sale';
COMMENT ON COLUMN sales.status IS 'Current status of the sale transaction';
COMMENT ON COLUMN sales.notes IS 'Additional notes for the sale';
COMMENT ON COLUMN sales.cashier_id IS 'Reference to the user who processed the sale';
COMMENT ON COLUMN sales.sale_date IS 'Date and time when the sale occurred';
COMMENT ON COLUMN sales.created_at IS 'Timestamp when the sale was created';
COMMENT ON COLUMN sales.updated_at IS 'Timestamp when the sale was last updated';

COMMENT ON TABLE sale_line_items IS 'Stores individual products sold in a transaction';
COMMENT ON COLUMN sale_line_items.id IS 'Unique identifier for the line item';
COMMENT ON COLUMN sale_line_items.sale_id IS 'Reference to the parent sale';
COMMENT ON COLUMN sale_line_items.product_id IS 'Reference to the product sold';
COMMENT ON COLUMN sale_line_items.inventory_id IS 'Reference to the specific inventory batch';
COMMENT ON COLUMN sale_line_items.quantity IS 'Quantity of the product sold';
COMMENT ON COLUMN sale_line_items.unit_price IS 'Unit price of the product';
COMMENT ON COLUMN sale_line_items.discount_percentage IS 'Discount percentage applied to this line item';
COMMENT ON COLUMN sale_line_items.discount_amount IS 'Discount amount applied to this line item';
COMMENT ON COLUMN sale_line_items.tax_percentage IS 'Tax percentage applied to this line item';
COMMENT ON COLUMN sale_line_items.tax_amount IS 'Tax amount applied to this line item';
COMMENT ON COLUMN sale_line_items.line_total IS 'Total amount for this line item';
COMMENT ON COLUMN sale_line_items.batch_number IS 'Batch number of the sold product';
COMMENT ON COLUMN sale_line_items.expiry_date IS 'Expiry date of the sold product';
COMMENT ON COLUMN sale_line_items.notes IS 'Additional notes for this line item';

COMMENT ON TABLE sale_payments IS 'Stores payment information for sales transactions';
COMMENT ON COLUMN sale_payments.id IS 'Unique identifier for the payment';
COMMENT ON COLUMN sale_payments.sale_id IS 'Reference to the parent sale';
COMMENT ON COLUMN sale_payments.payment_method IS 'Method of payment used';
COMMENT ON COLUMN sale_payments.amount IS 'Amount paid using this method';
COMMENT ON COLUMN sale_payments.reference_number IS 'Reference number for the payment (e.g., transaction ID)';
COMMENT ON COLUMN sale_payments.notes IS 'Additional notes for the payment';

COMMENT ON TABLE sale_returns IS 'Stores return transaction information';
COMMENT ON COLUMN sale_returns.id IS 'Unique identifier for the return';
COMMENT ON COLUMN sale_returns.return_number IS 'Unique return number for the transaction';
COMMENT ON COLUMN sale_returns.sale_id IS 'Reference to the original sale being returned';
COMMENT ON COLUMN sale_returns.tenant_id IS 'Reference to the tenant this return belongs to';
COMMENT ON COLUMN sale_returns.branch_id IS 'Reference to the branch where the return occurred';
COMMENT ON COLUMN sale_returns.return_reason IS 'Reason for the return';
COMMENT ON COLUMN sale_returns.total_refund_amount IS 'Total amount to be refunded';
COMMENT ON COLUMN sale_returns.status IS 'Current status of the return';
COMMENT ON COLUMN sale_returns.notes IS 'Additional notes for the return';
COMMENT ON COLUMN sale_returns.processed_by IS 'Reference to the user who processed the return';
COMMENT ON COLUMN sale_returns.return_date IS 'Date and time when the return occurred';

COMMENT ON TABLE sale_return_line_items IS 'Stores individual items being returned';
COMMENT ON COLUMN sale_return_line_items.id IS 'Unique identifier for the return line item';
COMMENT ON COLUMN sale_return_line_items.sale_return_id IS 'Reference to the parent return';
COMMENT ON COLUMN sale_return_line_items.original_sale_line_item_id IS 'Reference to the original sale line item';
COMMENT ON COLUMN sale_return_line_items.product_id IS 'Reference to the product being returned';
COMMENT ON COLUMN sale_return_line_items.quantity_returned IS 'Quantity of the product being returned';
COMMENT ON COLUMN sale_return_line_items.unit_price IS 'Unit price of the returned product';
COMMENT ON COLUMN sale_return_line_items.refund_amount IS 'Amount to be refunded for this line item';
COMMENT ON COLUMN sale_return_line_items.restore_to_inventory IS 'Whether to restore the item to inventory';
COMMENT ON COLUMN sale_return_line_items.notes IS 'Additional notes for this return line item';

