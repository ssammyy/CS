package com.chemsys.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.*

/**
 * PurchaseOrder entity represents a procurement order in the system.
 * Links suppliers with products and tracks the complete procurement workflow.
 * Each PO has line items for individual products and tracks status changes.
 */
@Entity
@Table(name = "purchase_orders")
data class PurchaseOrder(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "po_number", nullable = false, unique = true)
    val poNumber: String,

    @Column(name = "title", nullable = false)
    val title: String,

    @Column(name = "description", columnDefinition = "TEXT")
    val description: String?,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    val supplier: Supplier,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant:  Tenant,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    val branch: Branch,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    val status: PurchaseOrderStatus = PurchaseOrderStatus.DRAFT,

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    val totalAmount: BigDecimal = BigDecimal.ZERO,

    @Column(name = "tax_amount", precision = 15, scale = 2)
    val taxAmount: BigDecimal?,

    @Column(name = "discount_amount", precision = 15, scale = 2)
    val discountAmount: BigDecimal?,

    @Column(name = "grand_total", nullable = false, precision = 15, scale = 2)
    val grandTotal: BigDecimal = BigDecimal.ZERO,

    @Column(name = "payment_terms")
    val paymentTerms: String?,

    @Column(name = "expected_delivery_date")
    val expectedDeliveryDate: LocalDate?,

    @Column(name = "actual_delivery_date")
    val actualDeliveryDate: LocalDate?,

    @Column(name = "notes", columnDefinition = "TEXT")
    val notes: String?,

    @Column(name = "approved_by")
    val approvedBy: String?,

    @Column(name = "approved_at")
    val approvedAt: OffsetDateTime?,

    @Column(name = "created_by", nullable = false)
    val createdBy: String,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
)

/**
 * PurchaseOrderLineItem entity represents individual products in a purchase order.
 * Links products with quantities, prices, and delivery information.
 */
@Entity
@Table(name = "purchase_order_line_items")
data class PurchaseOrderLineItem(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    val purchaseOrder: PurchaseOrder,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    val product: Product,

    @Column(name = "quantity", nullable = false)
    val quantity: Int,

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    val unitPrice: BigDecimal,

    @Column(name = "total_price", nullable = false, precision = 15, scale = 2)
    val totalPrice: BigDecimal,

    @Column(name = "received_quantity", nullable = false)
    val receivedQuantity: Int = 0,

    @Column(name = "expected_delivery_date")
    val expectedDeliveryDate: LocalDate?,

    @Column(name = "notes")
    val notes: String?,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
)

/**
 * PurchaseOrderStatus enumeration defines the workflow states for purchase orders.
 * DRAFT → PENDING_APPROVAL → APPROVED → DELIVERED → CLOSED
 */
enum class PurchaseOrderStatus {
    DRAFT,              // Initial state, can be edited
    PENDING_APPROVAL,   // Submitted for approval
    APPROVED,           // Approved and ready for processing
    DELIVERED,          // Goods received
    CLOSED,            // Order completed
    CANCELLED          // Order cancelled
}

/**
 * PurchaseOrderHistory entity tracks all status changes and modifications.
 * Provides audit trail for compliance and tracking purposes.
 */
@Entity
@Table(name = "purchase_order_history")
data class PurchaseOrderHistory(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    val purchaseOrder: PurchaseOrder,

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status")
    val previousStatus: PurchaseOrderStatus?,

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false)
    val newStatus: PurchaseOrderStatus,

    @Column(name = "action", nullable = false)
    val action: String,

    @Column(name = "description", columnDefinition = "TEXT")
    val description: String?,

    @Column(name = "performed_by", nullable = false)
    val performedBy: String,

    @Column(name = "performed_at", nullable = false)
    val performedAt: OffsetDateTime = OffsetDateTime.now()
)
