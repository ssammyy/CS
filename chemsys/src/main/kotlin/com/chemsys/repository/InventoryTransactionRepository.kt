package com.chemsys.repository

import com.chemsys.entity.InventoryTransaction
import com.chemsys.entity.TransactionType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.*

/**
 * Repository for InventoryTransaction entity operations.
 * Provides methods for finding transactions by various criteria within a tenant.
 */
@Repository
interface InventoryTransactionRepository : JpaRepository<InventoryTransaction, UUID> {

    /**
     * Find all transactions for a specific product within a tenant.
     */
    @Query("SELECT t FROM InventoryTransaction t WHERE t.product.tenant.id = :tenantId AND t.product.id = :productId ORDER BY t.createdAt DESC")
    fun findByProductIdAndTenantId(@Param("productId") productId: UUID, @Param("tenantId") tenantId: UUID): List<InventoryTransaction>

    /**
     * Find all transactions for a specific branch within a tenant.
     */
    @Query("SELECT t FROM InventoryTransaction t WHERE t.branch.tenant.id = :tenantId AND t.branch.id = :branchId ORDER BY t.createdAt DESC")
    fun findByBranchIdAndTenantId(@Param("branchId") branchId: UUID, @Param("tenantId") tenantId: UUID): List<InventoryTransaction>

    /**
     * Find transactions by type within a tenant.
     */
    @Query("SELECT t FROM InventoryTransaction t WHERE t.branch.tenant.id = :tenantId AND t.transactionType = :transactionType ORDER BY t.createdAt DESC")
    fun findByTransactionTypeAndTenantId(@Param("transactionType") transactionType: TransactionType, @Param("tenantId") tenantId: UUID): List<InventoryTransaction>

    /**
     * Find transactions within a date range for a tenant.
     */
    @Query("SELECT t FROM InventoryTransaction t WHERE t.branch.tenant.id = :tenantId AND t.createdAt BETWEEN :startDate AND :endDate ORDER BY t.createdAt DESC")
    fun findByDateRangeAndTenantId(
        @Param("startDate") startDate: OffsetDateTime, 
        @Param("endDate") endDate: OffsetDateTime, 
        @Param("tenantId") tenantId: UUID
    ): List<InventoryTransaction>

    /**
     * Find transactions by batch number within a tenant.
     */
    @Query("SELECT t FROM InventoryTransaction t WHERE t.branch.tenant.id = :tenantId AND t.batchNumber = :batchNumber ORDER BY t.createdAt DESC")
    fun findByBatchNumberAndTenantId(@Param("batchNumber") batchNumber: String, @Param("tenantId") tenantId: UUID): List<InventoryTransaction>

    /**
     * Find transactions performed by a specific user within a tenant.
     */
    @Query("SELECT t FROM InventoryTransaction t WHERE t.branch.tenant.id = :tenantId AND t.performedBy.id = :userId ORDER BY t.createdAt DESC")
    fun findByPerformedByAndTenantId(@Param("userId") userId: UUID, @Param("tenantId") tenantId: UUID): List<InventoryTransaction>

    /**
     * Get transaction summary for a product within a tenant.
     */
    @Query("""
        SELECT 
            t.transactionType,
            SUM(t.quantity) as totalQuantity,
            COUNT(t) as transactionCount
        FROM InventoryTransaction t 
        WHERE t.product.tenant.id = :tenantId AND t.product.id = :productId 
        GROUP BY t.transactionType
    """)
    fun getTransactionSummaryByProductIdAndTenantId(
        @Param("productId") productId: UUID, 
        @Param("tenantId") tenantId: UUID
    ): List<Any>

    /**
     * Get transaction summary for a branch within a tenant.
     */
    @Query("""
        SELECT 
            t.transactionType,
            SUM(t.quantity) as totalQuantity,
            COUNT(t) as transactionCount
        FROM InventoryTransaction t 
        WHERE t.branch.tenant.id = :tenantId AND t.branch.id = :branchId 
        GROUP BY t.transactionType
    """)
    fun getTransactionSummaryByBranchIdAndTenantId(
        @Param("branchId") branchId: UUID, 
        @Param("tenantId") tenantId: UUID
    ): List<Any>

    /**
     * Count transactions by type for a tenant.
     */
    @Query("SELECT COUNT(t) FROM InventoryTransaction t WHERE t.branch.tenant.id = :tenantId AND t.transactionType = :transactionType")
    fun countByTransactionTypeAndTenantId(@Param("transactionType") transactionType: TransactionType, @Param("tenantId") tenantId: UUID): Long

    /**
     * Find recent transactions for a tenant.
     */
    @Query("SELECT t FROM InventoryTransaction t WHERE t.branch.tenant.id = :tenantId ORDER BY t.createdAt DESC")
    fun findRecentTransactionsByTenantId(@Param("tenantId") tenantId: UUID): List<InventoryTransaction>
}
