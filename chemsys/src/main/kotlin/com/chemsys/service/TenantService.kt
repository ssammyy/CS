package com.chemsys.service

import com.chemsys.dto.CreateTenantRequest
import com.chemsys.dto.TenantDto
import com.chemsys.dto.TenantListResponse
import com.chemsys.entity.Tenant
import com.chemsys.entity.User
import com.chemsys.entity.UserRole
import com.chemsys.repository.TenantRepository
import com.chemsys.repository.RoleRepository
import com.chemsys.repository.UserRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.dao.DataIntegrityViolationException
import java.util.*

@Service
class TenantService(
    private val tenantRepository: TenantRepository,
    private val userRepository: UserRepository,
    private val passwordService: org.springframework.security.crypto.password.PasswordEncoder,
    private val roleRepository: RoleRepository
) {

    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    @Transactional
    fun createTenant(request: CreateTenantRequest): TenantDto {
        if (tenantRepository.existsByName(request.name)) {
            throw RuntimeException("Tenant with name '${request.name}' already exists")
        }
        
        val savedTenant = tenantRepository.save(Tenant(name = request.name))
        
        if (userRepository.existsByUsername(request.adminUsername)) {
            throw RuntimeException("Username '${request.adminUsername}' already exists")
        }
        if (userRepository.existsByEmail(request.adminEmail)) {
            throw RuntimeException("Email '${request.adminEmail}' already exists")
        }
        
        val adminUser = User(
            username = request.adminUsername,
            passwordHash = passwordService.encode(request.adminPassword),
            email = request.adminEmail,
            tenant = savedTenant,
            role = UserRole.ADMIN,
            isActive = true
        )
        
        try {
            val savedAdmin = userRepository.save(adminUser)
            roleRepository.findByTenantIsNullAndName("TENANT_ADMIN")?.let { systemAdminRole ->
                savedAdmin.roles.add(systemAdminRole)
            }
        } catch (ex: DataIntegrityViolationException) {
            throw RuntimeException("Username or email already exists globally", ex)
        }
        
        return TenantDto(
            id = savedTenant.id!!,
            name = savedTenant.name,
            createdAt = savedTenant.createdAt
        )
    }

    fun getAllTenants(pageable: Pageable): TenantListResponse {
        val page: Page<Tenant> = tenantRepository.findAll(pageable)
        
        val tenantDtos = page.content.map { tenant ->
            TenantDto(
                id = tenant.id!!,
                name = tenant.name,
                createdAt = tenant.createdAt
            )
        }
        
        return TenantListResponse(
            tenants = tenantDtos,
            totalCount = page.totalElements
        )
    }

    fun getTenantById(id: UUID): TenantDto {
        val tenant = tenantRepository.findById(id)
            .orElseThrow { RuntimeException("Tenant not found with id: $id") }
        
        return TenantDto(
            id = tenant.id!!,
            name = tenant.name,
            createdAt = tenant.createdAt
        )
    }
}
