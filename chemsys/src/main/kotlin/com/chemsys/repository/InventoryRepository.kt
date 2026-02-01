package com.chemsys.repository

import com.chemsys.entity.Inventory
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.util.*

/**
 * Repository for Inventory entity operations.
 * Provides methods for finding inventory by various criteria within a tenant.
 */
@Repository
interface InventoryRepository : JpaRepository<Inventory, UUID> {

    /**
     * Find all inventory for a specific branch.
     */
    @Query("SELECT i FROM Inventory i WHERE i.branch.id = :branchId AND i.isActive = true")
    fun findByBranchId(@Param("branchId") branchId: UUID): List<Inventory>

    /**
     * Find inventory for a specific product across all branches in a tenant.
     */
    @Query("SELECT i FROM Inventory i WHERE i.product.tenant.id = :tenantId AND i.product.id = :productId AND i.isActive = true")
    fun findByProductIdAndTenantId(@Param("productId") productId: UUID, @Param("tenantId") tenantId: UUID): List<Inventory>

    /**
     * Find all inventory items for a specific tenant.
     */
    @Query("SELECT i FROM Inventory i WHERE i.product.tenant.id = :tenantId AND i.isActive = true")
    fun findByTenantId(@Param("tenantId") tenantId: UUID): List<Inventory>

    /**
     * find all inventory items for a given tenant and branch
     */
    @Query("SELECT i FROM Inventory i WHERE i.product.tenant.id = :tenantId AND i.branch.id = :branchId AND i.isActive = true")
    fun findByTenantIdAndBranchId(@Param("tenantId") tenantId: UUID, @Param("branchId") branchId: UUID): List<Inventory>

    /**
     * Find inventory for a specific product at a specific branch.
     */
    @Query("SELECT i FROM Inventory i WHERE i.product.id = :productId AND i.branch.id = :branchId AND i.isActive = true")
    fun findByProductIdAndBranchId(@Param("productId") productId: UUID, @Param("branchId") branchId: UUID): List<Inventory>
            /**
     * Find inventory for a specific product at a specific branch and batch.
     */
    @Query("SELECT i FROM Inventory i WHERE i.product.id = :productId AND i.branch.id = :branchId AND i.batchNumber = :batchNumber AND i.isActive = true")
    fun findByProductIdAndBranchIdAndBatchNumber(@Param("productId") productId: UUID, @Param("branchId") branchId: UUID, @Param("batchNumber") batchNumber: String): List<Inventory>

    /**
     * Find low stock inventory items for a branch.
     */
    @Query("SELECT i FROM Inventory i WHERE i.branch.id = :branchId AND i.quantity <= i.product.minStockLevel AND i.isActive = true")
    fun findLowStockByBranchId(@Param("branchId") branchId: UUID): List<Inventory>

    /**
     * Find expiring inventory items for a branch.
     */
    @Query("SELECT i FROM Inventory i WHERE i.branch.id = :branchId AND i.expiryDate <= :expiryDate AND i.quantity > 0 AND i.isActive = true")
    fun findExpiringByBranchId(@Param("branchId") branchId: UUID, @Param("expiryDate") expiryDate: LocalDate): List<Inventory>

    /**
     * Find inventory by batch number within a tenant.
     */
    @Query("SELECT i FROM Inventory i WHERE i.product.tenant.id = :tenantId AND i.batchNumber = :batchNumber AND i.isActive = true")
    fun findByBatchNumberAndTenantId(@Param("batchNumber") batchNumber: String, @Param("tenantId") tenantId: UUID): List<Inventory>


    /**
     * Get total quantity of a product across all branches in a tenant.
     */
    @Query("SELECT COALESCE(SUM(i.quantity), 0) FROM Inventory i WHERE i.product.id = :productId AND i.product.tenant.id = :tenantId AND i.isActive = true")
    fun getTotalQuantityByProductIdAndTenantId(@Param("productId") productId: UUID, @Param("tenantId") tenantId: UUID): Int

    /**
     * Get total quantity of a product at a specific branch.
     */
    @Query("SELECT COALESCE(SUM(i.quantity), 0) FROM Inventory i WHERE i.product.id = :productId AND i.branch.id = :branchId AND i.isActive = true")
    fun getTotalQuantityByProductIdAndBranchId(@Param("productId") productId: UUID, @Param("branchId") branchId: UUID): Int

    /**
     * Find inventory items that need restocking (below min stock level) for a tenant.
     */
    @Query("""
        SELECT i FROM Inventory i 
        WHERE i.product.tenant.id = :tenantId 
        AND i.quantity <= i.product.minStockLevel 
        AND i.isActive = true
        ORDER BY i.quantity ASC
    """)
    fun findItemsNeedingRestockByTenantId(@Param("tenantId") tenantId: UUID): List<Inventory>

    /**
     * Find inventory items expiring within specified days for a tenant.
     */
    @Query("""
        SELECT i FROM Inventory i 
        WHERE i.product.tenant.id = :tenantId 
        AND i.expiryDate <= :expiryDate 
        AND i.quantity > 0 
        AND i.isActive = true
        ORDER BY i.expiryDate ASC
    """)
    fun findExpiringItemsByTenantId(@Param("tenantId") tenantId: UUID, @Param("expiryDate") expiryDate: LocalDate): List<Inventory>

    /**
     * Find inventory items that need restocking (below min stock level) for a specific branch.
     */
    @Query("""
        SELECT i FROM Inventory i 
        WHERE i.branch.id = :branchId 
        AND i.quantity <= i.product.minStockLevel 
        AND i.isActive = true
        ORDER BY i.quantity ASC
    """)
    fun findItemsNeedingRestockByBranchId(@Param("branchId") branchId: UUID): List<Inventory>

    /**
     * Find inventory items expiring within specified days for a specific branch.
     */
    @Query("""
        SELECT i FROM Inventory i 
        WHERE i.branch.id = :branchId 
        AND i.expiryDate <= :expiryDate 
        AND i.quantity > 0 
        AND i.isActive = true
        ORDER BY i.expiryDate ASC
    """)
    fun findExpiringItemsByBranchId(@Param("branchId") branchId: UUID, @Param("expiryDate") expiryDate: LocalDate): List<Inventory>
}
