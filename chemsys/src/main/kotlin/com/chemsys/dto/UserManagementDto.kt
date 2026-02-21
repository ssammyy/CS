package com.chemsys.dto

import com.chemsys.entity.UserRole
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.OffsetDateTime
import java.util.*

data class CreateUserRequest(
    @field:NotBlank(message = "Username is required")
    @field:Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    val username: String,
    
    @field:NotBlank(message = "Password is required")
    @field:Size(min = 6, message = "Password must be at least 6 characters")
    val password: String,
    
    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Email must be valid")
    val email: String,
    
    val phone: String? = null,
    
    // Accept either core app role (USER/ADMIN/PLATFORM_ADMIN) or an RBAC role name (e.g., CASHIER)
    // Prefer 'userRole' if provided; otherwise interpret 'role' string.
    val role: String? = null,
    val userRole: UserRole? = null,
    val rbacRole: String? = null
)

/**
 * Request for an admin to set a new password for another user (e.g. when the user forgot their password).
 * The user will be required to change password on next login if mustChangePassword is true.
 */
data class AdminResetPasswordRequest(
    @field:NotBlank(message = "New password is required")
    @field:Size(min = 6, message = "New password must be at least 6 characters")
    val newPassword: String
)

/**
 * Update payload for user management. All fields are optional; only provided fields will be updated.
 */
data class UpdateUserRequest(
    val email: String? = null,
    val phone: String? = null,
    val role: UserRole? = null,
    val isActive: Boolean? = null
)

/** Assign or remove a named role (RBAC role) to/from a user. */
data class AssignRoleRequest(
    val roleName: String
)

data class UserManagementDto(
    val id: UUID,
    val username: String,
    val email: String,
    val phone: String? = null,
    val role: UserRole,
    val roles: List<String> = emptyList(),
    val tenantId: UUID,
    val tenantName: String,
    val isActive: Boolean,
    val branches: List<String> = emptyList(),
    val primaryBranch: String? = null,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime?
)

data class UserListResponse(
    val users: List<UserManagementDto>,
    val totalCount: Long
)

data class RoleListResponse(
    val roles: List<String>
)
