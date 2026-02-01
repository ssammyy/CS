package com.chemsys.entity

import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.*

/**
 * Product entity represents a medicine or pharmaceutical product in the inventory system.
 * Each product has a unique identifier and can be stocked across multiple branches.
 */
@Entity
@Table(name = "products")
data class Product(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "name", nullable = false)
    val name: String,

    @Column(name = "generic_name")
    val genericName: String?,

    @Column(name = "description", columnDefinition = "TEXT")
    val description: String?,

    @Column(name = "strength")
    val strength: String?,

    @Column(name = "dosage_form")
    val dosageForm: String?,

    @Column(name = "manufacturer")
    val manufacturer: String?,

    @Column(name = "barcode", unique = true, nullable = true)
    val barcode: String?,

    @Column(name = "is_active", nullable = false)
    val isActive: Boolean = true,

    @Column(name = "requires_prescription", nullable = false)
    val requiresPrescription: Boolean = false,

    @Column(name = "storage_conditions")
    val storageConditions: String?,

    @Column(name = "min_stock_level", nullable = false)
    val minStockLevel: Int = 10,

    @Column(name = "max_stock_level")
    val maxStockLevel: Int?,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_classification", nullable = false)
    val taxClassification: TaxClassification = TaxClassification.STANDARD,

    @Column(name = "tax_rate", precision = 5, scale = 2)
    val taxRate: java.math.BigDecimal? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
)
