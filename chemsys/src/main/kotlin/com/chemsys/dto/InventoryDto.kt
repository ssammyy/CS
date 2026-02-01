package com.chemsys.dto

import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.*

/**
 * Data Transfer Object for Inventory entities.
 * Used for API responses and requests.
 */
data class InventoryDto(
    val id: UUID,
    val productId: UUID,
    val productName: String,
    val productGenericName: String?,
    val branchId: UUID,
    val branchName: String,
    val batchNumber: String?,
    val expiryDate: LocalDate?,
    val manufacturingDate: LocalDate?,
    val quantity: Int,
    val unitCost: BigDecimal?,
    val sellingPrice: BigDecimal?,
    val locationInBranch: String?,
    val isActive: Boolean,
    val lastRestocked: OffsetDateTime?,
    val daysUntilExpiry: Long?, // Calculated field
    val lowStockAlert: Boolean, // Whether quantity is below min stock level
    val expiringAlert: Boolean, // Whether expiring within 30 days
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime?
)

/**
 * Request DTO for creating new inventory.
 */
data class CreateInventoryRequest(
    val productId: UUID,
    val branchId: UUID,
    val batchNumber: String? = null,
    val expiryDate: LocalDate? = null,
    val manufacturingDate: LocalDate? = null,
    val quantity: Int,
    val unitCost: BigDecimal? = null,
    val sellingPrice: BigDecimal? = null,
    val supplierId: UUID? = null,
    val purchaseOrderNumber: String? = null,
    val locationInBranch: String? = null
)

/**
 * Request DTO for updating inventory.
 */
data class UpdateInventoryRequest(
    val quantity: Int? = null,
    val unitCost: BigDecimal? = null,
    val sellingPrice: BigDecimal? = null,
    val locationInBranch: String? = null,
    val isActive: Boolean? = null
)

/**
 * Request DTO for inventory adjustments.
 */
data class InventoryAdjustmentRequest(
    val productId: UUID,
    val branchId: UUID,
    val quantity: Int, // Positive for additions, negative for reductions
    val reason: String,
    val notes: String? = null,
    val batchNumber: String? = null,
    val expiryDate: LocalDate? = null
)

/**
 * Request DTO for inventory transfers between branches.
 */
data class InventoryTransferRequest(
    val productId: UUID,
    val fromBranchId: UUID,
    val toBranchId: UUID,
    val quantity: Int,
    val batchNumber: String? = null,
    val notes: String? = null
)

/**
 * Response DTO for inventory list with filtering.
 */
data class InventoryListResponse(
    val inventory: List<InventoryDto>,
    val totalCount: Long,
    val totalValue: BigDecimal,
    val lowStockCount: Long,
    val expiringCount: Long
)

/**
 * DTO for inventory alerts and notifications.
 */
data class InventoryAlertDto(
    val type: AlertType,
    val productId: UUID,
    val productName: String,
    val branchId: UUID,
    val branchName: String,
    val currentQuantity: Int,
    val threshold: Int?,
    val expiryDate: LocalDate?,
    val daysUntilExpiry: Long?,
    val severity: AlertSeverity
)

/**
 * Enum for different types of inventory alerts.
 */
enum class AlertType {
    LOW_STOCK,
    EXPIRING_SOON,
    EXPIRED,
    OVERSTOCK
}

/**
 * Enum for alert severity levels.
 */
enum class AlertSeverity {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL
}
