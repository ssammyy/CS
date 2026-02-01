package com.chemsys.service

import com.chemsys.config.TenantContext
import com.chemsys.dto.*
import com.chemsys.entity.BranchMpesaTill
import com.chemsys.entity.MpesaConfiguration
import com.chemsys.repository.BranchMpesaTillRepository
import com.chemsys.repository.BranchRepository
import com.chemsys.repository.MpesaConfigurationRepository
import com.chemsys.repository.TenantRepository
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.stereotype.Service
import java.time.OffsetDateTime
import java.util.*

/**
 * Service for managing M-Pesa configuration per tenant
 */
@Service
class MpesaConfigurationService(
    private val mpesaConfigRepository: MpesaConfigurationRepository,
    private val branchTillRepository: BranchMpesaTillRepository,
    private val tenantRepository: TenantRepository,
    private val branchRepository: BranchRepository
) {

    /**
     * Get M-Pesa configuration for current tenant
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun getMpesaConfiguration(): MpesaConfigurationDto {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        var config = mpesaConfigRepository.findByTenantId(tenantId)

        // If config doesn't exist, create default one
        if (config == null) {
            config = createDefaultConfiguration(tenantId)
        }

        return mapToDto(config)
    }

    /**
     * Update M-Pesa configuration for current tenant
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun updateMpesaConfiguration(request: UpdateMpesaConfigRequest): MpesaConfigurationDto {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        var config = mpesaConfigRepository.findByTenantId(tenantId)

        // If config doesn't exist, create default one
        if (config == null) {
            config = createDefaultConfiguration(tenantId)
        }

        // Update fields if provided
        request.enabled?.let { config.enabled = it }
        request.defaultTillNumber?.let {
            if (it.trim().isNotEmpty()) {
                config.defaultTillNumber = it
            }
        }

        config.updatedAt = OffsetDateTime.now()

        // Update branch-specific till numbers
        if (request.branchTillNumbers.isNotEmpty()) {
            updateBranchTillNumbers(config, request.branchTillNumbers, tenantId)
        }

        val saved = mpesaConfigRepository.save(config)
        return mapToDto(saved)
    }

    /**
     * Get till number for a specific branch
     * Returns branch-specific till if configured, otherwise returns default till
     */
    fun getTillNumberForBranch(branchId: UUID, tenantId: UUID): String? {
        // First check if branch has specific till
        val branchTill = branchTillRepository.findByBranchIdAndMpesaConfigTenantId(branchId, tenantId)
        if (branchTill != null) {
            return branchTill.tillNumber
        }

        // Fall back to default till
        val config = mpesaConfigRepository.findByTenantId(tenantId)
        return config?.defaultTillNumber
    }

    /**
     * Check if M-Pesa is enabled for tenant
     */
    fun isMpesaEnabled(tenantId: UUID): Boolean {
        val config = mpesaConfigRepository.findByTenantId(tenantId)
        return config?.enabled == true && config.tierEnabled
    }

    /**
     * Create default M-Pesa configuration
     */
    private fun createDefaultConfiguration(tenantId: UUID): MpesaConfiguration {
        val tenant = tenantRepository.findById(tenantId)
            .orElseThrow { RuntimeException("Tenant not found") }

        val config = MpesaConfiguration(
            id = UUID.randomUUID(),
            tenant = tenant,
            enabled = false,
            tierEnabled = false,
            defaultTillNumber = null,
            createdAt = OffsetDateTime.now(),
            updatedAt = null
        )

        return mpesaConfigRepository.save(config)
    }

    /**
     * Update branch-specific till numbers
     */
    private fun updateBranchTillNumbers(
        config: MpesaConfiguration,
        updates: List<UpdateBranchTillRequest>,
        tenantId: UUID
    ) {
        updates.forEach { update ->
            val branchId = UUID.fromString(update.branchId)

            // Verify branch exists and belongs to tenant
            val branch = branchRepository.findById(branchId)
                .orElseThrow { RuntimeException("Branch not found") }

            if (branch.tenant.id != tenantId) {
                throw RuntimeException("Branch does not belong to this tenant")
            }

            // Find or create branch till entry
            var branchTill = branchTillRepository.findByBranchIdAndMpesaConfigTenantId(branchId, tenantId)

            if (branchTill != null) {
                // Update existing
                branchTill.tillNumber = update.tillNumber
                branchTill.updatedAt = OffsetDateTime.now()
            } else {
                // Create new
                branchTill = BranchMpesaTill(
                    id = UUID.randomUUID(),
                    mpesaConfig = config,
                    branch = branch,
                    tillNumber = update.tillNumber,
                    createdAt = OffsetDateTime.now()
                )
            }

            branchTillRepository.save(branchTill)
        }
    }

    /**
     * Enable M-Pesa feature for a tenant (Platform admin only)
     */
    fun enableMpesaTierForTenant(tenantId: UUID): MpesaConfigurationDto {
        var config = mpesaConfigRepository.findByTenantId(tenantId)

        if (config == null) {
            // Create config if doesn't exist
            val tenant = tenantRepository.findById(tenantId)
                .orElseThrow { RuntimeException("Tenant not found") }

            config = MpesaConfiguration(
                id = UUID.randomUUID(),
                tenant = tenant,
                enabled = false,
                tierEnabled = true,  // Enable tier access
                defaultTillNumber = null,
                createdAt = OffsetDateTime.now(),
                updatedAt = null
            )
        } else {
            config.tierEnabled = true
            config.updatedAt = OffsetDateTime.now()
        }

        val saved = mpesaConfigRepository.save(config)
        return mapToDto(saved)
    }

    /**
     * Disable M-Pesa feature for a tenant (Platform admin only)
     */
    fun disableMpesaTierForTenant(tenantId: UUID): MpesaConfigurationDto {
        val config = mpesaConfigRepository.findByTenantId(tenantId)
            ?: throw RuntimeException("M-Pesa configuration not found for tenant")

        config.tierEnabled = false
        config.enabled = false  // Also disable it
        config.updatedAt = OffsetDateTime.now()

        val saved = mpesaConfigRepository.save(config)
        return mapToDto(saved)
    }

    /**
     * Get M-Pesa configuration for a specific tenant (for admin use)
     */
    fun getMpesaConfigurationForTenant(tenantId: UUID): MpesaConfigurationDto {
        var config = mpesaConfigRepository.findByTenantId(tenantId)

        // If config doesn't exist, create default one
        if (config == null) {
            val tenant = tenantRepository.findById(tenantId)
                .orElseThrow { RuntimeException("Tenant not found") }
            config = createDefaultConfiguration(tenantId)
        }

        return mapToDto(config)
    }

    /**
     * Map entity to DTO
     */
    private fun mapToDto(entity: MpesaConfiguration): MpesaConfigurationDto {
        return MpesaConfigurationDto(
            id = entity.id ?: UUID.randomUUID(),
            tenantId = entity.tenant.id!!,
            enabled = entity.enabled,
            tierEnabled = entity.tierEnabled,
            defaultTillNumber = entity.defaultTillNumber,
            branchTillNumbers = entity.branchTillNumbers.map {
                BranchMpesaTillDto(
                    id = it.id ?: UUID.randomUUID(),
                    branchId = it.branch.id!!,
                    branchName = it.branch.name,
                    tillNumber = it.tillNumber,
                    createdAt = it.createdAt,
                    updatedAt = it.updatedAt
                )
            },
            createdAt = entity.createdAt,
            updatedAt = entity.updatedAt
        )
    }
}
