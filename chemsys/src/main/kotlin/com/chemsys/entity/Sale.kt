package com.chemsys.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

/**
 * Sale entity represents a point-of-sale transaction in the pharmacy.
 * It tracks the sale details, customer information, payment methods, and totals.
 * 
 * This entity follows the Backend Data Consistency Rule by ensuring:
 * - All sales are linked to a specific tenant and branch for proper isolation
 * - Audit trail through creation timestamps and user tracking
 * - Proper relationships with inventory for stock deduction tracking
 */
@Entity
@Table(name = "sales")
data class Sale(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "sale_number", nullable = false, unique = true)
    val saleNumber: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    val branch: Branch,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    val customer: Customer?,

    @Column(name = "customer_name")
    val customerName: String?,

    @Column(name = "customer_phone")
    val customerPhone: String?,

    @Column(name = "subtotal", nullable = false, precision = 15, scale = 2)
    val subtotal: BigDecimal,

    @Column(name = "tax_amount", precision = 15, scale = 2)
    val taxAmount: BigDecimal?,

    @Column(name = "discount_amount", precision = 15, scale = 2)
    val discountAmount: BigDecimal?,

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    val totalAmount: BigDecimal,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    val status: SaleStatus = SaleStatus.COMPLETED,

    @Column(name = "notes", columnDefinition = "TEXT")
    val notes: String?,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cashier_id", nullable = false)
    val cashier: User,

    @Column(name = "sale_date", nullable = false)
    val saleDate: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "return_status", nullable = false)
    val returnStatus: SaleReturnStatus = SaleReturnStatus.NONE,

    @Column(name = "is_credit_sale", nullable = false)
    val isCreditSale: Boolean = false,

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_classification", nullable = false)
    val taxClassification: TaxClassification = TaxClassification.STANDARD,

    // One-to-many relationship with sale line items
    @OneToMany(mappedBy = "sale", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val lineItems: MutableList<SaleLineItem> = mutableListOf(),

    // One-to-many relationship with payments
    @OneToMany(mappedBy = "sale", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val payments: MutableList<SalePayment> = mutableListOf()
) {
    /**
     * Computed property to check if this sale is a credit sale.
     * This method returns the stored database value for efficiency.
     * The field is automatically set when payments are processed.
     * 
     * @return true if the sale is a credit sale, false otherwise
     */


    /**
     * Helper method to determine if a sale should be marked as credit sale based on payments.
     * This is used during sale creation to set the isCreditSale field.
     * 
     * @param payments The list of payments for the sale
     * @return true if any payment method is CREDIT, false otherwise
     */
    fun determineCreditSaleStatus(payments: List<SalePayment>): Boolean {
        return payments.any { it.paymentMethod == PaymentMethod.CREDIT }
    }
}

/**
 * SaleLineItem entity represents individual products sold in a transaction.
 * It links to inventory batches for proper stock tracking and audit trail.
 */
@Entity
@Table(name = "sale_line_items")
data class SaleLineItem(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", nullable = false)
    val sale: Sale,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    val product: Product,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_id", nullable = false)
    val inventory: Inventory,

    @Column(name = "quantity", nullable = false)
    val quantity: Int,

    @Column(name = "returned_quantity", nullable = false)
    val returnedQuantity: Int = 0,

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    val unitPrice: BigDecimal,

    @Column(name = "discount_percentage", precision = 5, scale = 2)
    val discountPercentage: BigDecimal?,

    @Column(name = "discount_amount", precision = 10, scale = 2)
    val discountAmount: BigDecimal?,

    @Column(name = "tax_percentage", precision = 5, scale = 2)
    val taxPercentage: BigDecimal?,

    @Column(name = "tax_amount", precision = 10, scale = 2)
    val taxAmount: BigDecimal?,

    @Column(name = "line_total", nullable = false, precision = 10, scale = 2)
    val lineTotal: BigDecimal,

    @Column(name = "batch_number")
    val batchNumber: String?,

    @Column(name = "expiry_date")
    val expiryDate: java.time.LocalDate?,

    @Column(name = "notes")
    val notes: String?,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now()
)

/**
 * SalePayment entity tracks payment methods and amounts for a sale.
 * Supports multiple payment methods per transaction (e.g., partial cash + card).
 */
@Entity
@Table(name = "sale_payments")
data class SalePayment(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", nullable = false)
    val sale: Sale,

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    val paymentMethod: PaymentMethod,

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    val amount: BigDecimal,

    @Column(name = "reference_number")
    val referenceNumber: String?,

    @Column(name = "notes")
    val notes: String?,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now()
)

/**
 * SaleReturn entity tracks returned items from completed sales.
 * Links back to original sale and line items for proper audit trail.
 */
@Entity
@Table(name = "sale_returns")
data class SaleReturn(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "return_number", nullable = false, unique = true)
    val returnNumber: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", nullable = false)
    val originalSale: Sale,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    val branch: Branch,

    @Column(name = "return_reason", nullable = false)
    val returnReason: String,

    @Column(name = "total_refund_amount", nullable = false, precision = 15, scale = 2)
    val totalRefundAmount: BigDecimal,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    val status: ReturnStatus = ReturnStatus.PENDING,

    @Column(name = "notes", columnDefinition = "TEXT")
    val notes: String?,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by", nullable = false)
    val processedBy: User,

    @Column(name = "return_date", nullable = false)
    val returnDate: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null,

    // One-to-many relationship with return line items
    @OneToMany(mappedBy = "saleReturn", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val returnLineItems: MutableList<SaleReturnLineItem> = mutableListOf()
)

/**
 * SaleReturnLineItem entity represents individual items being returned.
 * Links to original sale line item and tracks inventory restoration.
 */
@Entity
@Table(name = "sale_return_line_items")
data class SaleReturnLineItem(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_return_id", nullable = false)
    val saleReturn: SaleReturn,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_sale_line_item_id", nullable = false)
    val originalSaleLineItem: SaleLineItem,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    val product: Product,

    @Column(name = "quantity_returned", nullable = false)
    val quantityReturned: Int,

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    val unitPrice: BigDecimal,

    @Column(name = "refund_amount", nullable = false, precision = 10, scale = 2)
    val refundAmount: BigDecimal,

    @Column(name = "restore_to_inventory", nullable = false)
    val restoreToInventory: Boolean = true,

    @Column(name = "notes")
    val notes: String?,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now()
)

/**
 * Customer entity represents pharmacy customers for sales tracking.
 * Supports both registered customers and walk-in transactions.
 */
@Entity
@Table(name = "customers")
data class Customer(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "customer_number", nullable = false, unique = true)
    val customerNumber: String,

    @Column(name = "first_name", nullable = false)
    val firstName: String,

    @Column(name = "last_name", nullable = false)
    val lastName: String,

    @Column(name = "phone")
    val phone: String?,

    @Column(name = "email")
    val email: String?,

    @Column(name = "date_of_birth")
    val dateOfBirth: java.time.LocalDate?,

    @Column(name = "address", columnDefinition = "TEXT")
    val address: String?,

    @Column(name = "insurance_provider")
    val insuranceProvider: String?,

    @Column(name = "insurance_number")
    val insuranceNumber: String?,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,

    @Column(name = "is_active", nullable = false)
    val isActive: Boolean = true,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
)

/**
 * Enums for sales-related statuses and types
 */
enum class SaleStatus {
    PENDING,        // Sale is being processed
    COMPLETED,      // Sale is completed and paid
    CANCELLED,      // Sale was cancelled
    SUSPENDED,      // Sale is suspended (customer not ready to pay)
    REFUNDED        // Sale has been refunded
}

enum class PaymentMethod {
    CASH,           // Cash payment
    TILL,           // Till payment
    FAMILY_BANK,    // Family Bank
    WATU_SIMU,      // Watu simu
    MOGO,           // Mogo
    ONFON_N1,       // Onfon N1
    ONFON_N2,       // Onfon N2
    ONFON_GLEX,     // Onfon Glex
    CREDIT          // Credit/Account payment
}

enum class ReturnStatus {
    PENDING,        // Return is pending approval
    APPROVED,       // Return is approved
    PROCESSED,      // Return is processed and inventory restored
    REJECTED        // Return is rejected
}

enum class SaleReturnStatus {
    NONE,       // No returns for this sale
    PARTIAL,    // Some items have been returned
    FULL        // All items have been returned
}

