package com.chemsys.service

import com.chemsys.entity.Tenant
import com.chemsys.entity.User
import com.chemsys.entity.UserRole
import com.chemsys.repository.TenantRepository
import com.chemsys.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

/**
 * Service to initialize default PLATFORM_ADMIN user on application startup
 */
@Service
class AdminInitializationService(
    private val tenantRepository: TenantRepository,
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
) {

    companion object {
        private val logger = LoggerFactory.getLogger(AdminInitializationService::class.java)
        private const val ADMIN_TENANT_ID = "00000000-0000-0000-0000-000000000000"
        private const val ADMIN_USERNAME = "ADMIN"
        private const val ADMIN_PASSWORD = "ADMIN"
        private const val ADMIN_EMAIL = "admin@platform.local"
    }

    /**
     * Runs after application startup to initialize admin user
     */
    @EventListener(ApplicationReadyEvent::class)
    @Transactional
    fun initializeAdminUser() {
        try {
            // Check if admin tenant exists
            val adminTenantUuid = UUID.fromString(ADMIN_TENANT_ID)
            var adminTenant = tenantRepository.findById(adminTenantUuid).orElse(null)

            if (adminTenant == null) {
                logger.info("Creating platform admin tenant...")
                adminTenant = Tenant(
                    id = adminTenantUuid,
                    name = "Platform Admin"
                )
                tenantRepository.save(adminTenant)
                logger.info("Platform admin tenant created")
            }

            // Check if admin user exists
            val existingAdmin = userRepository.findByUsername(ADMIN_USERNAME)
            if (existingAdmin == null) {
                logger.info("Creating default PLATFORM_ADMIN user...")
                val adminUser = User(
                    id = UUID.fromString("00000000-0000-0000-0000-000000000001"),
                    username = ADMIN_USERNAME,
                    passwordHash = passwordEncoder.encode(ADMIN_PASSWORD),
                    email = ADMIN_EMAIL,
                    tenant = adminTenant,
                    role = UserRole.PLATFORM_ADMIN,
                    isActive = true
                )
                userRepository.save(adminUser)
                logger.info("Default PLATFORM_ADMIN user created with credentials - Username: $ADMIN_USERNAME, Password: $ADMIN_PASSWORD")
            } else {
                logger.info("PLATFORM_ADMIN user already exists")
            }

        } catch (e: Exception) {
            logger.error("Error during admin initialization: ${e.message}", e)
        }
    }
}
