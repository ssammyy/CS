package com.chemsys.repository

import com.chemsys.entity.PurchaseOrderLineItem
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

/**
 * Repository for PurchaseOrderLineItem entity operations.
 * Provides methods for managing line items within purchase orders.
 */
@Repository
interface PurchaseOrderLineItemRepository : JpaRepository<PurchaseOrderLineItem, UUID> {

    /**
     * Find all line items for a specific purchase order.
     */
    @Query("SELECT li FROM PurchaseOrderLineItem li WHERE li.purchaseOrder.id = :purchaseOrderId ORDER BY li.createdAt")
    fun findByPurchaseOrderId(@Param("purchaseOrderId") purchaseOrderId: UUID): List<PurchaseOrderLineItem>

    /**
     * Find line items by product across all purchase orders for a tenant.
     */
    @Query("""
        SELECT li FROM PurchaseOrderLineItem li 
        JOIN li.purchaseOrder po 
        WHERE po.tenant.id = :tenantId AND li.product.id = :productId 
        ORDER BY po.createdAt DESC
    """)
    fun findByProductIdAndTenantId(
        @Param("productId") productId: UUID, 
        @Param("tenantId") tenantId: UUID
    ): List<PurchaseOrderLineItem>

    /**
     * Find line items by supplier across all purchase orders for a tenant.
     */
    @Query("""
        SELECT li FROM PurchaseOrderLineItem li 
        JOIN li.purchaseOrder po 
        WHERE po.tenant.id = :tenantId AND po.supplier.id = :supplierId 
        ORDER BY po.createdAt DESC
    """)
    fun findBySupplierIdAndTenantId(
        @Param("supplierId") supplierId: UUID, 
        @Param("tenantId") tenantId: UUID
    ): List<PurchaseOrderLineItem>

    /**
     * Find line items that are partially received (received quantity < ordered quantity).
     */
    @Query("""
        SELECT li FROM PurchaseOrderLineItem li 
        JOIN li.purchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND li.receivedQuantity < li.quantity
        ORDER BY po.expectedDeliveryDate ASC
    """)
    fun findPartiallyReceivedLineItems(@Param("tenantId") tenantId: UUID): List<PurchaseOrderLineItem>

    /**
     * Find line items that are fully received (received quantity = ordered quantity).
     */
    @Query("""
        SELECT li FROM PurchaseOrderLineItem li 
        JOIN li.purchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND li.receivedQuantity = li.quantity
        ORDER BY po.actualDeliveryDate DESC
    """)
    fun findFullyReceivedLineItems(@Param("tenantId") tenantId: UUID): List<PurchaseOrderLineItem>

    /**
     * Find line items that are overdue (expected delivery date passed but not fully received).
     */
    @Query("""
        SELECT li FROM PurchaseOrderLineItem li 
        JOIN li.purchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND li.expectedDeliveryDate < :currentDate
        AND li.receivedQuantity < li.quantity
        ORDER BY li.expectedDeliveryDate ASC
    """)
    fun findOverdueLineItems(
        @Param("tenantId") tenantId: UUID, 
        @Param("currentDate") currentDate: java.time.LocalDate
    ): List<PurchaseOrderLineItem>

    /**
     * Calculate total quantity and value for a specific product across all purchase orders.
     */
    @Query("""
        SELECT 
            li.product.id as productId,
            COUNT(li) as orderCount,
            SUM(li.quantity) as totalQuantity,
            SUM(li.totalPrice) as totalValue,
            AVG(li.unitPrice) as averageUnitPrice
        FROM PurchaseOrderLineItem li 
        JOIN li.purchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND li.product.id = :productId
        GROUP BY li.product.id
    """)
    fun getProductSummary(
        @Param("tenantId") tenantId: UUID, 
        @Param("productId") productId: UUID
    ): List<Array<Any>>

    /**
     * Calculate total quantity and value for a specific supplier across all purchase orders.
     */
    @Query("""
        SELECT 
            po.supplier.id as supplierId,
            COUNT(li) as itemCount,
            SUM(li.quantity) as totalQuantity,
            SUM(li.totalPrice) as totalValue
        FROM PurchaseOrderLineItem li 
        JOIN li.purchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND po.supplier.id = :supplierId
        GROUP BY po.supplier.id
    """)
    fun getSupplierSummary(
        @Param("tenantId") tenantId: UUID, 
        @Param("supplierId") supplierId: UUID
    ): List<Array<Any>>

    /**
     * Find line items by purchase order status for a tenant.
     */
    @Query("""
        SELECT li FROM PurchaseOrderLineItem li 
        JOIN li.purchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND po.status = :status
        ORDER BY po.createdAt DESC
    """)
    fun findByPurchaseOrderStatusAndTenantId(
        @Param("status") status: com.chemsys.entity.PurchaseOrderStatus, 
        @Param("tenantId") tenantId: UUID
    ): List<PurchaseOrderLineItem>

    /**
     * Delete all line items for a specific purchase order.
     */
    @Query("DELETE FROM PurchaseOrderLineItem li WHERE li.purchaseOrder.id = :purchaseOrderId")
    fun deleteByPurchaseOrderId(@Param("purchaseOrderId") purchaseOrderId: UUID)

    /**
     * Count line items for a specific purchase order.
     */
    @Query("SELECT COUNT(li) FROM PurchaseOrderLineItem li WHERE li.purchaseOrder.id = :purchaseOrderId")
    fun countByPurchaseOrderId(@Param("purchaseOrderId") purchaseOrderId: UUID): Long

    /**
     * Find line items with specific unit price range for a tenant.
     */
    @Query("""
        SELECT li FROM PurchaseOrderLineItem li 
        JOIN li.purchaseOrder po 
        WHERE po.tenant.id = :tenantId 
        AND li.unitPrice BETWEEN :minPrice AND :maxPrice
        ORDER BY li.unitPrice DESC
    """)
    fun findByUnitPriceRangeAndTenantId(
        @Param("tenantId") tenantId: UUID,
        @Param("minPrice") minPrice: java.math.BigDecimal,
        @Param("maxPrice") maxPrice: java.math.BigDecimal
    ): List<PurchaseOrderLineItem>
}


