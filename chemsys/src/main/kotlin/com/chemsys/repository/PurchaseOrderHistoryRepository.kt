package com.chemsys.repository

import com.chemsys.entity.PurchaseOrderHistory
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

/**
 * Repository for PurchaseOrderHistory entity operations.
 * Provides methods for tracking all changes and status updates to purchase orders.
 */
@Repository
interface PurchaseOrderHistoryRepository : JpaRepository<PurchaseOrderHistory, UUID> {

    /**
     * Find all history entries for a specific purchase order.
     */
    @Query("SELECT h FROM PurchaseOrderHistory h WHERE h.purchaseOrder.id = :purchaseOrderId ORDER BY h.performedAt DESC")
    fun findByPurchaseOrderId(@Param("purchaseOrderId") purchaseOrderId: UUID): List<PurchaseOrderHistory>

    /**
     * Find history entries by action type for a specific purchase order.
     */
    @Query("SELECT h FROM PurchaseOrderHistory h WHERE h.purchaseOrder.id = :purchaseOrderId AND h.action = :action ORDER BY h.performedAt DESC")
    fun findByPurchaseOrderIdAndAction(
        @Param("purchaseOrderId") purchaseOrderId: UUID,
        @Param("action") action: String
    ): List<PurchaseOrderHistory>

    /**
     * Find history entries by user across all purchase orders for a tenant.
     */
    @Query("""
        SELECT h FROM PurchaseOrderHistory h 
        JOIN h.purchaseOrder po 
        WHERE po.tenant.id = :tenantId AND h.performedBy = :performedBy 
        ORDER BY h.performedAt DESC
    """)
    fun findByPerformedByAndTenantId(
        @Param("performedBy") performedBy: String,
        @Param("tenantId") tenantId: UUID
    ): List<PurchaseOrderHistory>

    /**
     * Find history entries by status change for a tenant.
     */
    @Query("""
        SELECT h FROM PurchaseOrderHistory h 
        JOIN h.purchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND h.action LIKE '%STATUS%'
        ORDER BY h.performedAt DESC
    """)
    fun findStatusChangeHistoryByTenantId(@Param("tenantId") tenantId: UUID): List<PurchaseOrderHistory>

    /**
     * Find history entries within a date range for a tenant.
     */
    @Query("""
        SELECT h FROM PurchaseOrderHistory h 
        JOIN h.purchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND h.performedAt BETWEEN :startDate AND :endDate
        ORDER BY h.performedAt DESC
    """)
    fun findByDateRangeAndTenantId(
        @Param("tenantId") tenantId: UUID,
        @Param("startDate") startDate: java.time.OffsetDateTime,
        @Param("endDate") endDate: java.time.OffsetDateTime
    ): List<PurchaseOrderHistory>

    /**
     * Find the latest history entry for a specific purchase order.
     */
    @Query("""
        SELECT h FROM PurchaseOrderHistory h 
        WHERE h.purchaseOrder.id = :purchaseOrderId 
        ORDER BY h.performedAt DESC 
        LIMIT 1
    """)
    fun findLatestByPurchaseOrderId(@Param("purchaseOrderId") purchaseOrderId: UUID): PurchaseOrderHistory?

    /**
     * Find history entries by specific status change for a tenant.
     */
    @Query("""
        SELECT h FROM PurchaseOrderHistory h 
        JOIN h.purchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND h.newStatus = :status
        ORDER BY h.performedAt DESC
    """)
    fun findByNewStatusAndTenantId(
        @Param("status") status: com.chemsys.entity.PurchaseOrderStatus,
        @Param("tenantId") tenantId: UUID
    ): List<PurchaseOrderHistory>

    /**
     * Find history entries by previous status for a tenant.
     */
    @Query("""
        SELECT h FROM PurchaseOrderHistory h 
        JOIN h.purchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND h.previousStatus = :status
        ORDER BY h.performedAt DESC
    """)
    fun findByPreviousStatusAndTenantId(
        @Param("status") status: com.chemsys.entity.PurchaseOrderStatus,
        @Param("tenantId") tenantId: UUID
    ): List<PurchaseOrderHistory>

    /**
     * Count history entries for a specific purchase order.
     */
    @Query("SELECT COUNT(h) FROM PurchaseOrderHistory h WHERE h.purchaseOrder.id = :purchaseOrderId")
    fun countByPurchaseOrderId(@Param("purchaseOrderId") purchaseOrderId: UUID): Long

    /**
     * Find history entries by action type across all purchase orders for a tenant.
     */
    @Query("""
        SELECT h FROM PurchaseOrderHistory h 
        JOIN h.purchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND h.action = :action
        ORDER BY h.performedAt DESC
    """)
    fun findByActionAndTenantId(
        @Param("action") action: String,
        @Param("tenantId") tenantId: UUID
    ): List<PurchaseOrderHistory>

    /**
     * Find history entries for specific purchase orders.
     */
    @Query("""
        SELECT h FROM PurchaseOrderHistory h 
        WHERE h.purchaseOrder.id IN :purchaseOrderIds 
        ORDER BY h.performedAt DESC
    """)
    fun findByPurchaseOrderIds(@Param("purchaseOrderIds") purchaseOrderIds: List<UUID>): List<PurchaseOrderHistory>

    /**
     * Find history entries with specific descriptions for a tenant.
     */
    @Query("""
        SELECT h FROM PurchaseOrderHistory h 
        JOIN h.purchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND h.description LIKE CONCAT('%', :description, '%')
        ORDER BY h.performedAt DESC
    """)
    fun findByDescriptionContainingAndTenantId(
        @Param("description") description: String,
        @Param("tenantId") tenantId: UUID
    ): List<PurchaseOrderHistory>

    /**
     * Get audit trail summary for a specific purchase order.
     */
    @Query("""
        SELECT 
            h.action,
            h.performedBy,
            h.performedAt,
            h.previousStatus,
            h.newStatus,
            h.description
        FROM PurchaseOrderHistory h 
        WHERE h.purchaseOrder.id = :purchaseOrderId 
        ORDER BY h.performedAt ASC
    """)
    fun getAuditTrailByPurchaseOrderId(@Param("purchaseOrderId") purchaseOrderId: UUID): List<Array<Any>>
}


