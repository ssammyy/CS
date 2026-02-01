package com.chemsys.repository

import com.chemsys.entity.Product
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

/**
 * Repository for Product entity operations.
 * Provides methods for finding products by various criteria within a tenant.
 */
@Repository
interface ProductRepository : JpaRepository<Product, UUID> {

    /**
     * Find all products for a specific tenant.
     */
    @Query("SELECT p FROM Product p WHERE p.tenant.id = :tenantId AND p.isActive = true")
    fun findByTenantId(@Param("tenantId") tenantId: UUID): List<Product>

    /**
     * Find products by name within a tenant (case-insensitive search).
     */
    @Query("SELECT p FROM Product p WHERE p.tenant.id = :tenantId AND LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%')) AND p.isActive = true")
    fun findByNameContainingAndTenantId(@Param("name") name: String, @Param("tenantId") tenantId: UUID): List<Product>

    /**
     * Find products by generic name within a tenant.
     */
    @Query("SELECT p FROM Product p WHERE p.tenant.id = :tenantId AND LOWER(p.genericName) LIKE LOWER(CONCAT('%', :genericName, '%')) AND p.isActive = true")
    fun findByGenericNameContainingAndTenantId(@Param("genericName") genericName: String, @Param("tenantId") tenantId: UUID): List<Product>

    /**
     * Find products by barcode within a tenant.
     */
    fun findByBarcodeAndTenantId(barcode: String, tenantId: UUID): Optional<Product>

    /**
     * Find products that require prescription within a tenant.
     */
    @Query("SELECT p FROM Product p WHERE p.tenant.id = :tenantId AND p.requiresPrescription = true AND p.isActive = true")
    fun findPrescriptionRequiredByTenantId(@Param("tenantId") tenantId: UUID): List<Product>

    /**
     * Find products with low stock across all branches for a tenant.
     */
    @Query("""
        SELECT DISTINCT p FROM Product p 
        JOIN Inventory i ON i.product.id = p.id 
        WHERE p.tenant.id = :tenantId 
        AND p.isActive = true 
        AND i.quantity <= p.minStockLevel
        GROUP BY p.id
    """)
    fun findLowStockProductsByTenantId(@Param("tenantId") tenantId: UUID): List<Product>

    /**
     * Find products expiring within a specified number of days for a tenant.
     */
    @Query("""
        SELECT DISTINCT p FROM Product p 
        JOIN Inventory i ON i.product.id = p.id 
        WHERE p.tenant.id = :tenantId 
        AND p.isActive = true 
        AND i.expiryDate <= :expiryDate
        AND i.quantity > 0
        GROUP BY p.id
    """)
    fun findExpiringProductsByTenantId(@Param("tenantId") tenantId: UUID, @Param("expiryDate") expiryDate: java.time.LocalDate): List<Product>

    /**
     * Count total products for a tenant.
     */
    @Query("SELECT COUNT(p) FROM Product p WHERE p.tenant.id = :tenantId AND p.isActive = true")
    fun countByTenantId(@Param("tenantId") tenantId: UUID): Long
}
