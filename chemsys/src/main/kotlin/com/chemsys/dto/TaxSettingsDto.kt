package com.chemsys.dto

import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

/**
 * DTO for tenant tax settings
 */
data class TenantTaxSettingsDto(
    val id: UUID,
    val tenantId: UUID,
    val chargeVat: Boolean,
    val defaultVatRate: BigDecimal,
    val pricingMode: String, // "INCLUSIVE" or "EXCLUSIVE"
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime?
)

/**
 * Request DTO for updating tax settings
 */
data class UpdateTaxSettingsRequest(
    val chargeVat: Boolean? = null,
    val defaultVatRate: BigDecimal? = null,
    val pricingMode: String? = null
)
