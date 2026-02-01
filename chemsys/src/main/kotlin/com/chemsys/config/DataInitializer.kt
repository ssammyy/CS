package com.chemsys.config

import com.chemsys.entity.Branch
import com.chemsys.entity.Role
import com.chemsys.entity.Tenant
import com.chemsys.entity.User
import com.chemsys.entity.UserRole
import com.chemsys.repository.BranchRepository
import com.chemsys.repository.RoleRepository
import com.chemsys.repository.TenantRepository
import com.chemsys.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component
import java.time.OffsetDateTime
import java.util.*

/**
 * Data initializer that runs after Hibernate creates the schema.
 * This replaces the Flyway migrations for seeding initial data.
 */
@Component
class DataInitializer(
    private val tenantRepository: TenantRepository,
    private val userRepository: UserRepository,
    private val roleRepository: RoleRepository,
    private val branchRepository: BranchRepository,
    private val passwordEncoder: PasswordEncoder
) : CommandLineRunner {

    companion object {
        private val logger = LoggerFactory.getLogger(DataInitializer::class.java)
    }

    override fun run(vararg args: String?) {
        // Only run if no tenants exist (fresh database)
        if (tenantRepository.count() == 0L) {
            initializeData()
        }
    }

    private fun initializeData() {
        // Create default tenant
        val defaultTenant = Tenant(
            id = UUID.randomUUID(),
            name = "Default ",
            createdAt = OffsetDateTime.now()
        )
        val savedTenant = tenantRepository.save(defaultTenant)

        // Create default main branch for the tenant
        createDefaultBranch(savedTenant)

        // Create system roles (without permissions for now)
        val roles = createRoles(savedTenant)
        roleRepository.saveAll(roles)

        // Create default admin user
        createDefaultAdmin(savedTenant, roles.find { it.name == "TENANT_ADMIN" }!!)
    }

    private fun createRoles(tenant: Tenant): List<Role> {
        val cashierRole = Role(
            id = UUID.randomUUID(),
            tenant = tenant,
            name = "CASHIER",
            isSystem = true
        )

        val managerRole = Role(
            id = UUID.randomUUID(),
            tenant = tenant,
            name = "MANAGER",
            isSystem = true
        )

        val adminRole = Role(
            id = UUID.randomUUID(),
            tenant = tenant,
            name = "TENANT_ADMIN",
            isSystem = true
        )

        return listOf(cashierRole, managerRole, adminRole)
    }

    /**
     * Creates a default "Main Branch" for the tenant.
     * This ensures every tenant has at least one operational branch.
     */
    private fun createDefaultBranch(tenant: Tenant) {
        val mainBranch = Branch(
            id = UUID.randomUUID(),
            name = "Main Branch",
            location = "Head Office",
            contactEmail = "main@${tenant.name.lowercase().replace(" ", "")}.com",
            contactPhone = "+254-700-000-000",
            address = "",
            tenant = tenant,
            isActive = true,
            createdAt = OffsetDateTime.now()
        )
        branchRepository.save(mainBranch)
        logger.info("✅ Created default Main Branch for tenant: ${tenant.name}")
    }

    private fun createDefaultAdmin(tenant: Tenant, adminRole: Role) {
        val adminUser = User(
            id = UUID.randomUUID(),
            username = "admin",
            passwordHash = passwordEncoder.encode("admin123"),
            email = "admin@defaultpharmacy.com",
            tenant = tenant,
            role = UserRole.ADMIN,
            isActive = true,
            createdAt = OffsetDateTime.now()
        )

        val savedUser = userRepository.save(adminUser)
        savedUser.roles.add(adminRole)
        userRepository.save(savedUser)
    }
}
