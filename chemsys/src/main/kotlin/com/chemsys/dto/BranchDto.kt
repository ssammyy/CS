package com.chemsys.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Size
import java.time.OffsetDateTime
import java.util.*

data class CreateBranchRequest(
    @field:NotBlank(message = "Branch name is required")
    @field:Size(min = 2, max = 100, message = "Branch name must be between 2 and 100 characters")
    val name: String,
    
    @field:NotBlank(message = "Location is required")
    @field:Size(min = 5, max = 200, message = "Location must be between 5 and 200 characters")
    val location: String,
    
    val contactPhone: String? = null,
    
    @field:Email(message = "Contact email must be valid")
    val contactEmail: String? = null,
    
    val address: String? = null
)

data class UpdateBranchRequest(
    val name: String? = null,
    val location: String? = null,
    val contactPhone: String? = null,
    val contactEmail: String? = null,
    val address: String? = null,
    val isActive: Boolean? = null
)

data class BranchDto(
    val id: UUID,
    val name: String,
    val location: String,
    val contactPhone: String?,
    val contactEmail: String?,
    val address: String?,
    val isActive: Boolean,
    val tenantId: UUID,
    val tenantName: String,
    val userCount: Long,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime?
)

data class BranchListResponse(
    val branches: List<BranchDto>,
    val totalCount: Long
)

data class AssignUserToBranchRequest(
    val userId: UUID,
    val branchId: UUID,
    val isPrimary: Boolean = false
)

data class RemoveUserFromBranchRequest(
    val userId: UUID,
    val branchId: UUID
)

data class UpdateUserBranchPrimaryRequest(
    val userId: UUID,
    val branchId: UUID,
    val isPrimary: Boolean
)

data class UserBranchAssignmentDto(
    val userId: UUID,
    val username: String,
    val email: String,
    val branchId: UUID,
    val branchName: String,
    val isPrimary: Boolean,
    val assignedAt: OffsetDateTime
)
