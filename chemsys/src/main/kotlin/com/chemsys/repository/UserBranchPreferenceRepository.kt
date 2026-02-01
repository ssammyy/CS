package com.chemsys.repository

import com.chemsys.entity.UserBranchPreference
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

/**
 * Repository for managing user branch preferences.
 * Provides methods to store and retrieve user's branch selection context.
 */
@Repository
interface UserBranchPreferenceRepository : JpaRepository<UserBranchPreference, UUID> {
    
    /**
     * Find the user's preferred branch for a specific tenant
     */
    @Query("SELECT ubp FROM UserBranchPreference ubp " +
           "WHERE ubp.user.id = :userId " +
           "AND ubp.tenant.id = :tenantId " +
           "AND ubp.isPreferred = true")
    fun findPreferredBranchByUserAndTenant(
        @Param("userId") userId: UUID,
        @Param("tenantId") tenantId: UUID
    ): Optional<UserBranchPreference>
    
    /**
     * Find the user's last selected branch for a specific tenant
     */
    @Query("SELECT ubp FROM UserBranchPreference ubp " +
           "WHERE ubp.user.id = :userId " +
           "AND ubp.tenant.id = :tenantId " +
           "ORDER BY ubp.lastSelectedAt DESC")
    fun findLastSelectedBranchByUserAndTenant(
        @Param("userId") userId: UUID,
        @Param("tenantId") tenantId: UUID
    ): List<UserBranchPreference>
    
    /**
     * Find all branch preferences for a user in a specific tenant
     */
    @Query("SELECT ubp FROM UserBranchPreference ubp " +
           "WHERE ubp.user.id = :userId " +
           "AND ubp.tenant.id = :tenantId")
    fun findAllByUserAndTenant(
        @Param("userId") userId: UUID,
        @Param("tenantId") tenantId: UUID
    ): List<UserBranchPreference>
    
    /**
     * Check if a user has a preference for a specific branch
     */
    fun existsByUserIdAndBranchIdAndTenantId(
        userId: UUID,
        branchId: UUID,
        tenantId: UUID
    ): Boolean
    
    /**
     * Delete all preferences for a user in a specific tenant
     */
    fun deleteByUserIdAndTenantId(userId: UUID, tenantId: UUID)
}
