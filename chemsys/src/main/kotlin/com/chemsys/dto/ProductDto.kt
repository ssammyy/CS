package com.chemsys.dto

import com.chemsys.entity.Product
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

/**
 * Data Transfer Object for Product entities.
 * Used for API responses and requests.
 */
data class ProductDto(
    val id: UUID,
    val name: String,
    val genericName: String?,
    val description: String?,
    val strength: String?,
    val dosageForm: String?,
    val manufacturer: String?,
    val barcode: String?,
    val isActive: Boolean,
    val requiresPrescription: Boolean,
    val storageConditions: String?,
    val minStockLevel: Int,
    val maxStockLevel: Int?,
    val unitCost: BigDecimal?,
    val sellingPrice: BigDecimal?,
    val tenantId: UUID,
    val tenantName: String,
    val totalQuantity: Int, // Total quantity across all branches
    val lowStockAlert: Boolean, // Whether product is below min stock level
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime?
)

/**
 * Request DTO for creating a new product.
 */
data class CreateProductRequest(
    val name: String,
    val genericName: String? = null,
    val description: String? = null,
    val strength: String? = null,
    val dosageForm: String? = null,
    val manufacturer: String? = null,
    val barcode: String? = null,
    val requiresPrescription: Boolean = false,
    val storageConditions: String? = null,
    val minStockLevel: Int = 10,
    val maxStockLevel: Int? = null,
    val unitCost: BigDecimal? = null,
    val sellingPrice: BigDecimal? = null
)

/**
 * Request DTO for updating an existing product.
 */
data class UpdateProductRequest(
    val name: String? = null,
    val genericName: String? = null,
    val description: String? = null,
    val strength: String? = null,
    val dosageForm: String? = null,
    val manufacturer: String? = null,
    val barcode: String? = null,
    val requiresPrescription: Boolean? = null,
    val storageConditions: String? = null,
    val minStockLevel: Int? = null,
    val maxStockLevel: Int? = null,
    val unitCost: BigDecimal? = null,
    val sellingPrice: BigDecimal? = null,
    val isActive: Boolean? = null
)

/**
 * Response DTO for product list with pagination.
 */
data class ProductListResponse(
    val products: List<ProductDto>,
    val totalCount: Long,
    val lowStockCount: Long,
    val expiringCount: Long
)

/**
 * DTO for product search results.
 */
data class ProductSearchResult(
    val products: List<ProductDto>,
    val totalCount: Long,
    val searchQuery: String
)
