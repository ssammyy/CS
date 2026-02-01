package com.chemsys.dto

import java.time.OffsetDateTime
import java.util.*

/**
 * DTO for setting a user's branch preference
 */
data class SetBranchPreferenceRequest(
    val branchId: UUID,
    val isPreferred: Boolean = false
)

/**
 * DTO for user branch preference response
 */
data class UserBranchPreferenceResponse(
    val id: UUID,
    val branchId: UUID,
    val branchName: String,
    val isPreferred: Boolean,
    val lastSelectedAt: OffsetDateTime,
    val createdAt: OffsetDateTime
)

/**
 * DTO for getting user's current branch context
 */
data class UserBranchContextResponse(
    val currentBranchId: UUID?,
    val currentBranchName: String?,
    val preferredBranchId: UUID?,
    val preferredBranchName: String?,
    val lastSelectedBranchId: UUID?,
    val lastSelectedBranchName: String?,
    val availableBranches: List<BranchDto>
)

/**
 * DTO for updating user's last selected branch
 */
data class UpdateLastSelectedBranchRequest(
    val branchId: UUID
)
