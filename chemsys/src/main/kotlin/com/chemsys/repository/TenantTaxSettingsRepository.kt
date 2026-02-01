package com.chemsys.repository

import com.chemsys.entity.TenantTaxSettings
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

/**
 * Repository for TenantTaxSettings entity operations.
 * Each tenant has exactly one tax settings record.
 */
@Repository
interface TenantTaxSettingsRepository : JpaRepository<TenantTaxSettings, UUID> {

    /**
     * Find tax settings by tenant ID
     */
    fun findByTenantId(tenantId: UUID): TenantTaxSettings?

    /**
     * Check if tax settings exist for a tenant
     */
    fun existsByTenantId(tenantId: UUID): Boolean
}
