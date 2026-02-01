package com.chemsys.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

/**
 * InventoryAuditLog entity tracks all inventory mutations for compliance and audit purposes.
 * This entity is critical for the Backend Data Consistency Rule as it provides:
 * - Complete audit trail for all stock movements
 * - Idempotency tracking through unique transaction references
 * - User accountability and timestamp tracking
 * - Source reference linking for traceability
 * 
 * Every inventory mutation (sale, purchase, adjustment, etc.) must create an audit log entry
 * in the same transaction to ensure data consistency and compliance.
 */
@Entity
@Table(name = "inventory_audit_logs")
data class InventoryAuditLog(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    val product: Product,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    val branch: Branch,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    val transactionType: TransactionType,

    @Column(name = "quantity_changed", nullable = false)
    val quantityChanged: Int,

    @Column(name = "quantity_before", nullable = false)
    val quantityBefore: Int,

    @Column(name = "quantity_after", nullable = false)
    val quantityAfter: Int,

    @Column(name = "unit_cost", precision = 10, scale = 2)
    val unitCost: BigDecimal?,

    @Column(name = "selling_price", precision = 10, scale = 2)
    val sellingPrice: BigDecimal?,

    @Column(name = "batch_number")
    val batchNumber: String?,

    @Column(name = "expiry_date")
    val expiryDate: java.time.LocalDate?,

    @Column(name = "source_reference", nullable = false)
    val sourceReference: String,

    @Column(name = "source_type", nullable = false)
    val sourceType: SourceType,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by", nullable = false)
    val performedBy: User,

    @Column(name = "performed_at", nullable = false)
    val performedAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "notes", columnDefinition = "TEXT")
    val notes: String?,

    @Column(name = "is_duplicate", nullable = false)
    val isDuplicate: Boolean = false,

    @Column(name = "duplicate_reference")
    val duplicateReference: String?
)

/**
 * SourceType enum defines the different sources of inventory mutations.
 * This helps in categorizing and filtering audit logs by transaction source.
 */
enum class SourceType {
    SALE,                   // Sale transaction
    PURCHASE_ORDER,         // Purchase order receipt
    GOODS_RECEIVED_NOTE,    // GRN processing
    INVENTORY_ADJUSTMENT,   // Manual inventory adjustment
    INVENTORY_TRANSFER,     // Branch-to-branch transfer
    RETURN,                 // Customer return
    EXPIRY_WRITE_OFF,       // Expired product write-off
    DAMAGE_WRITE_OFF,       // Damaged product write-off
    INITIAL_STOCK,          // Initial stock setup
    SYSTEM_ADJUSTMENT       // System-generated adjustment
}

/**
 * Helper class for creating audit log entries with proper validation.
 * This ensures that all required fields are populated and validates business rules.
 */
class InventoryAuditLogBuilder {
    private var product: Product? = null
    private var branch: Branch? = null
    private var tenant: Tenant? = null
    private var transactionType: TransactionType? = null
    private var quantityChanged: Int? = null
    private var quantityBefore: Int? = null
    private var quantityAfter: Int? = null
    private var unitCost: BigDecimal? = null
    private var sellingPrice: BigDecimal? = null
    private var batchNumber: String? = null
    private var expiryDate: java.time.LocalDate? = null
    private var sourceReference: String? = null
    private var sourceType: SourceType? = null
    private var performedBy: User? = null
    private var notes: String? = null
    private var isDuplicate: Boolean = false
    private var duplicateReference: String? = null

    fun product(product: Product) = apply { this.product = product }
    fun branch(branch: Branch) = apply { this.branch = branch }
    fun tenant(tenant: Tenant) = apply { this.tenant = tenant }
    fun transactionType(transactionType: TransactionType) = apply { this.transactionType = transactionType }
    fun quantityChanged(quantityChanged: Int) = apply { this.quantityChanged = quantityChanged }
    fun quantityBefore(quantityBefore: Int) = apply { this.quantityBefore = quantityBefore }
    fun quantityAfter(quantityAfter: Int) = apply { this.quantityAfter = quantityAfter }
    fun unitCost(unitCost: BigDecimal?) = apply { this.unitCost = unitCost }
    fun sellingPrice(sellingPrice: BigDecimal?) = apply { this.sellingPrice = sellingPrice }
    fun batchNumber(batchNumber: String?) = apply { this.batchNumber = batchNumber }
    fun expiryDate(expiryDate: java.time.LocalDate?) = apply { this.expiryDate = expiryDate }
    fun sourceReference(sourceReference: String) = apply { this.sourceReference = sourceReference }
    fun sourceType(sourceType: SourceType) = apply { this.sourceType = sourceType }
    fun performedBy(performedBy: User) = apply { this.performedBy = performedBy }
    fun notes(notes: String?) = apply { this.notes = notes }
    fun isDuplicate(isDuplicate: Boolean) = apply { this.isDuplicate = isDuplicate }
    fun duplicateReference(duplicateReference: String?) = apply { this.duplicateReference = duplicateReference }

    /**
     * Builds the InventoryAuditLog entity with validation.
     * 
     * @return InventoryAuditLog entity
     * @throws IllegalStateException if required fields are missing or invalid
     */
    fun build(): InventoryAuditLog {
        requireNotNull(product) { "Product is required" }
        requireNotNull(branch) { "Branch is required" }
        requireNotNull(tenant) { "Tenant is required" }
        requireNotNull(transactionType) { "Transaction type is required" }
        requireNotNull(quantityChanged) { "Quantity changed is required" }
        requireNotNull(quantityBefore) { "Quantity before is required" }
        requireNotNull(quantityAfter) { "Quantity after is required" }
        requireNotNull(sourceReference) { "Source reference is required" }
        requireNotNull(sourceType) { "Source type is required" }
        requireNotNull(performedBy) { "Performed by user is required" }

        // Validate quantity consist ency
        require(quantityAfter == quantityBefore!! + quantityChanged!!) {
            "Quantity after ($quantityAfter) must equal quantity before ($quantityBefore) + quantity changed ($quantityChanged)"
        }

        // Validate that quantity changed is not zero
        require(quantityChanged != 0) { "Quantity changed cannot be zero" }

        return InventoryAuditLog(
            product = product!!,
            branch = branch!!,
            tenant = tenant!!,
            transactionType = transactionType!!,
            quantityChanged = quantityChanged!!,
            quantityBefore = quantityBefore!!,
            quantityAfter = quantityAfter!!,
            unitCost = unitCost,
            sellingPrice = sellingPrice,
            batchNumber = batchNumber,
            expiryDate = expiryDate,
            sourceReference = sourceReference!!,
            sourceType = sourceType!!,
            performedBy = performedBy!!,
            notes = notes,
            isDuplicate = isDuplicate,
            duplicateReference = duplicateReference
        )
    }
}

/**
 * Extension function to create a new InventoryAuditLogBuilder instance.
 */
fun inventoryAuditLog(): InventoryAuditLogBuilder = InventoryAuditLogBuilder()

