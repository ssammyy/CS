package com.chemsys.dto

import com.chemsys.entity.Supplier
import com.chemsys.entity.SupplierCategory
import com.chemsys.entity.SupplierStatus
import java.time.OffsetDateTime
import java.util.*

/**
 * Data Transfer Object for Supplier entities.
 * Used for API responses and requests.
 */
data class SupplierDto(
    val id: UUID,
    val name: String,
    val contactPerson: String?,
    val phone: String?,
    val email: String?,
    val physicalAddress: String?,
    val paymentTerms: String?,
    val category: SupplierCategory,
    val status: SupplierStatus,
    val taxIdentificationNumber: String?,
    val bankAccountDetails: String?,
    val creditLimit: Double?,
    val notes: String?,
    val tenantId: UUID,
    val tenantName: String,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime?
)

/**
 * Request DTO for creating a new supplier.
 */
data class CreateSupplierRequest(
    val name: String,
    val contactPerson: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val physicalAddress: String? = null,
    val paymentTerms: String? = null,
    val category: SupplierCategory = SupplierCategory.WHOLESALER,
    val status: SupplierStatus = SupplierStatus.ACTIVE,
    val taxIdentificationNumber: String? = null,
    val bankAccountDetails: String? = null,
    val creditLimit: Double? = null,
    val notes: String? = null
)

/**
 * Request DTO for updating an existing supplier.
 */
data class UpdateSupplierRequest(
    val name: String? = null,
    val contactPerson: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val physicalAddress: String? = null,
    val paymentTerms: String? = null,
    val category: SupplierCategory? = null,
    val status: SupplierStatus? = null,
    val taxIdentificationNumber: String? = null,
    val bankAccountDetails: String? = null,
    val creditLimit: Double? = null,
    val notes: String? = null
)

/**
 * Response DTO for supplier list with pagination and filtering.
 */
data class SupplierListResponse(
    val suppliers: List<SupplierDto>,
    val totalCount: Long,
    val activeCount: Long,
    val inactiveCount: Long,
    val categoryBreakdown: Map<SupplierCategory, Long>
)

/**
 * DTO for supplier search results.
 */
data class SupplierSearchResult(
    val suppliers: List<SupplierDto>,
    val totalCount: Long,
    val searchQuery: String
)

/**
 * DTO for supplier statistics and summary information.
 */
data class SupplierSummaryDto(
    val totalSuppliers: Long,
    val activeSuppliers: Long,
    val inactiveSuppliers: Long,
    val categoryBreakdown: Map<SupplierCategory, Long>,
    val statusBreakdown: Map<SupplierStatus, Long>
)

/**
 * DTO for supplier category information.
 */
data class SupplierCategoryDto(
    val category: SupplierCategory,
    val displayName: String,
    val description: String,
    val supplierCount: Long
)

/**
 * DTO for supplier status information.
 */
data class SupplierStatusDto(
    val status: SupplierStatus,
    val displayName: String,
    val description: String,
    val supplierCount: Long
)


