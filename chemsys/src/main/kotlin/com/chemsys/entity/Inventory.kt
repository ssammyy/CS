package com.chemsys.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.*

/**
 * Inventory entity represents the stock of a specific product at a specific branch.
 * It tracks quantity, batch information, expiry dates, and cost information.
 */
@Entity
@Table(name = "inventory")
data class Inventory(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    val product: Product,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    val branch: Branch,

    @Column(name = "batch_number")
    val batchNumber: String?,

    @Column(name = "expiry_date")
    val expiryDate: LocalDate?,

    @Column(name = "manufacturing_date")
    val manufacturingDate: LocalDate?,

    @Column(name = "quantity", nullable = false)
    val quantity: Int,

    @Column(name = "unit_cost", precision = 10, scale = 2)
    val unitCost: BigDecimal?,

    @Column(name = "selling_price", precision = 10, scale = 2)
    val sellingPrice: BigDecimal?,



    @Column(name = "location_in_branch")
    val locationInBranch: String?,

    @Column(name = "is_active", nullable = false)
    val isActive: Boolean = true,

    @Column(name = "last_restocked")
    val lastRestocked: OffsetDateTime?,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
)
