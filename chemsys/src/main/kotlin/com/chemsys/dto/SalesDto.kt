package com.chemsys.dto

import com.chemsys.entity.*
import jakarta.validation.Valid
import jakarta.validation.constraints.*
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.*

/**
 * DTOs for Sales Management operations.
 * These DTOs handle data transfer between the frontend and backend for POS functionality.
 */

// ==================== Sale DTOs ====================

/**
 * Request DTO for creating a new sale transaction.
 * Contains all necessary information to process a point-of-sale transaction.
 */
data class CreateSaleRequest(
    @field:NotNull(message = "Branch ID is required")
    val branchId: UUID,

    @field:Valid
    @field:NotEmpty(message = "Sale must have at least one line item")
    val lineItems: List<CreateSaleLineItemRequest>,

    @field:Valid
    // Note: Payments can be empty for credit sales with no upfront payment
    // Validation is handled in SalesValidationService based on isCreditSale flag
    val payments: List<CreateSalePaymentRequest>,

    val customerId: UUID? = null,
    val isCreditSale: Boolean? = null,
    val customerName: String? = null,
    val customerPhone: String? = null,
    val taxAmount: BigDecimal? = null,
    val discountAmount: BigDecimal? = null,
    val notes: String? = null
)

/**
 * Request DTO for creating a sale line item.
 * Represents a single product being sold in a transaction.
 */
data class CreateSaleLineItemRequest(
    @field:NotNull(message = "Product ID is required")
    val productId: UUID,

    @field:NotNull(message = "Inventory ID is required")
    val inventoryId: UUID,

    @field:Min(value = 1, message = "Quantity must be at least 1")
    val quantity: Int,

    @field:NotNull(message = "Unit price is required")
    @field:DecimalMin(value = "0.0", inclusive = false, message = "Unit price must be greater than 0")
    val unitPrice: BigDecimal,

    val discountPercentage: BigDecimal? = null,
    val discountAmount: BigDecimal? = null,
    val taxPercentage: BigDecimal? = null,
    val taxAmount: BigDecimal? = null,
    val notes: String? = null
)

/**
 * Request DTO for creating a sale payment.
 * Represents a payment method and amount for a sale transaction.
 */
data class CreateSalePaymentRequest(
    @field:NotNull(message = "Payment method is required")
    val paymentMethod: PaymentMethod,

    @field:NotNull(message = "Amount is required")
    @field:DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    val amount: BigDecimal,

    val referenceNumber: String? = null,
    val notes: String? = null
)

/**
 * Response DTO for sale information.
 * Contains complete sale details including line items and payments.
 */
data class SaleDto(
    val id: UUID,
    val saleNumber: String,
    val branchId: UUID,
    val branchName: String,
    val customerId: UUID?,
    val customerName: String?,
    val customerPhone: String?,
    val subtotal: BigDecimal,
    val taxAmount: BigDecimal?,
    val discountAmount: BigDecimal?,
    val totalAmount: BigDecimal,
    val status: SaleStatus,
    val notes: String?,
    val cashierId: UUID,
    val cashierName: String,
    val saleDate: OffsetDateTime,
    val createdAt: OffsetDateTime,
    val returnStatus: SaleReturnStatus,
    val isCreditSale: Boolean,
    val lineItems: List<SaleLineItemDto>,
    val payments: List<SalePaymentDto>,
    /** Cashier commission (15% of profit) for this sale. Only set when listing sales for the cashier's own view. */
    val commission: BigDecimal? = null
)

/**
 * Response DTO for sale line item information.
 */
data class SaleLineItemDto(
    val id: UUID,
    val productId: UUID,
    val productName: String,
    val productBarcode: String?,
    val inventoryId: UUID,
    val quantity: Int,
    val returnedQuantity: Int,
    val unitPrice: BigDecimal,
    val discountPercentage: BigDecimal?,
    val discountAmount: BigDecimal?,
    val taxPercentage: BigDecimal?,
    val taxAmount: BigDecimal?,
    val lineTotal: BigDecimal,
    val batchNumber: String?,
    val expiryDate: LocalDate?,
    val notes: String?
)

/**
 * Response DTO for sale payment information.
 */
data class SalePaymentDto(
    val id: UUID,
    val paymentMethod: PaymentMethod,
    val amount: BigDecimal,
    val referenceNumber: String?,
    val notes: String?,
    val createdAt: OffsetDateTime
)

// ==================== Customer DTOs ====================

/**
 * Request DTO for creating a new customer.
 */
data class CreateCustomerRequest(
    @field:NotBlank(message = "First name is required")
    @field:Size(max = 255, message = "First name must not exceed 255 characters")
    val firstName: String,

    /** Optional last name; stored as empty string when not provided. */
    @field:Size(max = 255, message = "Last name must not exceed 255 characters")
    val lastName: String? = null,

    val phone: String? = null
)

/**
 * Request DTO for updating customer information.
 */
data class UpdateCustomerRequest(
    @field:NotBlank(message = "First name is required")
    @field:Size(max = 255, message = "First name must not exceed 255 characters")
    val firstName: String,

    @field:NotBlank(message = "Last name is required")
    @field:Size(max = 255, message = "Last name must not exceed 255 characters")
    val lastName: String,

    val phone: String? = null,
    val isActive: Boolean = true
)

/**
 * Response DTO for customer information.
 */
data class CustomerDto(
    val id: UUID,
    val customerNumber: String,
    val firstName: String,
    val lastName: String,
    val phone: String?,
    val email: String?,
    val dateOfBirth: LocalDate?,
    val address: String?,
    val insuranceProvider: String?,
    val insuranceNumber: String?,
    val isActive: Boolean,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime?
)

// ==================== Sale Return DTOs ====================

/**
 * Request DTO for creating a sale return.
 */
data class CreateSaleReturnRequest(
    @field:NotNull(message = "Original sale ID is required")
    val originalSaleId: UUID,

    @field:NotBlank(message = "Return reason is required")
    @field:Size(max = 500, message = "Return reason must not exceed 500 characters")
    val returnReason: String,

    @field:Valid
    @field:NotEmpty(message = "Return must have at least one line item")
    val returnLineItems: List<CreateSaleReturnLineItemRequest>,

    val notes: String? = null
)

/**
 * Request DTO for creating a sale return line item.
 */
data class CreateSaleReturnLineItemRequest(
    @field:NotNull(message = "Original sale line item ID is required")
    val originalSaleLineItemId: UUID,

    @field:Min(value = 1, message = "Quantity returned must be at least 1")
    val quantityReturned: Int,

    @field:NotNull(message = "Unit price is required")
    @field:DecimalMin(value = "0.0", inclusive = false, message = "Unit price must be greater than 0")
    val unitPrice: BigDecimal,

    val restoreToInventory: Boolean = true,
    val notes: String? = null
)

/**
 * Response DTO for sale return information.
 */
data class SaleReturnDto(
    val id: UUID,
    val returnNumber: String,
    val originalSaleId: UUID,
    val originalSaleNumber: String,
    val branchId: UUID,
    val branchName: String,
    val returnReason: String,
    val totalRefundAmount: BigDecimal,
    val status: ReturnStatus,
    val notes: String?,
    val processedById: UUID,
    val processedByName: String,
    val returnDate: OffsetDateTime,
    val createdAt: OffsetDateTime,
    val returnLineItems: List<SaleReturnLineItemDto>
)

/**
 * Response DTO for sale return line item information.
 */
data class SaleReturnLineItemDto(
    val id: UUID,
    val originalSaleLineItemId: UUID,
    val productId: UUID,
    val productName: String,
    val quantityReturned: Int,
    val unitPrice: BigDecimal,
    val refundAmount: BigDecimal,
    val restoreToInventory: Boolean,
    val notes: String?
)

// ==================== Search and List DTOs ====================

/**
 * Request DTO for searching sales.
 */
data class SearchSalesRequest(
    val branchId: UUID? = null,
    val customerId: UUID? = null,
    val cashierId: UUID? = null,
    val status: SaleStatus? = null,
    val paymentMethod: PaymentMethod? = null,
    /** Start date (YYYY-MM-DD or ISO-8601). Inclusive - start of day. */
    val startDate: String? = null,
    /** End date (YYYY-MM-DD or ISO-8601). Inclusive - end of day. */
    val endDate: String? = null,
    val saleNumber: String? = null,
    val customerName: String? = null,
    val productId: UUID? = null,
    val minAmount: BigDecimal? = null,
    val maxAmount: BigDecimal? = null,
    val page: Int = 0,
    val size: Int = 20,
    val sortBy: String = "saleDate",
    val sortDirection: String = "DESC"
)

/**
 * Response DTO for sales list with pagination.
 * @param totalFilteredAmount Sum of totalAmount for all sales matching the filter (across all pages)
 */
data class SalesListResponse(
    val sales: List<SaleDto>,
    val totalElements: Long,
    val totalPages: Int,
    val currentPage: Int,
    val pageSize: Int,
    val hasNext: Boolean,
    val hasPrevious: Boolean,
    val totalFilteredAmount: java.math.BigDecimal? = null
)

/**
 * Request DTO for searching customers.
 */
data class SearchCustomersRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val customerNumber: String? = null,
    val isActive: Boolean? = null,
    val page: Int = 0,
    val size: Int = 20,
    val sortBy: String = "createdAt",
    val sortDirection: String = "DESC"
)

/**
 * Response DTO for customers list with pagination.
 */
data class CustomersListResponse(
    val customers: List<CustomerDto>,
    val totalElements: Long,
    val totalPages: Int,
    val currentPage: Int,
    val pageSize: Int,
    val hasNext: Boolean,
    val hasPrevious: Boolean
)

// ==================== POS Operation DTOs ====================

/**
 * Request DTO for suspending a sale transaction.
 */
data class SuspendSaleRequest(
    @field:NotNull(message = "Sale ID is required")
    val saleId: UUID,

    val notes: String? = null
)

/**
 * Request DTO for resuming a suspended sale transaction.
 */
data class ResumeSaleRequest(
    @field:NotNull(message = "Sale ID is required")
    val saleId: UUID
)

/**
 * Request DTO for cancelling a sale transaction.
 */
data class CancelSaleRequest(
    @field:NotNull(message = "Sale ID is required")
    val saleId: UUID,

    @field:NotBlank(message = "Cancellation reason is required")
    val reason: String
)

/**
 * Request DTO for applying discount to a sale.
 */
data class ApplyDiscountRequest(
    @field:NotNull(message = "Sale ID is required")
    val saleId: UUID,

    @field:NotNull(message = "Discount amount is required")
    @field:DecimalMin(value = "0.0", message = "Discount amount must be non-negative")
    val discountAmount: BigDecimal,

    val notes: String? = null
)

/**
 * Response DTO for sale summary information (for dashboard/reports).
 */
data class SaleSummaryDto(
    val totalSales: Int,
    val totalAmount: BigDecimal,
    val totalTax: BigDecimal,
    val totalDiscount: BigDecimal,
    val averageSaleAmount: BigDecimal,
    val topSellingProducts: List<ProductSalesSummaryDto>,
    val salesByPaymentMethod: Map<PaymentMethod, BigDecimal>,
    val salesByHour: Map<Int, Int>
)

/**
 * Response DTO for product sales summary.
 */
data class ProductSalesSummaryDto(
    val productId: UUID,
    val productName: String,
    val totalQuantitySold: Int,
    val totalRevenue: BigDecimal,
    val averagePrice: BigDecimal
)

/**
 * Request DTO for barcode scanning in POS.
 */
data class BarcodeScanRequest(
    @field:NotBlank(message = "Barcode is required")
    val barcode: String,

    @field:NotNull(message = "Branch ID is required")
    val branchId: UUID
)

/**
 * Response DTO for barcode scan result.
 */
data class BarcodeScanResponse(
    val productId: UUID,
    val productName: String,
    val barcode: String,
    val availableInventory: List<InventoryItemDto>,
    val sellingPrice: BigDecimal?,
    val requiresPrescription: Boolean
)

/**
 * Response DTO for inventory item information.
 */
data class InventoryItemDto(
    val inventoryId: UUID,
    val batchNumber: String?,
    val expiryDate: LocalDate?,
    val quantity: Int,
    val unitCost: BigDecimal?,
    val sellingPrice: BigDecimal?
)

// ==================== Sale Edit Request (Maker-Checker) DTOs ====================

data class CreateSaleEditRequestDto(
    val saleId: UUID,
    val saleLineItemId: UUID,
    val requestType: String,
    val newUnitPrice: BigDecimal? = null,
    val reason: String? = null
)

data class SaleEditRequestDto(
    val id: UUID,
    val saleId: UUID,
    val saleNumber: String,
    val saleLineItemId: UUID?,
    val productName: String?,
    val requestType: String,
    val status: String,
    val currentUnitPrice: BigDecimal?,
    val newUnitPrice: BigDecimal?,
    val quantity: Int?,
    val reason: String?,
    val requestedById: UUID,
    val requestedByName: String,
    val requestedAt: OffsetDateTime,
    val approvedById: UUID?,
    val approvedByName: String?,
    val approvedAt: OffsetDateTime?,
    val rejectionReason: String?
)data class ApproveRejectSaleEditRequestDto(
    val approved: Boolean,
    val rejectionReason: String? = null
)