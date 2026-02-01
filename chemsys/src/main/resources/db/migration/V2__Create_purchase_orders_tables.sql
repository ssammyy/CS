-- Migration: Create purchase orders tables
-- Version: V2
-- Description: Creates the purchase orders, line items, and history tables for procurement management

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    supplier_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2),
    discount_amount DECIMAL(15,2),
    grand_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    payment_terms VARCHAR(500),
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    notes TEXT,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT fk_purchase_orders_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_purchase_orders_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_purchase_orders_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT chk_purchase_order_status CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DELIVERED', 'CLOSED', 'CANCELLED')),
    CONSTRAINT chk_purchase_order_amounts CHECK (total_amount >= 0 AND grand_total >= 0),
    CONSTRAINT chk_purchase_order_dates CHECK (actual_delivery_date IS NULL OR actual_delivery_date >= expected_delivery_date)
);

-- Create purchase_order_line_items table
CREATE TABLE IF NOT EXISTS purchase_order_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    received_quantity INTEGER NOT NULL DEFAULT 0,
    expected_delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT fk_line_items_purchase_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_line_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT chk_line_item_quantities CHECK (quantity > 0 AND received_quantity >= 0 AND received_quantity <= quantity),
    CONSTRAINT chk_line_item_prices CHECK (unit_price >= 0 AND total_price >= 0)
);

-- Create purchase_order_history table
CREATE TABLE IF NOT EXISTS purchase_order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT fk_history_purchase_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    CONSTRAINT chk_history_statuses CHECK (
        (previous_status IS NULL OR previous_status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DELIVERED', 'CLOSED', 'CANCELLED')) AND
        new_status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DELIVERED', 'CLOSED', 'CANCELLED')
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_id ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch_id ON purchase_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected_delivery ON purchase_orders(expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON purchase_orders(created_by);

CREATE INDEX IF NOT EXISTS idx_line_items_purchase_order_id ON purchase_order_line_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_line_items_product_id ON purchase_order_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_line_items_expected_delivery ON purchase_order_line_items(expected_delivery_date);

CREATE INDEX IF NOT EXISTS idx_history_purchase_order_id ON purchase_order_history(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_history_performed_at ON purchase_order_history(performed_at);
CREATE INDEX IF NOT EXISTS idx_history_performed_by ON purchase_order_history(performed_by);

-- Create unique constraint for PO number within tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_tenant_po_number ON purchase_orders(tenant_id, po_number);

-- Add comments for documentation
COMMENT ON TABLE purchase_orders IS 'Stores purchase order information for procurement management';
COMMENT ON COLUMN purchase_orders.id IS 'Unique identifier for the purchase order';
COMMENT ON COLUMN purchase_orders.po_number IS 'Unique purchase order number within the tenant';
COMMENT ON COLUMN purchase_orders.title IS 'Title or summary of the purchase order';
COMMENT ON COLUMN purchase_orders.description IS 'Detailed description of the purchase order';
COMMENT ON COLUMN purchase_orders.supplier_id IS 'Reference to the supplier for this order';
COMMENT ON COLUMN purchase_orders.tenant_id IS 'Reference to the tenant this order belongs to';
COMMENT ON COLUMN purchase_orders.status IS 'Current status of the purchase order workflow';
COMMENT ON COLUMN purchase_orders.total_amount IS 'Subtotal amount before tax and discounts';
COMMENT ON COLUMN purchase_orders.tax_amount IS 'Tax amount applied to the order';
COMMENT ON COLUMN purchase_orders.discount_amount IS 'Discount amount applied to the order';
COMMENT ON COLUMN purchase_orders.grand_total IS 'Final total amount including tax and discounts';
COMMENT ON COLUMN purchase_orders.payment_terms IS 'Payment terms and conditions';
COMMENT ON COLUMN purchase_orders.expected_delivery_date IS 'Expected date of delivery';
COMMENT ON COLUMN purchase_orders.actual_delivery_date IS 'Actual date when goods were delivered';
COMMENT ON COLUMN purchase_orders.notes IS 'Additional notes and comments';
COMMENT ON COLUMN purchase_orders.approved_by IS 'User who approved the purchase order';
COMMENT ON COLUMN purchase_orders.approved_at IS 'Timestamp when the order was approved';
COMMENT ON COLUMN purchase_orders.created_by IS 'User who created the purchase order';
COMMENT ON COLUMN purchase_orders.created_at IS 'Timestamp when the order was created';
COMMENT ON COLUMN purchase_orders.updated_at IS 'Timestamp when the order was last updated';

COMMENT ON TABLE purchase_order_line_items IS 'Stores individual product line items within purchase orders';
COMMENT ON COLUMN purchase_order_line_items.id IS 'Unique identifier for the line item';
COMMENT ON COLUMN purchase_order_line_items.purchase_order_id IS 'Reference to the parent purchase order';
COMMENT ON COLUMN purchase_order_line_items.product_id IS 'Reference to the product being ordered';
COMMENT ON COLUMN purchase_order_line_items.quantity IS 'Quantity of the product ordered';
COMMENT ON COLUMN purchase_order_line_items.unit_price IS 'Unit price of the product';
COMMENT ON COLUMN purchase_order_line_items.total_price IS 'Total price for this line item (quantity * unit price)';
COMMENT ON COLUMN purchase_order_line_items.received_quantity IS 'Quantity of the product actually received';
COMMENT ON COLUMN purchase_order_line_items.expected_delivery_date IS 'Expected delivery date for this specific line item';
COMMENT ON COLUMN purchase_order_line_items.notes IS 'Additional notes for this line item';
COMMENT ON COLUMN purchase_order_line_items.created_at IS 'Timestamp when the line item was created';
COMMENT ON COLUMN purchase_order_line_items.updated_at IS 'Timestamp when the line item was last updated';

COMMENT ON TABLE purchase_order_history IS 'Stores audit trail and history of all changes to purchase orders';
COMMENT ON COLUMN purchase_order_history.id IS 'Unique identifier for the history entry';
COMMENT ON COLUMN purchase_order_history.purchase_order_id IS 'Reference to the purchase order this history entry belongs to';
COMMENT ON COLUMN purchase_order_history.previous_status IS 'Previous status before the change';
COMMENT ON COLUMN purchase_order_history.new_status IS 'New status after the change';
COMMENT ON COLUMN purchase_order_history.action IS 'Description of the action performed';
COMMENT ON COLUMN purchase_order_history.description IS 'Additional details about the change';
COMMENT ON COLUMN purchase_order_history.performed_by IS 'User who performed the action';
COMMENT ON COLUMN purchase_order_history.performed_at IS 'Timestamp when the action was performed';
