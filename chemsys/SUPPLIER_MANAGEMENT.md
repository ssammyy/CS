# Supplier Management Module

## Overview

The Supplier Management Module provides comprehensive functionality for managing suppliers in the ChemSys pharmaceutical inventory system. This module allows administrators to create, update, and manage supplier profiles with detailed information including contact details, payment terms, and categorization.

## Features

### Core Functionality
- **Supplier Profiles**: Store comprehensive supplier information including contact details, addresses, and payment terms
- **Categorization**: Classify suppliers by type (wholesaler, manufacturer, distributor, importer, specialty)
- **Status Management**: Track supplier status (active, inactive, suspended, blacklisted)
- **Multi-tenant Support**: Full tenant isolation ensuring data security
- **Search & Filtering**: Advanced search capabilities with pagination support

### Supplier Information Fields
- **Basic Details**: Name, contact person, phone, email
- **Address Information**: Physical address
- **Business Details**: Payment terms, tax identification number, bank account details
- **Financial Information**: Credit limit
- **Additional Notes**: Custom notes and comments

## Architecture

### Entity Layer
- **Supplier**: Core entity with JPA annotations and tenant relationships
- **SupplierCategory**: Enumeration for supplier types
- **SupplierStatus**: Enumeration for supplier statuses

### Data Transfer Objects (DTOs)
- **SupplierDto**: Complete supplier information for API responses
- **CreateSupplierRequest**: Request structure for creating suppliers
- **UpdateSupplierRequest**: Request structure for updating suppliers
- **SupplierListResponse**: Paginated list response with summary information
- **SupplierSearchResult**: Search results with metadata
- **SupplierSummaryDto**: Statistical summary information

### Repository Layer
- **SupplierRepository**: JPA repository with custom query methods
- **Tenant Isolation**: All queries automatically filter by current tenant
- **Performance Optimization**: Indexed queries for common search patterns

### Service Layer
- **SupplierService**: Business logic implementation
- **Transaction Management**: All operations are transactional
- **Validation**: Comprehensive input validation and business rule enforcement
- **Security**: Role-based access control with @PreAuthorize annotations

### Controller Layer
- **SupplierController**: RESTful API endpoints
- **HTTP Methods**: Full CRUD operations (POST, GET, PUT, DELETE, PATCH)
- **Response Handling**: Consistent HTTP response patterns

## API Endpoints

### Core CRUD Operations
```
POST   /api/suppliers                    - Create new supplier
GET    /api/suppliers                    - Get all suppliers with summary
GET    /api/suppliers/{id}               - Get supplier by ID
PUT    /api/suppliers/{id}               - Update supplier
DELETE /api/suppliers/{id}               - Delete supplier (soft delete)
```

### Search and Filtering
```
GET    /api/suppliers/search?query={q}   - Search suppliers by name/contact/email
GET    /api/suppliers/paginated          - Get suppliers with pagination and filters
GET    /api/suppliers/category/{cat}     - Get suppliers by category
GET    /api/suppliers/status/{status}    - Get suppliers by status
GET    /api/suppliers/active             - Get active suppliers only
```

### Status Management
```
PATCH  /api/suppliers/{id}/status       - Change supplier status
```

### Information and Statistics
```
GET    /api/suppliers/summary            - Get supplier statistics
GET    /api/suppliers/categories         - Get available categories
GET    /api/suppliers/statuses           - Get available statuses
```

## Database Schema

### Suppliers Table
```sql
CREATE TABLE suppliers (
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
    
    CONSTRAINT fk_suppliers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT chk_supplier_category CHECK (category IN ('WHOLESALER', 'MANUFACTURER', 'DISTRIBUTOR', 'IMPORTER', 'SPECIALTY')),
    CONSTRAINT chk_supplier_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLACKLISTED'))
);
```

### Indexes
- `idx_suppliers_tenant_id` - Tenant filtering performance
- `idx_suppliers_name` - Name search performance
- `idx_suppliers_category` - Category filtering performance
- `idx_suppliers_status` - Status filtering performance
- `idx_suppliers_email` - Email search performance
- `idx_suppliers_created_at` - Date-based queries performance

### Constraints
- Unique supplier name within tenant
- Unique supplier email within tenant (when provided)
- Valid category and status values
- Non-negative credit limit

## Security and Access Control

### Role Requirements
- **ADMIN/PLATFORM_ADMIN**: Full access to create, update, delete suppliers
- **USER**: Read-only access to view suppliers and search functionality

### Tenant Isolation
- All operations automatically filter by current tenant context
- No cross-tenant data access possible
- Tenant context validated on every operation

## Business Rules

### Validation Rules
1. **Name Uniqueness**: Supplier names must be unique within a tenant
2. **Email Uniqueness**: Email addresses must be unique within a tenant (when provided)
3. **Required Fields**: Name is required for all suppliers
4. **Status Transitions**: Status changes are logged and audited

### Data Consistency
- All operations are transactional
- Soft delete implementation (status change to BLACKLISTED)
- Audit trail through creation and update timestamps

## Usage Examples

### Creating a Supplier
```json
POST /api/suppliers
{
    "name": "ABC Pharmaceuticals",
    "contactPerson": "Jane Smith",
    "phone": "+1-555-0123",
    "email": "jane@abcpharma.com",
    "physicalAddress": "123 Pharma St, Medical City, MC 12345",
    "paymentTerms": "Net 45",
    "category": "MANUFACTURER",
    "status": "ACTIVE",
    "taxIdentificationNumber": "TAX123456789",
    "creditLimit": 50000.00,
    "notes": "Primary manufacturer for cardiovascular medications"
}
```

### Updating Supplier Status
```
PATCH /api/suppliers/{id}/status?status=SUSPENDED
```

### Searching Suppliers
```
GET /api/suppliers/search?query=pharma
GET /api/suppliers/category/MANUFACTURER
GET /api/suppliers/status/ACTIVE
```

## Testing

### Unit Tests
- **SupplierServiceTest**: Core business logic validation
- **Test Coverage**: CRUD operations, validation rules, error handling

### Integration Tests
- Database operations and constraint validation
- API endpoint functionality
- Security and authorization

## Future Enhancements

### Planned Features
1. **Supplier Performance Metrics**: Track delivery times, quality ratings
2. **Contract Management**: Store and manage supplier contracts
3. **Order History**: Link suppliers to purchase orders
4. **Communication Log**: Track all supplier communications
5. **Document Management**: Store supplier-related documents

### Integration Points
1. **Purchase Order System**: Link suppliers to procurement processes
2. **Inventory Management**: Track supplier-specific stock levels
3. **Financial System**: Integrate with accounts payable
4. **Reporting**: Advanced supplier analytics and reporting

## Migration and Deployment

### Database Migration
- Flyway migration script: `V1__Create_suppliers_table.sql`
- Automatic table creation with proper constraints and indexes
- Backward compatible with existing systems

### Configuration
- No additional configuration required
- Integrates with existing tenant and security infrastructure
- Uses standard Spring Boot and JPA configurations

## Support and Maintenance

### Monitoring
- Health check endpoints for supplier service
- Logging for all supplier operations
- Performance metrics for database queries

### Troubleshooting
- Common issues and solutions documented
- Error codes and messages standardized
- Debug logging for development environments


