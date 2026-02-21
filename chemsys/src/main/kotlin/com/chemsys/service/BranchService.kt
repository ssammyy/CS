package com.chemsys.service

import com.chemsys.config.TenantContext
import com.chemsys.dto.*
import com.chemsys.entity.Branch
import com.chemsys.entity.UserBranch
import com.chemsys.entity.User
import com.chemsys.mapper.BranchMapper
import com.chemsys.repository.BranchRepository
import com.chemsys.repository.UserBranchRepository
import com.chemsys.repository.UserRepository
import com.chemsys.repository.TenantRepository
import org.slf4j.LoggerFactory
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.*

@Service
class BranchService(
    private val branchRepository: BranchRepository,
    private val userBranchRepository: UserBranchRepository,
    private val userRepository: UserRepository,
    private val tenantRepository: TenantRepository,
    private val branchMapper: BranchMapper
) {

    companion object {
        private val logger = LoggerFactory.getLogger(BranchService::class.java)
    }

    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional
    fun createBranch(request: CreateBranchRequest): BranchDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val tenant = tenantRepository.findById(currentTenantId)
            .orElseThrow { RuntimeException("Tenant not found") }
        
        // Check if branch name already exists for this tenant
        if (branchRepository.findByNameAndTenantId(request.name, currentTenantId).isPresent) {
            throw RuntimeException("Branch name '${request.name}' already exists in this tenant")
        }
        
        val branch = Branch(
            name = request.name,
            location = request.location,
            contactPhone = request.contactPhone,
            contactEmail = request.contactEmail,
            address = request.address,
            tenant = tenant
        )
        
        val savedBranch = branchRepository.save(branch)
        return branchMapper.toDto(savedBranch)
    }

//    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun getAllBranches(): BranchListResponse {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        // Only create default branch when the TENANT has no branches at all (not when user has no assignments)
        var allTenantBranches = branchRepository.findByTenantId(currentTenantId)
        if (allTenantBranches.isEmpty()) {
            allTenantBranches = listOf(createDefaultBranch())
        }
        
        // Return all tenant branches for all roles - dropdowns (transfer, create inventory, etc.) need to show all branches.
        // Operation-level checks (e.g. canOperateOnItem) restrict what users can actually perform.
        val branches = allTenantBranches
        
        val userCounts = branches.associate { branch ->
            branch.id!! to userBranchRepository.countUsersByBranchId(branch.id!!)
        }
        
        val branchDtos = branchMapper.toDtoList(branches, userCounts)
        
        return BranchListResponse(
            branches = branchDtos,
            totalCount = branches.size.toLong()
        )
    }

    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun getBranchById(id: UUID): BranchDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val branch = branchRepository.findByIdAndTenantId(id, currentTenantId)
            .orElseThrow { RuntimeException("Branch not found with id: $id") }
        
        val userCount = userBranchRepository.countUsersByBranchId(id)
        return branchMapper.toDto(branch, userCount)
    }

    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional
    fun updateBranch(id: UUID, request: UpdateBranchRequest): BranchDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val branch = branchRepository.findByIdAndTenantId(id, currentTenantId)
            .orElseThrow { RuntimeException("Branch not found with id: $id") }
        
        // Check if new name conflicts with existing branches
        if (request.name != null && request.name != branch.name) {
            if (branchRepository.findByNameAndTenantId(request.name, currentTenantId).isPresent) {
                throw RuntimeException("Branch name '${request.name}' already exists in this tenant")
            }
        }
        
        val updatedBranch = branch.copy(
            name = request.name ?: branch.name,
            location = request.location ?: branch.location,
            contactPhone = request.contactPhone ?: branch.contactPhone,
            contactEmail = request.contactEmail ?: branch.contactEmail,
            address = request.address ?: branch.address,
            isActive = request.isActive ?: branch.isActive,
            updatedAt = OffsetDateTime.now()
        )
        
        val savedBranch = branchRepository.save(updatedBranch)
        val userCount = userBranchRepository.countUsersByBranchId(id)
        return branchMapper.toDto(savedBranch, userCount)
    }

    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional
    fun deleteBranch(id: UUID) {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val branch = branchRepository.findByIdAndTenantId(id, currentTenantId)
            .orElseThrow { RuntimeException("Branch not found with id: $id") }
        
        // Check if branch has users assigned
        val userCount = userBranchRepository.countUsersByBranchId(id)
        if (userCount > 0) {
            throw RuntimeException("Cannot delete branch with assigned users. Please reassign or remove users first.")
        }
        
        branchRepository.delete(branch)
    }

    /** Assign a user to a branch; allowed for ADMIN, PLATFORM_ADMIN, and MANAGER (e.g. branch staff assignment). */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER')")
    @Transactional
    fun assignUserToBranch(request: AssignUserToBranchRequest): UserBranchAssignmentDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val user = userRepository.findById(request.userId)
            .orElseThrow { RuntimeException("User not found with id: ${request.userId}") }
        
        if (user.tenant.id != currentTenantId) {
            throw RuntimeException("Access denied: User belongs to different tenant")
        }
        
        val branch = branchRepository.findByIdAndTenantId(request.branchId, currentTenantId)
            .orElseThrow { RuntimeException("Branch not found with id: ${request.branchId}") }
        
        // Check if user is already assigned to this branch
        val existingAssignment = userBranchRepository.findByUserId(request.userId)
            .find { it.branch.id == request.branchId }
        
        if (existingAssignment != null) {
            throw RuntimeException("User is already assigned to this branch")
        }
        
        // If this is a primary assignment, remove primary from other branches
        if (request.isPrimary) {
            userBranchRepository.findByUserId(request.userId)
                .filter { it.isPrimary }
                .forEach { userBranch ->
                    userBranchRepository.save(userBranch.copy(isPrimary = false))
                }
        }
        
        val userBranch = UserBranch(
            user = user,
            branch = branch,
            isPrimary = request.isPrimary
        )
        
        val savedUserBranch = userBranchRepository.save(userBranch)
        
        return UserBranchAssignmentDto(
            userId = user.id!!,
            username = user.username,
            email = user.email,
            branchId = branch.id!!,
            branchName = branch.name,
            isPrimary = savedUserBranch.isPrimary,
            assignedAt = savedUserBranch.assignedAt
        )
    }

    /** Remove a user from a branch; allowed for ADMIN, PLATFORM_ADMIN, and MANAGER. */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER')")
    @Transactional
    fun removeUserFromBranch(request: RemoveUserFromBranchRequest) {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val user = userRepository.findById(request.userId)
            .orElseThrow { RuntimeException("User not found with id: ${request.userId}") }
        
        if (user.tenant.id != currentTenantId) {
            throw RuntimeException("Access denied: User belongs to different tenant")
        }
        
        val branch = branchRepository.findByIdAndTenantId(request.branchId, currentTenantId)
            .orElseThrow { RuntimeException("Branch not found with id: ${request.branchId}") }
        
        val userBranch = userBranchRepository.findByUserId(request.userId)
            .find { it.branch.id == request.branchId }
            ?: throw RuntimeException("User is not assigned to this branch")
        
        userBranchRepository.delete(userBranch)
    }

    /**
     * Updates the primary status of a user's branch assignment.
     * If setting as primary, removes primary status from all other branches for this user.
     * Allowed for ADMIN, PLATFORM_ADMIN, and MANAGER (consistent with assign/remove).
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER')")
    @Transactional
    fun updateUserBranchPrimary(request: UpdateUserBranchPrimaryRequest): UserBranchAssignmentDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val user = userRepository.findById(request.userId)
            .orElseThrow { RuntimeException("User not found with id: ${request.userId}") }
        
        if (user.tenant.id != currentTenantId) {
            throw RuntimeException("Access denied: User belongs to different tenant")
        }
        
        val branch = branchRepository.findByIdAndTenantId(request.branchId, currentTenantId)
            .orElseThrow { RuntimeException("Branch not found with id: ${request.branchId}") }
        
        val userBranch = userBranchRepository.findByUserId(request.userId)
            .find { it.branch.id == request.branchId }
            ?: throw RuntimeException("User is not assigned to this branch")
        
        // If setting as primary, remove primary from other branches
        if (request.isPrimary) {
            userBranchRepository.findByUserId(request.userId)
                .filter { it.isPrimary && it.branch.id != request.branchId }
                .forEach { existingPrimary ->
                    userBranchRepository.save(existingPrimary.copy(isPrimary = false))
                }
        }
        
        // Update the primary status
        val updatedUserBranch = userBranchRepository.save(userBranch.copy(isPrimary = request.isPrimary))
        
        return UserBranchAssignmentDto(
            userId = user.id!!,
            username = user.username,
            email = user.email,
            branchId = branch.id!!,
            branchName = branch.name,
            isPrimary = updatedUserBranch.isPrimary,
            assignedAt = updatedUserBranch.assignedAt
        )
    }

//    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun getBranchUsers(branchId: UUID): List<UserBranchAssignmentDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        // Verify branch exists and belongs to current tenant
        branchRepository.findByIdAndTenantId(branchId, currentTenantId)
            .orElseThrow { RuntimeException("Branch not found with id: $branchId") }
        
        val userBranches = userBranchRepository.findByBranchIdAndTenantId(branchId, currentTenantId)
        
        return userBranches.map { userBranch ->
            UserBranchAssignmentDto(
                userId = userBranch.user.id!!,
                username = userBranch.user.username,
                email = userBranch.user.email,
                branchId = userBranch.branch.id!!,
                branchName = userBranch.branch.name,
                isPrimary = userBranch.isPrimary,
                assignedAt = userBranch.assignedAt
            )
        }
    }

//    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun getUserBranches(userId: UUID): List<UserBranchAssignmentDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        // Verify user exists and belongs to current tenant
        val user = userRepository.findById(userId)
            .orElseThrow { RuntimeException("User not found with id: $userId") }
        
        if (user.tenant.id != currentTenantId) {
            throw RuntimeException("Access denied: User belongs to different tenant")
        }
        
        val userBranches = userBranchRepository.findByUserIdAndTenantId(userId, currentTenantId)
        
        return userBranches.map { userBranch ->
            UserBranchAssignmentDto(
                userId = userBranch.user.id!!,
                username = userBranch.user.username,
                email = userBranch.user.email,
                branchId = userBranch.branch.id!!,
                branchName = userBranch.branch.name,
                isPrimary = userBranch.isPrimary,
                assignedAt = userBranch.assignedAt
            )
        }
    }

    /**
     * Creates a default "Main Branch" for the current tenant.
     * This is called automatically when no branches exist for a tenant.
     */
    @Transactional
    private fun createDefaultBranch(): Branch {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val tenant = tenantRepository.findById(currentTenantId)
            .orElseThrow { RuntimeException("Tenant not found") }
        
        val mainBranch = Branch(
            id = UUID.randomUUID(),
            name = "Main Branch",
            location = "Head Office",
            contactEmail = "main@${tenant.name.lowercase().replace(" ", "").replace(Regex("[^a-z0-9]"), "")}.com",
            contactPhone = "+254-700-000-000", 
            address = "Main Street, Nairobi, Kenya",
            tenant = tenant,
            isActive = true,
            createdAt = OffsetDateTime.now()
        )
        
        val savedBranch = branchRepository.save(mainBranch)
        logger.info("✅ Auto-created default Main Branch for tenant: ${tenant.name}")
        return savedBranch
    }
}
