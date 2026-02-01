package com.chemsys.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

/**
 * Tax classification enum representing different VAT rate categories
 */
enum class TaxClassification {
    STANDARD,  // Standard VAT rate
    REDUCED,   // Reduced VAT rate
    ZERO,      // Zero-rated supplies
    EXEMPT     // VAT exempt supplies
}

/**
 * TaxConfiguration entity stores VAT rates and tax classifications at the tenant level.
 * Each tenant can configure different VAT rates for different tax classifications.
 */
@Entity
@Table(name = "tax_configurations")
data class TaxConfiguration(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_classification", nullable = false)
    val taxClassification: TaxClassification,

    @Column(name = "vat_rate", nullable = false, precision = 5, scale = 2)
    val vatRate: BigDecimal,

    @Column(name = "description")
    val description: String?,

    @Column(name = "active", nullable = false)
    val active: Boolean = true,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
)
