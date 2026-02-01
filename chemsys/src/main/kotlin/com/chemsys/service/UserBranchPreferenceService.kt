package com.chemsys.service

import com.chemsys.dto.*
import com.chemsys.entity.*
import com.chemsys.repository.*
import com.chemsys.config.TenantContext
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.*

/**
 * Service for managing user branch preferences and context.
 * This service solves the frontend branch context persistence issue
 * by storing user's branch selection in the database.
 */
@Service
class UserBranchPreferenceService(
    private val userBranchPreferenceRepository: UserBranchPreferenceRepository,
    private val userRepository: UserRepository,
    private val branchRepository: BranchRepository,
    private val tenantRepository: TenantRepository
) {

    companion object {
        private val logger = LoggerFactory.getLogger(UserBranchPreferenceService::class.java)
    }
    
    /**
     * Set a user's branch preference
     */
    @Transactional
    fun setBranchPreference(userId: UUID, request: SetBranchPreferenceRequest): UserBranchPreferenceResponse {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val user = userRepository.findById(userId)
            .orElseThrow { RuntimeException("User not found") }
        
        val branch = branchRepository.findById(request.branchId)
            .orElseThrow { RuntimeException("Branch not found") }
        
        val tenant = tenantRepository.findById(currentTenantId)
            .orElseThrow { RuntimeException("Tenant not found") }
        
        // If setting as preferred, unset other preferred branches for this user
        if (request.isPreferred) {
            val existingPreferred = userBranchPreferenceRepository
                .findPreferredBranchByUserAndTenant(userId, currentTenantId)
            
            existingPreferred.ifPresent { existing ->
                val updated = existing.copy(isPreferred = false)
                userBranchPreferenceRepository.save(updated)
            }
        }
        
        // Check if preference already exists
        val existingPreference = userBranchPreferenceRepository
            .findAllByUserAndTenant(userId, currentTenantId)
            .find { it.branch.id == request.branchId }
        
        val preference = if (existingPreference != null) {
            // Update existing preference
            existingPreference.copy(
                isPreferred = request.isPreferred,
                lastSelectedAt = OffsetDateTime.now(),
                updatedAt = OffsetDateTime.now()
            )
        } else {
            // Create new preference
            UserBranchPreference(
                user = user,
                branch = branch,
                tenant = tenant,
                isPreferred = request.isPreferred,
                lastSelectedAt = OffsetDateTime.now()
            )
        }
        
        val savedPreference = userBranchPreferenceRepository.save(preference)
        
        return UserBranchPreferenceResponse(
            id = savedPreference.id!!,
            branchId = savedPreference.branch.id!!,
            branchName = savedPreference.branch.name,
            isPreferred = savedPreference.isPreferred,
            lastSelectedAt = savedPreference.lastSelectedAt,
            createdAt = savedPreference.createdAt
        )
    }
    
    /**
     * Update user's last selected branch (for tracking context)
     */
    @Transactional
    fun updateLastSelectedBranch(userId: UUID, request: UpdateLastSelectedBranchRequest): UserBranchPreferenceResponse {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val user = userRepository.findById(userId)
            .orElseThrow { RuntimeException("User not found") }
        
        val branch = branchRepository.findById(request.branchId)
            .orElseThrow { RuntimeException("Branch not found") }
        
        val tenant = tenantRepository.findById(currentTenantId)
            .orElseThrow { RuntimeException("Tenant not found") }
        
        // Check if preference already exists
        val existingPreference = userBranchPreferenceRepository
            .findAllByUserAndTenant(userId, currentTenantId)
            .find { it.branch.id == request.branchId }
        
        val preference = if (existingPreference != null) {
            // Update existing preference with new timestamp
            existingPreference.copy(
                lastSelectedAt = OffsetDateTime.now(),
                updatedAt = OffsetDateTime.now()
            )
        } else {
            // Create new preference (not preferred by default)
            UserBranchPreference(
                user = user,
                branch = branch,
                tenant = tenant,
                isPreferred = false,
                lastSelectedAt = OffsetDateTime.now()
            )
        }
        
        val savedPreference = userBranchPreferenceRepository.save(preference)
        
        return UserBranchPreferenceResponse(
            id = savedPreference.id!!,
            branchId = savedPreference.branch.id!!,
            branchName = savedPreference.branch.name,
            isPreferred = savedPreference.isPreferred,
            lastSelectedAt = savedPreference.lastSelectedAt,
            createdAt = savedPreference.createdAt
        )
    }
    
    /**
     * Get user's current branch context
     */
    @Transactional(readOnly = true)
    fun getUserBranchContext(userId: UUID): UserBranchContextResponse {
        logger.debug("Getting user branch context for userId: $userId")
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val user = userRepository.findById(userId)
            .orElseThrow { RuntimeException("User not found") }
        
        val tenant = tenantRepository.findById(currentTenantId)
            .orElseThrow { RuntimeException("Tenant not found") }
        
        // Get user's branch preferences
        val preferences = userBranchPreferenceRepository
            .findAllByUserAndTenant(userId, currentTenantId)
        
        val preferredBranch = preferences.find { it.isPreferred }
        val lastSelectedBranch = preferences.maxByOrNull { it.lastSelectedAt }
        
        // Determine current branch (preferred first, then last selected)
        val currentBranch = preferredBranch ?: lastSelectedBranch
        
        // Get available branches for the user
        val availableBranches = branchRepository.findByTenantId(currentTenantId)
            .map { branch ->
                BranchDto(
                    id = branch.id!!,
                    name = branch.name,
                    location = branch.location,
                    contactEmail = branch.contactEmail,
                    contactPhone = branch.contactPhone,
                    address = branch.address,
                    isActive = branch.isActive,
                    tenantId = branch.tenant.id!!,
                    tenantName = branch.tenant.name,
                    userCount = 0L, // We'll need to implement this if needed
                    createdAt = branch.createdAt,
                    updatedAt = branch.updatedAt
                )
            }
        
        return UserBranchContextResponse(
            currentBranchId = currentBranch?.branch?.id,
            currentBranchName = currentBranch?.branch?.name,
            preferredBranchId = preferredBranch?.branch?.id,
            preferredBranchName = preferredBranch?.branch?.name,
            lastSelectedBranchId = lastSelectedBranch?.branch?.id,
            lastSelectedBranchName = lastSelectedBranch?.branch?.name,
            availableBranches = availableBranches
        )
    }
    
    /**
     * Get user's preferred branch
     */
    @Transactional(readOnly = true)
    fun getUserPreferredBranch(userId: UUID): UserBranchPreferenceResponse? {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val preference = userBranchPreferenceRepository
            .findPreferredBranchByUserAndTenant(userId, currentTenantId)
        
        return preference.map { pref ->
            UserBranchPreferenceResponse(
                id = pref.id!!,
                branchId = pref.branch.id!!,
                branchName = pref.branch.name,
                isPreferred = pref.isPreferred,
                lastSelectedAt = pref.lastSelectedAt,
                createdAt = pref.createdAt
            )
        }.orElse(null)
    }
    
    /**
     * Clear user's branch preferences for a tenant
     */
    @Transactional
    fun clearUserBranchPreferences(userId: UUID) {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        userBranchPreferenceRepository.deleteByUserIdAndTenantId(userId, currentTenantId)
    }
}
