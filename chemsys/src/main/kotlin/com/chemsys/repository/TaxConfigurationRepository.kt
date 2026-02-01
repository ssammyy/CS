package com.chemsys.repository

import com.chemsys.entity.TaxConfiguration
import com.chemsys.entity.TaxClassification
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

/**
 * Repository for TaxConfiguration entity operations.
 * Provides methods for finding tax configurations by various criteria within a tenant.
 */
@Repository
interface TaxConfigurationRepository : JpaRepository<TaxConfiguration, UUID> {

    /**
     * Find all tax configurations for a specific tenant.
     */
    fun findByTenantId(tenantId: UUID): List<TaxConfiguration>

    /**
     * Find a specific tax configuration by tenant and classification.
     */
    fun findByTenantIdAndTaxClassification(
        tenantId: UUID,
        taxClassification: TaxClassification
    ): TaxConfiguration?

    /**
     * Find all active tax configurations for a tenant.
     */
    fun findByTenantIdAndActiveTrue(tenantId: UUID): List<TaxConfiguration>

    /**
     * Check if a tax configuration exists for a tenant and classification.
     */
    fun existsByTenantIdAndTaxClassification(
        tenantId: UUID,
        taxClassification: TaxClassification
    ): Boolean
}
