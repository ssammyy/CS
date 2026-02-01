package com.chemsys.controller

import com.chemsys.dto.*
import com.chemsys.entity.SupplierCategory
import com.chemsys.entity.SupplierStatus
import com.chemsys.service.SupplierService
import org.springframework.data.domain.Page
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

/**
 * REST controller for supplier management operations.
 * Provides endpoints for CRUD operations, search, filtering, and supplier-related queries.
 * 
 * All endpoints are secured and require appropriate authentication and authorization.
 * The controller follows RESTful conventions and provides comprehensive supplier management functionality.
 */
@RestController
@RequestMapping("/api/suppliers")
class SupplierController(
    private val supplierService: SupplierService
) {

    /**
     * Creates a new supplier.
     * 
     * @param request Supplier creation request
     * @return Created supplier details
     */
    @PostMapping
    fun createSupplier(@RequestBody request: CreateSupplierRequest): ResponseEntity<SupplierDto> {
        val supplier = supplierService.createSupplier(request)
        return ResponseEntity.ok(supplier)
    }

    /**
     * Retrieves all suppliers for the current tenant.
     * 
     * @return List of suppliers with summary information
     */
    @GetMapping
    fun getAllSuppliers(): ResponseEntity<SupplierListResponse> {
        val suppliers = supplierService.getAllSuppliers()
        return ResponseEntity.ok(suppliers)
    }

    /**
     * Retrieves a supplier by ID.
     * 
     * @param id Supplier ID
     * @return Supplier details
     */
    @GetMapping("/{id}")
    fun getSupplierById(@PathVariable id: UUID): ResponseEntity<SupplierDto> {
        val supplier = supplierService.getSupplierById(id)
        return ResponseEntity.ok(supplier)
    }

    /**
     * Updates an existing supplier.
     * 
     * @param id Supplier ID
     * @param request Supplier update request
     * @return Updated supplier details
     */
    @PutMapping("/{id}")
    fun updateSupplier(
        @PathVariable id: UUID,
        @RequestBody request: UpdateSupplierRequest
    ): ResponseEntity<SupplierDto> {
        val supplier = supplierService.updateSupplier(id, request)
        return ResponseEntity.ok(supplier)
    }

    /**
     * Deletes a supplier (soft delete).
     * 
     * @param id Supplier ID
     * @return No content response
     */
    @DeleteMapping("/{id}")
    fun deleteSupplier(@PathVariable id: UUID): ResponseEntity<Unit> {
        supplierService.deleteSupplier(id)
        return ResponseEntity.noContent().build()
    }

    /**
     * Searches suppliers by name, contact person, or email.
     * 
     * @param query Search query
     * @return Search results
     */
    @GetMapping("/search")
    fun searchSuppliers(@RequestParam query: String): ResponseEntity<SupplierSearchResult> {
        val results = supplierService.searchSuppliers(query)
        return ResponseEntity.ok(results)
    }

    /**
     * Retrieves suppliers with pagination and filtering.
     * 
     * @param page Page number (0-based, default: 0)
     * @param size Page size (default: 20)
     * @param name Filter by supplier name
     * @param category Filter by supplier category
     * @param status Filter by supplier status
     * @return Paginated list of suppliers
     */
    @GetMapping("/paginated")
    fun getSuppliersWithPagination(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) name: String?,
        @RequestParam(required = false) category: SupplierCategory?,
        @RequestParam(required = false) status: SupplierStatus?
    ): ResponseEntity<Page<SupplierDto>> {
        val suppliers = supplierService.getSuppliersWithPagination(
            page = page,
            size = size,
            name = name,
            category = category,
            status = status
        )
        return ResponseEntity.ok(suppliers)
    }

    /**
     * Retrieves suppliers by category.
     * 
     * @param category Supplier category
     * @return List of suppliers in the specified category
     */
    @GetMapping("/category/{category}")
    fun getSuppliersByCategory(@PathVariable category: SupplierCategory): ResponseEntity<List<SupplierDto>> {
        val suppliers = supplierService.getSuppliersByCategory(category)
        return ResponseEntity.ok(suppliers)
    }

    /**
     * Retrieves suppliers by status.
     * 
     * @param status Supplier status
     * @return List of suppliers with the specified status
     */
    @GetMapping("/status/{status}")
    fun getSuppliersByStatus(@PathVariable status: SupplierStatus): ResponseEntity<List<SupplierDto>> {
        val suppliers = supplierService.getSuppliersByStatus(status)
        return ResponseEntity.ok(suppliers)
    }

    /**
     * Retrieves active suppliers only.
     * 
     * @return List of active suppliers
     */
    @GetMapping("/active")
    fun getActiveSuppliers(): ResponseEntity<List<SupplierDto>> {
        val suppliers = supplierService.getActiveSuppliers()
        return ResponseEntity.ok(suppliers)
    }

    /**
     * Changes supplier status.
     * 
     * @param id Supplier ID
     * @param status New status
     * @return Updated supplier details
     */
    @PatchMapping("/{id}/status")
    fun changeSupplierStatus(
        @PathVariable id: UUID,
        @RequestParam status: SupplierStatus
    ): ResponseEntity<SupplierDto> {
        val supplier = supplierService.changeSupplierStatus(id, status)
        return ResponseEntity.ok(supplier)
    }

    /**
     * Retrieves supplier summary statistics.
     * 
     * @return Supplier summary information
     */
    @GetMapping("/summary")
    fun getSupplierSummary(): ResponseEntity<SupplierSummaryDto> {
        val summary = supplierService.getSupplierSummary()
        return ResponseEntity.ok(summary)
    }

    /**
     * Retrieves available supplier categories.
     * 
     * @return List of supplier categories with descriptions
     */
    @GetMapping("/categories")
    fun getSupplierCategories(): ResponseEntity<List<SupplierCategoryDto>> {
        val categories = SupplierCategory.values().map { category ->
            val displayName = when (category) {
                SupplierCategory.WHOLESALER -> "Wholesaler"
                SupplierCategory.MANUFACTURER -> "Manufacturer"
                SupplierCategory.DISTRIBUTOR -> "Distributor"
                SupplierCategory.IMPORTER -> "Importer"
                SupplierCategory.SPECIALTY -> "Specialty"
            }
            
            val description = when (category) {
                SupplierCategory.WHOLESALER -> "Sells products in bulk to retailers"
                SupplierCategory.MANUFACTURER -> "Produces the products directly"
                SupplierCategory.DISTRIBUTOR -> "Distributes products from manufacturers"
                SupplierCategory.IMPORTER -> "Imports products from foreign manufacturers"
                SupplierCategory.SPECIALTY -> "Specialized supplier for specific product types"
            }

            SupplierCategoryDto(
                category = category,
                displayName = displayName,
                description = description,
                supplierCount = 0 // This could be enhanced to show actual counts
            )
        }
        return ResponseEntity.ok(categories)
    }

    /**
     * Retrieves available supplier statuses.
     * 
     * @return List of supplier statuses with descriptions
     */
    @GetMapping("/statuses")
    fun getSupplierStatuses(): ResponseEntity<List<SupplierStatusDto>> {
        val statuses = SupplierStatus.values().map { status ->
            val displayName = when (status) {
                SupplierStatus.ACTIVE -> "Active"
                SupplierStatus.INACTIVE -> "Inactive"
                SupplierStatus.SUSPENDED -> "Suspended"
                SupplierStatus.BLACKLISTED -> "Blacklisted"
            }
            
            val description = when (status) {
                SupplierStatus.ACTIVE -> "Supplier is currently active and can be used for procurement"
                SupplierStatus.INACTIVE -> "Supplier is temporarily inactive"
                SupplierStatus.SUSPENDED -> "Supplier is suspended due to issues"
                SupplierStatus.BLACKLISTED -> "Supplier is blacklisted and should not be used"
            }

            SupplierStatusDto(
                status = status,
                displayName = displayName,
                description = description,
                supplierCount = 0 // This could be enhanced to show actual counts
            )
        }
        return ResponseEntity.ok(statuses)
    }
}


