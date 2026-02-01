package com.chemsys.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

/**
 * InventoryTransaction entity tracks all stock movements and changes in inventory.
 * This provides an audit trail for stock adjustments, transfers, and sales.
 */
@Entity
@Table(name = "inventory_transactions")
data class InventoryTransaction(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    val product: Product,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    val branch: Branch,

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    val transactionType: TransactionType,

    @Column(name = "quantity", nullable = false)
    val quantity: Int,

    @Column(name = "unit_cost", precision = 10, scale = 2)
    val unitCost: BigDecimal?,

    @Column(name = "total_cost", precision = 10, scale = 2)
    val totalCost: BigDecimal?,

    @Column(name = "batch_number")
    val batchNumber: String?,

    @Column(name = "expiry_date")
    val expiryDate: java.time.LocalDate?,

    @Column(name = "reference_number")
    val referenceNumber: String?,

    @Column(name = "notes", columnDefinition = "TEXT")
    val notes: String?,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by")
    val performedBy: User?,



    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now()
)

/**
 * Enum representing different types of inventory transactions.
 */
enum class TransactionType {
    PURCHASE,           // Stock received from supplier
    SALE,              // Stock sold to customer
    ADJUSTMENT,        // Manual stock adjustment
    TRANSFER_IN,       // Stock transferred from another branch
    TRANSFER_OUT,      // Stock transferred to another branch
    RETURN,            // Stock returned from customer
    EXPIRY_WRITE_OFF,  // Stock written off due to expiry
    DAMAGE_WRITE_OFF,  // Stock written off due to damage
    INITIAL_STOCK      // Initial stock setup
}
