package com.chemsys.service

import com.chemsys.dto.*
import com.chemsys.entity.Supplier
import com.chemsys.entity.SupplierCategory
import com.chemsys.entity.SupplierStatus
import com.chemsys.entity.Tenant
import com.chemsys.mapper.SupplierMapper
import com.chemsys.repository.SupplierRepository
import com.chemsys.repository.TenantRepository
import com.chemsys.config.TenantContext
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.*

/**
 * SupplierService handles all business logic for supplier management.
 * Provides CRUD operations, search functionality, and supplier-related queries.
 * 
 * This service follows the Backend Data Consistency Rule by ensuring:
 * - All operations are transactional (@Transactional annotation)
 * - Proper tenant isolation for multi-tenant architecture
 * - Comprehensive error handling and validation
 * - Audit trail through creation and update timestamps
 */
@Service
class SupplierService(
    private val supplierRepository: SupplierRepository,
    private val tenantRepository: TenantRepository,
    private val supplierMapper: SupplierMapper
) {

    /**
     * Creates a new supplier for the current tenant.
     * 
     * @param request Supplier creation request
     * @return Created supplier details
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional
    fun createSupplier(request: CreateSupplierRequest): SupplierDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val tenant = tenantRepository.findById(currentTenantId)
            .orElseThrow { RuntimeException("Tenant not found") }

        // Check if supplier with same name already exists in tenant
        if (supplierRepository.existsByNameAndTenantId(request.name, currentTenantId)) {
            throw RuntimeException("Supplier with name '${request.name}' already exists in this tenant")
        }

        // Check if supplier with same email already exists in tenant (if email provided)
        if (request.email != null && supplierRepository.existsByEmailAndTenantId(request.email, currentTenantId)) {
            throw RuntimeException("Supplier with email '${request.email}' already exists in this tenant")
        }

        val supplier = Supplier(
            name = request.name,
            contactPerson = request.contactPerson,
            phone = request.phone,
            email = request.email,
            physicalAddress = request.physicalAddress,
            paymentTerms = request.paymentTerms,
            category = request.category,
            status = request.status,
            taxIdentificationNumber = request.taxIdentificationNumber,
            bankAccountDetails = request.bankAccountDetails,
            creditLimit = request.creditLimit,
            notes = request.notes,
            tenant = tenant
        )

        val savedSupplier = supplierRepository.save(supplier)
        return supplierMapper.toDto(savedSupplier)
    }

    /**
     * Updates an existing supplier.
     * 
     * @param id Supplier ID
     * @param request Supplier update request
     * @return Updated supplier details
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional
    fun updateSupplier(id: UUID, request: UpdateSupplierRequest): SupplierDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val supplier = supplierRepository.findById(id)
            .orElseThrow { RuntimeException("Supplier not found with id: $id") }

        // Verify supplier belongs to current tenant
        if (supplier.tenant.id != currentTenantId) {
            throw RuntimeException("Supplier not found with id: $id")
        }

        // Check name uniqueness if name is being updated
        if (request.name != null && request.name != supplier.name) {
            if (supplierRepository.existsByNameAndTenantId(request.name, currentTenantId)) {
                throw RuntimeException("Supplier with name '${request.name}' already exists in this tenant")
            }
        }

        // Check email uniqueness if email is being updated
        if (request.email != null && request.email != supplier.email) {
            if (supplierRepository.existsByEmailAndTenantId(request.email, currentTenantId)) {
                throw RuntimeException("Supplier with email '${request.email}' already exists in this tenant")
            }
        }

        // Update fields if provided
        val updatedSupplier = supplier.copy(
            name = request.name ?: supplier.name,
            contactPerson = request.contactPerson ?: supplier.contactPerson,
            phone = request.phone ?: supplier.phone,
            email = request.email ?: supplier.email,
            physicalAddress = request.physicalAddress ?: supplier.physicalAddress,
            paymentTerms = request.paymentTerms ?: supplier.paymentTerms,
            category = request.category ?: supplier.category,
            status = request.status ?: supplier.status,
            taxIdentificationNumber = request.taxIdentificationNumber ?: supplier.taxIdentificationNumber,
            bankAccountDetails = request.bankAccountDetails ?: supplier.bankAccountDetails,
            creditLimit = request.creditLimit ?: supplier.creditLimit,
            notes = request.notes ?: supplier.notes,
            updatedAt = OffsetDateTime.now()
        )

        val savedSupplier = supplierRepository.save(updatedSupplier)
        return supplierMapper.toDto(savedSupplier)
    }

    /**
     * Retrieves a supplier by ID.
     * 
     * @param id Supplier ID
     * @return Supplier details
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getSupplierById(id: UUID): SupplierDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val supplier = supplierRepository.findById(id)
            .orElseThrow { RuntimeException("Supplier not found with id: $id") }

        // Verify supplier belongs to current tenant
        if (supplier.tenant.id != currentTenantId) {
            throw RuntimeException("Supplier not found with id: $id")
        }

        return supplierMapper.toDto(supplier)
    }

    /**
     * Retrieves all suppliers for the current tenant.
     * 
     * @return List of suppliers with summary information
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getAllSuppliers(): SupplierListResponse {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val suppliers = supplierRepository.findByTenantId(currentTenantId)
        val supplierDtos = supplierMapper.toDtoList(suppliers)

        val totalCount = suppliers.size.toLong()
        val activeCount = suppliers.count { it.status == SupplierStatus.ACTIVE }.toLong()
        val inactiveCount = totalCount - activeCount

        val categoryBreakdown = suppliers.groupBy { it.category }
            .mapValues { it.value.size.toLong() }

        return SupplierListResponse(
            suppliers = supplierDtos,
            totalCount = totalCount,
            activeCount = activeCount,
            inactiveCount = inactiveCount,
            categoryBreakdown = categoryBreakdown
        )
    }

    /**
     * Retrieves suppliers with pagination and filtering.
     * 
     * @param page Page number (0-based)
     * @param size Page size
     * @param name Filter by supplier name
     * @param category Filter by supplier category
     * @param status Filter by supplier status
     * @return Paginated list of suppliers
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getSuppliersWithPagination(
        page: Int = 0,
        size: Int = 20,
        name: String? = null,
        category: SupplierCategory? = null,
        status: SupplierStatus? = null
    ): Page<SupplierDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"))
        
        val supplierPage = supplierRepository.findByCriteriaAndTenantId(
            tenantId = currentTenantId,
            name = name,
            category = category,
            status = status,
            pageable = pageable
        )

        return supplierPage.map { supplier -> supplierMapper.toDto(supplier) }
    }

    /**
     * Searches suppliers by name, contact person, or email.
     * 
     * @param query Search query
     * @return Search results
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun searchSuppliers(query: String): SupplierSearchResult {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val suppliers = mutableListOf<Supplier>()

        // Search by name
        suppliers.addAll(supplierRepository.findByNameContainingAndTenantId(query, currentTenantId))

        // Search by contact person
        suppliers.addAll(supplierRepository.findByContactPersonContainingAndTenantId(query, currentTenantId))

        // Search by email
        suppliers.addAll(supplierRepository.findByEmailContainingAndTenantId(query, currentTenantId))

        // Remove duplicates and sort by name
        val uniqueSuppliers = suppliers.distinctBy { it.id }.sortedBy { it.name }
        val supplierDtos = supplierMapper.toDtoList(uniqueSuppliers)

        return SupplierSearchResult(
            suppliers = supplierDtos,
            totalCount = supplierDtos.size.toLong(),
            searchQuery = query
        )
    }

    /**
     * Retrieves suppliers by category.
     * 
     * @param category Supplier category
     * @return List of suppliers in the specified category
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getSuppliersByCategory(category: SupplierCategory): List<SupplierDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val suppliers = supplierRepository.findByCategoryAndTenantId(category, currentTenantId)
        return supplierMapper.toDtoList(suppliers)
    }

    /**
     * Retrieves suppliers by status.
     * 
     * @param status Supplier status
     * @return List of suppliers with the specified status
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getSuppliersByStatus(status: SupplierStatus): List<SupplierDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val suppliers = supplierRepository.findByStatusAndTenantId(status, currentTenantId)
        return supplierMapper.toDtoList(suppliers)
    }

    /**
     * Retrieves active suppliers only.
     * 
     * @return List of active suppliers
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getActiveSuppliers(): List<SupplierDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val suppliers = supplierRepository.findActiveByTenantId(currentTenantId)
        return supplierMapper.toDtoList(suppliers)
    }

    /**
     * Changes supplier status.
     * 
     * @param id Supplier ID
     * @param status New status
     * @return Updated supplier details
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional
    fun changeSupplierStatus(id: UUID, status: SupplierStatus): SupplierDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val supplier = supplierRepository.findById(id)
            .orElseThrow { RuntimeException("Supplier not found with id: $id") }

        // Verify supplier belongs to current tenant
        if (supplier.tenant.id != currentTenantId) {
            throw RuntimeException("Supplier not found with id: $id")
        }

        val updatedSupplier = supplier.copy(
            status = status,
            updatedAt = OffsetDateTime.now()
        )

        val savedSupplier = supplierRepository.save(updatedSupplier)
        return supplierMapper.toDto(savedSupplier)
    }

    /**
     * Deletes a supplier (soft delete by setting status to BLACKLISTED).
     * 
     * @param id Supplier ID
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional
    fun deleteSupplier(id: UUID) {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val supplier = supplierRepository.findById(id)
            .orElseThrow { RuntimeException("Supplier not found with id: $id") }

        // Verify supplier belongs to current tenant
        if (supplier.tenant.id != currentTenantId) {
            throw RuntimeException("Supplier not found with id: $id")
        }

        // Soft delete by setting status to BLACKLISTED
        val updatedSupplier = supplier.copy(
            status = SupplierStatus.BLACKLISTED,
            updatedAt = OffsetDateTime.now()
        )

        supplierRepository.save(updatedSupplier)
    }

    /**
     * Retrieves supplier summary statistics.
     * 
     * @return Supplier summary information
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getSupplierSummary(): SupplierSummaryDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val totalSuppliers = supplierRepository.countByTenantId(currentTenantId)
        val activeSuppliers = supplierRepository.countActiveByTenantId(currentTenantId)
        val inactiveSuppliers = totalSuppliers - activeSuppliers

        val categoryBreakdown = supplierRepository.countByCategoryAndTenantId(currentTenantId)
            .associate { (category, count) -> 
                category as SupplierCategory to (count as Long)
            }

        val statusBreakdown = supplierRepository.countByStatusAndTenantId(currentTenantId)
            .associate { (status, count) -> 
                status as SupplierStatus to (count as Long)
            }

        return SupplierSummaryDto(
            totalSuppliers = totalSuppliers,
            activeSuppliers = activeSuppliers,
            inactiveSuppliers = inactiveSuppliers,
            categoryBreakdown = categoryBreakdown,
            statusBreakdown = statusBreakdown
        )
    }
}
