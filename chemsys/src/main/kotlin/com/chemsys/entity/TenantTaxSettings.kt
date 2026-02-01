package com.chemsys.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

/**
 * Tax pricing mode enum
 */
enum class TaxPricingMode {
    INCLUSIVE,   // Prices include VAT
    EXCLUSIVE    // Prices exclude VAT (VAT added on top)
}

/**
 * TenantTaxSettings entity stores tax configuration for each tenant.
 * Each tenant can configure whether they charge VAT and how prices are handled.
 */
@Entity
@Table(name = "tenant_tax_settings")
data class TenantTaxSettings(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false, unique = true)
    val tenant: Tenant,

    @Column(name = "charge_vat", nullable = false)
    var chargeVat: Boolean = true,

    @Column(name = "default_vat_rate", nullable = false, precision = 5, scale = 2)
    var defaultVatRate: BigDecimal = BigDecimal("16.00"),

    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_mode", nullable = false)
    var pricingMode: TaxPricingMode = TaxPricingMode.EXCLUSIVE,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    var updatedAt: OffsetDateTime? = null
)
