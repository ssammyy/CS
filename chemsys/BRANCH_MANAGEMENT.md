# Branch Management System

## Overview

The Pharmacy POS system now supports multi-tenancy with multiple branches per tenant. Each branch operates independently for inventory, sales, and reporting, while maintaining centralized access for tenant administrators.

## Architecture

### Entities

#### Branch
- **id**: Unique identifier
- **name**: Branch name (unique within tenant)
- **location**: Physical location description
- **contactPhone**: Contact phone number
- **contactEmail**: Contact email address
- **address**: Full address
- **isActive**: Whether the branch is active
- **tenant**: Associated tenant
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

#### UserBranch
- **id**: Unique identifier
- **user**: Associated user
- **branch**: Associated branch
- **isPrimary**: Whether this is the user's primary branch
- **assignedAt**: Assignment timestamp
- **assignedBy**: User who made the assignment

### Key Features

1. **Multi-Branch Support**: Each tenant can have multiple branches
2. **User Assignment**: Users can be assigned to multiple branches
3. **Primary Branch**: Users can have one primary branch
4. **Branch Isolation**: Data is properly isolated between branches
5. **Tenant-Wide Access**: Admins can manage all branches within their tenant

## API Endpoints

### Branch Management

#### Create Branch
```
POST /api/branches
Content-Type: application/json

{
  "name": "Downtown Branch",
  "location": "123 Main St, Downtown",
  "contactPhone": "555-0123",
  "contactEmail": "downtown@pharmacy.com",
  "address": "123 Main Street, Downtown, City, State 12345"
}
```

#### Get All Branches
```
GET /api/branches
Authorization: Bearer <token>
```

#### Get Branch by ID
```
GET /api/branches/{id}
Authorization: Bearer <token>
```

#### Update Branch
```
PUT /api/branches/{id}
Content-Type: application/json

{
  "name": "Updated Branch Name",
  "location": "Updated Location",
  "isActive": true
}
```

#### Delete Branch
```
DELETE /api/branches/{id}
Authorization: Bearer <token>
```

### User-Branch Assignment

#### Assign User to Branch
```
POST /api/branches/assign-user
Content-Type: application/json

{
  "userId": "uuid",
  "branchId": "uuid",
  "isPrimary": true
}
```

#### Remove User from Branch
```
DELETE /api/branches/remove-user
Content-Type: application/json

{
  "userId": "uuid",
  "branchId": "uuid"
}
```

#### Get Branch Users
```
GET /api/branches/{branchId}/users
Authorization: Bearer <token>
```

#### Get User Branches
```
GET /api/branches/users/{userId}
Authorization: Bearer <token>
```

## Security & Access Control

### Roles and Permissions

- **ADMIN**: Full access to all branches within their tenant
- **PLATFORM_ADMIN**: Full access to all tenants and branches
- **MANAGER**: Access limited to their assigned branches
- **CASHIER**: Access limited to their assigned branches

### Branch-Level Access Control

Users can only access data for branches they are assigned to. The system automatically filters data based on user-branch assignments.

## Database Schema

### Tables

1. **branches**: Stores branch information
2. **user_branches**: Manages user-branch relationships
3. **permissions**: New branch management permissions

### Key Constraints

- Branch names must be unique within a tenant
- Users cannot be assigned to the same branch multiple times
- A user can have only one primary branch
- Branches with assigned users cannot be deleted

## Usage Examples

### Creating a New Branch

```kotlin
val request = CreateBranchRequest(
    name = "North Branch",
    location = "456 North Ave",
    contactPhone = "555-0456",
    contactEmail = "north@pharmacy.com"
)

val branch = branchService.createBranch(request)
```

### Assigning a User to a Branch

```kotlin
val request = AssignUserToBranchRequest(
    userId = user.id!!,
    branchId = branch.id!!,
    isPrimary = true
)

val assignment = branchService.assignUserToBranch(request)
```

### Getting All Branches for a Tenant

```kotlin
val branches = branchService.getAllBranches()
```

## Future Enhancements

1. **Branch-Specific Settings**: Custom configurations per branch
2. **Branch Performance Metrics**: Individual branch analytics
3. **Branch Transfer**: Move users between branches
4. **Branch Templates**: Pre-configured branch setups
5. **Geolocation**: Branch location coordinates for mapping

## Testing

Run the test suite to verify branch management functionality:

```bash
./gradlew test --tests "com.chemsys.service.BranchServiceTest"
```

## Migration

The system includes a database migration (V7__Create_branches_table.sql) that:

1. Creates the branches table
2. Creates the user_branches table
3. Adds necessary indexes
4. Creates branch management permissions
5. Assigns permissions to appropriate roles

Run the migration to set up the database schema:

```bash
./gradlew flywayMigrate
```
