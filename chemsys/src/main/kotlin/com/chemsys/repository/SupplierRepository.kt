package com.chemsys.repository

import com.chemsys.entity.Supplier
import com.chemsys.entity.SupplierCategory
import com.chemsys.entity.SupplierStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

/**
 * Repository for Supplier entity operations.
 * Provides methods for finding suppliers by various criteria within a tenant.
 */
@Repository
interface SupplierRepository : JpaRepository<Supplier, UUID> {

    /**
     * Find all suppliers for a specific tenant.
     */
    @Query("SELECT s FROM Supplier s WHERE s.tenant.id = :tenantId ORDER BY s.name")
    fun findByTenantId(@Param("tenantId") tenantId: UUID): List<Supplier>

    /**
     * Find suppliers by name within a tenant (case-insensitive search).
     */
    @Query("SELECT s FROM Supplier s WHERE s.tenant.id = :tenantId AND LOWER(s.name) LIKE LOWER(CONCAT('%', :name, '%')) ORDER BY s.name")
    fun findByNameContainingAndTenantId(@Param("name") name: String, @Param("tenantId") tenantId: UUID): List<Supplier>

    /**
     * Find suppliers by contact person within a tenant.
     */
    @Query("SELECT s FROM Supplier s WHERE s.tenant.id = :tenantId AND LOWER(s.contactPerson) LIKE LOWER(CONCAT('%', :contactPerson, '%')) ORDER BY s.name")
    fun findByContactPersonContainingAndTenantId(@Param("contactPerson") contactPerson: String, @Param("tenantId") tenantId: UUID): List<Supplier>

    /**
     * Find suppliers by email within a tenant.
     */
    @Query("SELECT s FROM Supplier s WHERE s.tenant.id = :tenantId AND LOWER(s.email) LIKE LOWER(CONCAT('%', :email, '%')) ORDER BY s.name")
    fun findByEmailContainingAndTenantId(@Param("email") email: String, @Param("tenantId") tenantId: UUID): List<Supplier>

    /**
     * Find suppliers by category within a tenant.
     */
    @Query("SELECT s FROM Supplier s WHERE s.tenant.id = :tenantId AND s.category = :category ORDER BY s.name")
    fun findByCategoryAndTenantId(@Param("category") category: SupplierCategory, @Param("tenantId") tenantId: UUID): List<Supplier>

    /**
     * Find suppliers by status within a tenant.
     */
    @Query("SELECT s FROM Supplier s WHERE s.tenant.id = :tenantId AND s.status = :status ORDER BY s.name")
    fun findByStatusAndTenantId(@Param("status") status: SupplierStatus, @Param("tenantId") tenantId: UUID): List<Supplier>

    /**
     * Find active suppliers within a tenant.
     */
    @Query("SELECT s FROM Supplier s WHERE s.tenant.id = :tenantId AND s.status = 'ACTIVE' ORDER BY s.name")
    fun findActiveByTenantId(@Param("tenantId") tenantId: UUID): List<Supplier>

    /**
     * Find suppliers by payment terms within a tenant.
     */
    @Query("SELECT s FROM Supplier s WHERE s.tenant.id = :tenantId AND LOWER(s.paymentTerms) LIKE LOWER(CONCAT('%', :paymentTerms, '%')) ORDER BY s.name")
    fun findByPaymentTermsContainingAndTenantId(@Param("paymentTerms") paymentTerms: String, @Param("tenantId") tenantId: UUID): List<Supplier>

    /**
     * Find suppliers with pagination for a tenant.
     */
    @Query("SELECT s FROM Supplier s WHERE s.tenant.id = :tenantId ORDER BY s.name")
    fun findByTenantIdWithPagination(@Param("tenantId") tenantId: UUID, pageable: Pageable): Page<Supplier>

    /**
     * Find suppliers by multiple criteria with pagination for a tenant.
     */
    @Query("""
        SELECT s FROM Supplier s 
        WHERE s.tenant.id = :tenantId 
        AND (:name IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :name, '%')))
        AND (:category IS NULL OR s.category = :category)
        AND (:status IS NULL OR s.status = :status)
        ORDER BY s.name
    """)
    fun findByCriteriaAndTenantId(
        @Param("tenantId") tenantId: UUID,
        @Param("name") name: String?,
        @Param("category") category: SupplierCategory?,
        @Param("status") status: SupplierStatus?,
        pageable: Pageable
    ): Page<Supplier>

    /**
     * Count suppliers by category for a tenant.
     */
    @Query("SELECT s.category, COUNT(s) FROM Supplier s WHERE s.tenant.id = :tenantId GROUP BY s.category")
    fun countByCategoryAndTenantId(@Param("tenantId") tenantId: UUID): List<Array<Any>>

    /**
     * Count suppliers by status for a tenant.
     */
    @Query("SELECT s.status, COUNT(s) FROM Supplier s WHERE s.tenant.id = :tenantId GROUP BY s.status")
    fun countByStatusAndTenantId(@Param("tenantId") tenantId: UUID): List<Array<Any>>

    /**
     * Count total suppliers for a tenant.
     */
    @Query("SELECT COUNT(s) FROM Supplier s WHERE s.tenant.id = :tenantId")
    fun countByTenantId(@Param("tenantId") tenantId: UUID): Long

    /**
     * Count active suppliers for a tenant.
     */
    @Query("SELECT COUNT(s) FROM Supplier s WHERE s.tenant.id = :tenantId AND s.status = 'ACTIVE'")
    fun countActiveByTenantId(@Param("tenantId") tenantId: UUID): Long

    /**
     * Check if supplier name exists within a tenant.
     */
    @Query("SELECT COUNT(s) > 0 FROM Supplier s WHERE s.tenant.id = :tenantId AND LOWER(s.name) = LOWER(:name)")
    fun existsByNameAndTenantId(@Param("name") name: String, @Param("tenantId") tenantId: UUID): Boolean

    /**
     * Check if supplier email exists within a tenant.
     */
    @Query("SELECT COUNT(s) > 0 FROM Supplier s WHERE s.tenant.id = :tenantId AND LOWER(s.email) = LOWER(:email)")
    fun existsByEmailAndTenantId(@Param("email") email: String, @Param("tenantId") tenantId: UUID): Boolean
}


