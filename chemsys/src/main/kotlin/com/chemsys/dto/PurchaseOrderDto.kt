package com.chemsys.dto

import com.chemsys.entity.PurchaseOrderStatus
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.*

/**
 * Data Transfer Object for PurchaseOrder entities.
 * Used for API responses and requests.
 */
data class PurchaseOrderDto(
    val id: UUID,
    val poNumber: String,
    val title: String,
    val description: String?,
    val supplierId: UUID,
    val supplierName: String,
    val tenantId: UUID,
    val tenantName: String,
    val branchId: UUID,
    val branchName: String,
    val status: PurchaseOrderStatus,
    val totalAmount: BigDecimal,
    val taxAmount: BigDecimal?,
    val discountAmount: BigDecimal?,
    val grandTotal: BigDecimal,
    val paymentTerms: String?,
    val expectedDeliveryDate: LocalDate?,
    val actualDeliveryDate: LocalDate?,
    val notes: String?,
    val approvedBy: String?,
    val approvedAt: OffsetDateTime?,
    val createdBy: String,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime?,
    val lineItems: List<PurchaseOrderLineItemDto> = emptyList()
)

/**
 * Data Transfer Object for PurchaseOrderLineItem entities.
 */
data class PurchaseOrderLineItemDto(
    val id: UUID,
    val productId: UUID,
    val productName: String,
    val productBarcode: String?,
    val quantity: Int,
    val unitPrice: BigDecimal,
    val totalPrice: BigDecimal,
    val receivedQuantity: Int,
    val expectedDeliveryDate: LocalDate?,
    val notes: String?
)

/**
 * Request DTO for creating a new purchase order.
 */
data class CreatePurchaseOrderRequest(
    val title: String,
    val description: String? = null,
    val supplierId: UUID,
    val branchId: UUID,
    val paymentTerms: String? = null,
    val expectedDeliveryDate: LocalDate? = null,
    val notes: String? = null,
    val lineItems: List<CreatePurchaseOrderLineItemRequest> = emptyList()
)

/**
 * Request DTO for creating purchase order line items.
 */
data class CreatePurchaseOrderLineItemRequest(
    val productId: UUID,
    val quantity: Int,
    val unitPrice: BigDecimal,
    val expectedDeliveryDate: LocalDate? = null,
    val notes: String? = null
)

/**
 * Request DTO for updating an existing purchase order.
 */
data class UpdatePurchaseOrderRequest(
    val title: String? = null,
    val description: String? = null,
    val supplierId: UUID? = null,
    val branchId: UUID? = null,
    val paymentTerms: String? = null,
    val expectedDeliveryDate: LocalDate? = null,
    val notes: String? = null,
    val lineItems: List<UpdatePurchaseOrderLineItemRequest>? = null
)

/**
 * Request DTO for updating purchase order line items.
 */
data class UpdatePurchaseOrderLineItemRequest(
    val id: UUID? = null, // null for new items
    val productId: UUID? = null,
    val quantity: Int? = null,
    val unitPrice: BigDecimal? = null,
    val expectedDeliveryDate: LocalDate? = null,
    val notes: String? = null
)

/**
 * Response DTO for purchase order list with pagination and filtering.
 */
data class PurchaseOrderListResponse(
    val purchaseOrders: List<PurchaseOrderDto>,
    val totalCount: Long,
    val draftCount: Long,
    val pendingApprovalCount: Long,
    val approvedCount: Long,
    val deliveredCount: Long,
    val closedCount: Long
)

/**
 * DTO for purchase order search results.
 */
data class PurchaseOrderSearchResult(
    val purchaseOrders: List<PurchaseOrderDto>,
    val totalCount: Long,
    val searchQuery: String
)

/**
 * DTO for purchase order statistics and summary information.
 */
data class PurchaseOrderSummaryDto(
    val totalPurchaseOrders: Long,
    val totalValue: BigDecimal,
    val draftCount: Long,
    val pendingApprovalCount: Long,
    val approvedCount: Long,
    val deliveredCount: Long,
    val closedCount: Long,
    val overdueCount: Long,
    val statusBreakdown: Map<PurchaseOrderStatus, Long>,
    val monthlyTrend: List<MonthlyPurchaseOrderTrend>
)

/**
 * DTO for monthly purchase order trends.
 */
data class MonthlyPurchaseOrderTrend(
    val month: String,
    val year: Int,
    val count: Long,
    val totalValue: BigDecimal
)

/**
 * DTO for purchase order status change request.
 */
data class ChangePurchaseOrderStatusRequest(
    val newStatus: PurchaseOrderStatus,
    val notes: String? = null
)

/**
 * DTO for receiving goods against a purchase order.
 */
data class ReceiveGoodsRequest(
    val lineItems: List<ReceiveGoodsLineItemRequest>
)

/**
 * DTO for receiving goods for specific line items.
 */
data class ReceiveGoodsLineItemRequest(
    val lineItemId: UUID,
    val receivedQuantity: Int,
    val notes: String? = null
)

/**
 * DTO for purchase order approval request.
 */
data class ApprovePurchaseOrderRequest(
    val approvedBy: String,
    val notes: String? = null
)

/**
 * DTO for purchase order line item summary.
 */
data class PurchaseOrderLineItemSummaryDto(
    val productId: UUID,
    val productName: String,
    val totalQuantity: Int,
    val totalValue: BigDecimal,
    val averageUnitPrice: BigDecimal
)

/**
 * DTO for supplier purchase order summary.
 */
data class SupplierPurchaseOrderSummaryDto(
    val supplierId: UUID,
    val supplierName: String,
    val totalOrders: Long,
    val totalValue: BigDecimal,
    val averageOrderValue: BigDecimal,
    val lastOrderDate: OffsetDateTime?
)
