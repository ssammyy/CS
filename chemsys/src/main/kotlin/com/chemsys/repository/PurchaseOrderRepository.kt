package com.chemsys.repository

import com.chemsys.entity.PurchaseOrder
import com.chemsys.entity.PurchaseOrderStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.util.*

/**
 * Repository for PurchaseOrder entity operations.
 * Provides methods for finding purchase orders by various criteria within a tenant.
 */
@Repository
interface PurchaseOrderRepository : JpaRepository<PurchaseOrder, UUID> {

    /**
     * Find all purchase orders for a specific tenant.
     */
    @Query("SELECT po FROM PurchaseOrder po WHERE po.tenant.id = :tenantId ORDER BY po.createdAt DESC")
    fun findByTenantId(@Param("tenantId") tenantId: UUID): List<PurchaseOrder>

    /**
     * Find purchase orders by PO number within a tenant.
     */
    @Query("SELECT po FROM PurchaseOrder po WHERE po.tenant.id = :tenantId AND po.poNumber LIKE %:poNumber% ORDER BY po.createdAt DESC")
    fun findByPoNumberContainingAndTenantId(@Param("poNumber") poNumber: String, @Param("tenantId") tenantId: UUID): List<PurchaseOrder>

    /**
     * Find purchase orders by title within a tenant.
     */
    @Query("SELECT po FROM PurchaseOrder po WHERE po.tenant.id = :tenantId AND po.title LIKE %:title% ORDER BY po.createdAt DESC")
    fun findByTitleContainingAndTenantId(@Param("title") title: String, @Param("tenantId") tenantId: UUID): List<PurchaseOrder>

    /**
     * Find purchase orders by supplier within a tenant.
     */
    @Query("SELECT po FROM PurchaseOrder po WHERE po.tenant.id = :tenantId AND po.supplier.id = :supplierId ORDER BY po.createdAt DESC")
    fun findBySupplierIdAndTenantId(@Param("supplierId") supplierId: UUID, @Param("tenantId") tenantId: UUID): List<PurchaseOrder>

    /**
     * Find purchase orders by branch within a tenant.
     */
    @Query("SELECT po FROM PurchaseOrder po WHERE po.tenant.id = :tenantId AND po.branch.id = :branchId ORDER BY po.createdAt DESC")
    fun findByBranchIdAndTenantId(@Param("branchId") branchId: UUID, @Param("tenantId") tenantId: UUID): List<PurchaseOrder>

    /**
     * Find purchase orders by status within a tenant.
     */
    @Query("SELECT po FROM PurchaseOrder po WHERE po.tenant.id = :tenantId AND po.status = :status ORDER BY po.createdAt DESC")
    fun findByStatusAndTenantId(@Param("status") status: PurchaseOrderStatus, @Param("tenantId") tenantId: UUID): List<PurchaseOrder>

    /**
     * Find purchase orders by multiple statuses within a tenant.
     */
    @Query("SELECT po FROM PurchaseOrder po WHERE po.tenant.id = :tenantId AND po.status IN :statuses ORDER BY po.createdAt DESC")
    fun findByStatusInAndTenantId(@Param("statuses") statuses: List<PurchaseOrderStatus>, @Param("tenantId") tenantId: UUID): List<PurchaseOrder>

    /**
     * Find all purchase orders for a tenant with pagination - SIMPLE VERSION.
     * This is the only method we'll use for pagination to avoid complex query issues.
     */
    fun findByTenantIdOrderByCreatedAtDesc(tenantId: UUID, pageable: Pageable): Page<PurchaseOrder>

    /**
     * Find overdue purchase orders (expected delivery date passed but not delivered).
     */
    @Query("""
        SELECT po FROM PurchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND po.status IN ('APPROVED', 'PENDING_APPROVAL')
        AND po.expectedDeliveryDate < :currentDate
        ORDER BY po.expectedDeliveryDate ASC
    """)
    fun findOverduePurchaseOrders(@Param("tenantId") tenantId: UUID, @Param("currentDate") currentDate: LocalDate): List<PurchaseOrder>

    /**
     * Find purchase orders due for delivery within specified days.
     */
    @Query("""
        SELECT po FROM PurchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND po.status IN ('APPROVED', 'PENDING_APPROVAL')
        AND po.expectedDeliveryDate BETWEEN :startDate AND :endDate
        ORDER BY po.expectedDeliveryDate ASC
    """)
    fun findPurchaseOrdersDueForDelivery(
        @Param("tenantId") tenantId: UUID,
        @Param("startDate") startDate: LocalDate,
        @Param("endDate") endDate: LocalDate
    ): List<PurchaseOrder>

    /**
     * Count purchase orders by status for a tenant.
     */
    @Query("SELECT po.status, COUNT(po) FROM PurchaseOrder po WHERE po.tenant.id = :tenantId GROUP BY po.status")
    fun countByStatusAndTenantId(@Param("tenantId") tenantId: UUID): List<Array<Any>>

    /**
     * Count total purchase orders for a tenant.
     */
    @Query("SELECT COUNT(po) FROM PurchaseOrder po WHERE po.tenant.id = :tenantId")
    fun countByTenantId(@Param("tenantId") tenantId: UUID): Long

    /**
     * Count purchase orders by supplier for a tenant.
     */
    @Query("SELECT po.supplier.id, COUNT(po) FROM PurchaseOrder po WHERE po.tenant.id = :tenantId GROUP BY po.supplier.id")
    fun countBySupplierAndTenantId(@Param("tenantId") tenantId: UUID): List<Array<Any>>

    /**
     * Find purchase orders created by a specific user within a tenant.
     */
    @Query("SELECT po FROM PurchaseOrder po WHERE po.tenant.id = :tenantId AND po.createdBy = :createdBy ORDER BY po.createdAt DESC")
    fun findByCreatedByAndTenantId(@Param("createdBy") createdBy: String, @Param("tenantId") tenantId: UUID): List<PurchaseOrder>

    /**
     * Find purchase orders approved by a specific user within a tenant.
     */
    @Query("SELECT po FROM PurchaseOrder po WHERE po.tenant.id = :tenantId AND po.approvedBy = :approvedBy ORDER BY po.approvedAt DESC")
    fun findByApprovedByAndTenantId(@Param("approvedBy") approvedBy: String, @Param("tenantId") tenantId: UUID): List<PurchaseOrder>

    /**
     * Check if PO number exists within a tenant.
     */
    @Query("SELECT COUNT(po) > 0 FROM PurchaseOrder po WHERE po.tenant.id = :tenantId AND po.poNumber = :poNumber")
    fun existsByPoNumberAndTenantId(@Param("poNumber") poNumber: String, @Param("tenantId") tenantId: UUID): Boolean

    /**
     * Find purchase orders with total value greater than specified amount.
     */
    @Query("SELECT po FROM PurchaseOrder po WHERE po.tenant.id = :tenantId AND po.grandTotal > :minAmount ORDER BY po.grandTotal DESC")
    fun findByMinAmountAndTenantId(@Param("minAmount") minAmount: java.math.BigDecimal, @Param("tenantId") tenantId: UUID): List<PurchaseOrder>

    /**
     * Get monthly purchase order trends for a tenant.
     */
    @Query("""
        SELECT
            EXTRACT(YEAR FROM po.createdAt) as year,
            EXTRACT(MONTH FROM po.createdAt) as month,
            COUNT(po) as count,
            SUM(po.grandTotal) as totalValue
        FROM PurchaseOrder po
        WHERE po.tenant.id = :tenantId
        AND po.createdAt >= :startDate
        GROUP BY EXTRACT(YEAR FROM po.createdAt), EXTRACT(MONTH FROM po.createdAt)
        ORDER BY year DESC, month DESC
    """)
    fun getMonthlyTrends(
        @Param("tenantId") tenantId: UUID,
        @Param("startDate") startDate: java.time.OffsetDateTime
    ): List<Array<Any>>

    /**
     * Find purchase orders by date range and tenant.
     */
    @Query("""
        SELECT po FROM PurchaseOrder po
        WHERE po.tenant.id = :tenantId
        AND po.createdAt BETWEEN :startDate AND :endDate
        ORDER BY po.createdAt DESC
    """)
    fun findByPurchaseDateBetweenAndTenantId(
        @Param("startDate") startDate: java.time.OffsetDateTime,
        @Param("endDate") endDate: java.time.OffsetDateTime,
        @Param("tenantId") tenantId: UUID
    ): List<PurchaseOrder>

    /**
     * Find purchase orders by date range, branch, and tenant.
     */
    @Query("""
        SELECT po FROM PurchaseOrder po
        WHERE po.tenant.id = :tenantId
        AND po.branch.id = :branchId
        AND po.createdAt BETWEEN :startDate AND :endDate
        ORDER BY po.createdAt DESC
    """)
    fun findByPurchaseDateBetweenAndBranchIdAndTenantId(
        @Param("startDate") startDate: java.time.OffsetDateTime,
        @Param("endDate") endDate: java.time.OffsetDateTime,
        @Param("branchId") branchId: UUID,
        @Param("tenantId") tenantId: UUID
    ): List<PurchaseOrder>
}
