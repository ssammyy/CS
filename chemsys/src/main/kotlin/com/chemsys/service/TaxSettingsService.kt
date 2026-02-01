package com.chemsys.service

import com.chemsys.config.TenantContext
import com.chemsys.dto.TenantTaxSettingsDto
import com.chemsys.dto.UpdateTaxSettingsRequest
import com.chemsys.entity.TaxPricingMode
import com.chemsys.entity.TenantTaxSettings
import com.chemsys.repository.TenantRepository
import com.chemsys.repository.TenantTaxSettingsRepository
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

/**
 * Service for managing tenant tax settings
 */
@Service
class TaxSettingsService(
    private val tenantTaxSettingsRepository: TenantTaxSettingsRepository,
    private val tenantRepository: TenantRepository
) {

    /**
     * Get tax settings for the current tenant
     * Creates default settings if they don't exist
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun getTaxSettings(): TenantTaxSettingsDto {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        var taxSettings = tenantTaxSettingsRepository.findByTenantId(tenantId)

        // If settings don't exist, create default ones
        if (taxSettings == null) {
            taxSettings = createDefaultTaxSettings(tenantId)
        }

        return mapToDto(taxSettings)
    }

    /**
     * Update tax settings for the current tenant
     * Creates default settings if they don't exist
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun updateTaxSettings(request: UpdateTaxSettingsRequest): TenantTaxSettingsDto {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        var taxSettings = tenantTaxSettingsRepository.findByTenantId(tenantId)

        // If settings don't exist, create default ones
        if (taxSettings == null) {
            taxSettings = createDefaultTaxSettings(tenantId)
        }

        // Update fields if provided
        request.chargeVat?.let { taxSettings.chargeVat = it }
        request.defaultVatRate?.let {
            // Validate rate is between 0 and 100
            if (it < BigDecimal.ZERO || it > BigDecimal(100)) {
                throw IllegalArgumentException("VAT rate must be between 0 and 100")
            }
            taxSettings.defaultVatRate = it
        }
        request.pricingMode?.let {
            try {
                taxSettings.pricingMode = TaxPricingMode.valueOf(it)
            } catch (e: IllegalArgumentException) {
                throw IllegalArgumentException("Invalid pricing mode: $it. Must be INCLUSIVE or EXCLUSIVE")
            }
        }

        taxSettings.updatedAt = OffsetDateTime.now()

        val saved = tenantTaxSettingsRepository.save(taxSettings)
        return mapToDto(saved)
    }

    /**
     * Create default tax settings for a tenant
     * Called during tenant creation
     */
    fun createDefaultTaxSettings(tenantId: UUID): TenantTaxSettings {
        val tenant = tenantRepository.findById(tenantId)
            .orElseThrow { RuntimeException("Tenant not found") }

        // Check if settings already exist
        val existing = tenantTaxSettingsRepository.findByTenantId(tenantId)
        if (existing != null) {
            return existing
        }

        val taxSettings = TenantTaxSettings(
            id = UUID.randomUUID(),
            tenant = tenant,
            chargeVat = true,
            defaultVatRate = BigDecimal("16.00"), // Kenya standard VAT rate
            pricingMode = TaxPricingMode.EXCLUSIVE,
            createdAt = OffsetDateTime.now(),
            updatedAt = null
        )

        return tenantTaxSettingsRepository.save(taxSettings)
    }

    private fun mapToDto(entity: TenantTaxSettings): TenantTaxSettingsDto {
        return TenantTaxSettingsDto(
            id = entity.id ?: UUID.randomUUID(),
            tenantId = entity.tenant.id!!,
            chargeVat = entity.chargeVat,
            defaultVatRate = entity.defaultVatRate,
            pricingMode = entity.pricingMode.name,
            createdAt = entity.createdAt,
            updatedAt = entity.updatedAt
        )
    }
}
