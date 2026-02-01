package com.chemsys.service

import com.chemsys.config.TenantContext
import com.chemsys.dto.CreateUserRequest
import com.chemsys.dto.UserManagementDto
import com.chemsys.dto.UpdateUserRequest
import com.chemsys.dto.RoleListResponse
import com.chemsys.dto.UserListResponse
import com.chemsys.entity.User
import com.chemsys.entity.UserRole
import com.chemsys.repository.TenantRepository
import com.chemsys.mapper.UserMapper
import com.chemsys.repository.RoleRepository
import com.chemsys.repository.UserRepository
import com.chemsys.repository.UserBranchRepository
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import java.util.*
import org.springframework.security.core.context.SecurityContextHolder

@Service
class UserService(
    private val userRepository: UserRepository,
    private val tenantRepository: TenantRepository,
    private val passwordEncoder: PasswordEncoder,
    private val userMapper: UserMapper,
    private val roleRepository: RoleRepository,
    private val userBranchRepository: UserBranchRepository
) {

    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun createUser(request: CreateUserRequest): UserManagementDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val tenant = tenantRepository.findById(currentTenantId)
            .orElseThrow { RuntimeException("Tenant not found") }
        
        if (userRepository.existsByUsername(request.username)) {
            throw RuntimeException("Username '${request.username}' already exists")
        }
        
        if (userRepository.existsByEmail(request.email)) {
            throw RuntimeException("Email '${request.email}' already exists")
        }
        
        // Resolve role: prefer explicit enum, else map string to enum if possible
        val resolvedRole = when {
            request.userRole != null -> request.userRole
            request.role != null -> runCatching { UserRole.valueOf(request.role) }.getOrDefault(UserRole.CASHIER)
            else -> UserRole.CASHIER
        }

        val user = User(
            username = request.username,
            passwordHash = passwordEncoder.encode(request.password),
            email = request.email,
            tenant = tenant,
            role = resolvedRole
        )
        
        val savedUser = userRepository.save(user)
        
        // Optional: attach RBAC/system role by name if provided (e.g., CASHIER)
        val rbacName = request.rbacRole ?: request.role
        if (rbacName != null && rbacName !in listOf("USER", "ADMIN", "PLATFORM_ADMIN")) {
            roleRepository.findByTenantIsNullAndName(rbacName)?.let { sysRole ->
                savedUser.roles.add(sysRole)
            }
        }

        return userMapper.toManagementDto(savedUser, emptyList(), null)
    }

    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getAllUsers(pageable: Pageable): UserListResponse {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val (users, totalCount) = userRepository.findByTenantId(currentTenantId) to userRepository.countByTenantId(currentTenantId)
        
        val userDtos = users.map { user -> 
            val userBranches = userBranchRepository.findByUserIdAndTenantId(user.id!!, currentTenantId)
            val branchNames = userBranches.map { it.branch.name }
            val primaryBranch = userBranches.find { it.isPrimary }?.branch?.name
            userMapper.toManagementDto(user, branchNames, primaryBranch)
        }
        
        return UserListResponse(
            users = userDtos,
            totalCount = totalCount
        )
    }

    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getUserById(id: UUID): UserManagementDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val user = userRepository.findById(id)
            .orElseThrow { RuntimeException("User not found with id: $id") }
        
        if (user.tenant.id != currentTenantId) {
            throw RuntimeException("Access denied: User belongs to different tenant")
        }
        
        val userBranches = userBranchRepository.findByUserIdAndTenantId(user.id!!, currentTenantId)
        val branchNames = userBranches.map { it.branch.name }
        val primaryBranch = userBranches.find { it.isPrimary }?.branch?.name
        return userMapper.toManagementDto(user, branchNames, primaryBranch)
    }

    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun updateUser(id: UUID, request: UpdateUserRequest): UserManagementDto {
        val currentTenantId = TenantContext.getCurrentTenant() ?: throw RuntimeException("No tenant context found")
        val user = userRepository.findById(id).orElseThrow { RuntimeException("User not found with id: $id") }
        if (user.tenant.id != currentTenantId) throw RuntimeException("Access denied: User belongs to different tenant")

        val currentUsername = SecurityContextHolder.getContext()?.authentication?.name
        if (currentUsername != null && user.username.equals(currentUsername, ignoreCase = true)) {
            throw RuntimeException("You cannot update your own user here. Use the profile endpoint.")
        }

        val updated = user.copy(
            email = request.email ?: user.email,
            role = request.role ?: user.role,
            isActive = request.isActive ?: user.isActive
        )
        val saved = userRepository.save(updated)
        val userBranches = userBranchRepository.findByUserIdAndTenantId(saved.id!!, currentTenantId)
        val branchNames = userBranches.map { it.branch.name }
        val primaryBranch = userBranches.find { it.isPrimary }?.branch?.name
        return userMapper.toManagementDto(saved, branchNames, primaryBranch)
    }

    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun deleteUser(id: UUID) {
        val currentTenantId = TenantContext.getCurrentTenant() ?: throw RuntimeException("No tenant context found")
        val user = userRepository.findById(id).orElseThrow { RuntimeException("User not found with id: $id") }
        if (user.tenant.id != currentTenantId) throw RuntimeException("Access denied: User belongs to different tenant")
        val currentUsername = SecurityContextHolder.getContext()?.authentication?.name
        if (currentUsername != null && user.username.equals(currentUsername, ignoreCase = true)) {
            throw RuntimeException("You cannot delete your own user.")
        }
        userRepository.delete(user)
    }

    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun listAvailableRoles(): RoleListResponse {
        // Fetch from db
        val roles = roleRepository.findAll().map { role ->
            mapOf("name" to role.name)
        }

        return RoleListResponse(
            roles = roles.map { it["name"] ?: "" }
        )
    }

    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun updateCurrentUser(request: UpdateUserRequest): UserManagementDto {
        val currentTenantId = TenantContext.getCurrentTenant() ?: throw RuntimeException("No tenant context found")
        val currentUsername = SecurityContextHolder.getContext()?.authentication?.name
            ?: throw RuntimeException("No authenticated user")
        val user = userRepository.findByUsername(currentUsername) ?: throw RuntimeException("Current user not found")
        if (user.tenant.id != currentTenantId) throw RuntimeException("Access denied")

        // Only allow email update via profile for now
        val updated = user.copy(
            email = request.email ?: user.email
        )
        val saved = userRepository.save(updated)
        val userBranches = userBranchRepository.findByUserIdAndTenantId(saved.id!!, currentTenantId)
        val branchNames = userBranches.map { it.branch.name }
        val primaryBranch = userBranches.find { it.isPrimary }?.branch?.name
        return userMapper.toManagementDto(saved, branchNames, primaryBranch)
    }
}
