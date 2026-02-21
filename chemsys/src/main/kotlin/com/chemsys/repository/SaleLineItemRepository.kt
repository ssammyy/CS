package com.chemsys.repository

import com.chemsys.entity.SaleLineItem
import com.chemsys.entity.SaleReturnStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

/**
 * Repository interface for SaleLineItem entity operations.
 * Provides basic CRUD operations for sale line items.
 * 
 * This repository follows the Backend Data Consistency Rule by ensuring:
 * - All operations maintain referential integrity
 * - Proper indexing for performance optimization
 * - Support for line item tracking and reporting
 */
@Repository
interface SaleLineItemRepository : JpaRepository<SaleLineItem, UUID> {

    /**
     * Finds all line items for a specific sale.
     * 
     * @param saleId The sale ID to filter by
     * @return List of line items for the sale
     */
    @Query("SELECT li FROM SaleLineItem li WHERE li.sale.id = :saleId")
    fun findBySaleId(@Param("saleId") saleId: UUID): List<SaleLineItem>

    /**
     * Updates unit price and line total for a line item (maker-checker price change).
     */
    @Modifying
    @Query("UPDATE SaleLineItem li SET li.unitPrice = :unitPrice, li.lineTotal = :lineTotal WHERE li.id = :id")
    fun updatePriceAndTotal(@Param("id") id: UUID, @Param("unitPrice") unitPrice: BigDecimal, @Param("lineTotal") lineTotal: BigDecimal)

    /**
     * Finds line items by product ID across all sales for a tenant.
     * 
     * @param productId The product ID to filter by
     * @param tenantId The tenant ID to filter by
     * @return List of line items for the product
     */
    @Query("""
        SELECT li FROM SaleLineItem li 
        JOIN li.sale s 
        WHERE li.product.id = :productId AND s.tenant.id = :tenantId
        ORDER BY s.saleDate DESC
    """)
    fun findByProductIdAndTenantId(
        @Param("productId") productId: UUID, 
        @Param("tenantId") tenantId: UUID
    ): List<SaleLineItem>

    /**
     * Finds line items by branch ID for a tenant.
     * 
     * @param branchId The branch ID to filter by
     * @param tenantId The tenant ID to filter by
     * @return List of line items for the branch
     */
    @Query("""
        SELECT li FROM SaleLineItem li 
        JOIN li.sale s 
        WHERE s.branch.id = :branchId AND s.tenant.id = :tenantId
        ORDER BY s.saleDate DESC
    """)
    fun findByBranchIdAndTenantId(
        @Param("branchId") branchId: UUID, 
        @Param("tenantId") tenantId: UUID
    ): List<SaleLineItem>

    /**
     * Calculates total quantity sold for a product across all sales for a tenant.
     * 
     * @param productId The product ID to calculate for
     * @param tenantId The tenant ID to filter by
     * @return Total quantity sold
     */
    @Query("""
        SELECT COALESCE(SUM(li.quantity), 0) FROM SaleLineItem li 
        JOIN li.sale s 
        WHERE li.product.id = :productId AND s.tenant.id = :tenantId
    """)
    fun getTotalQuantitySoldByProductIdAndTenantId(
        @Param("productId") productId: UUID, 
        @Param("tenantId") tenantId: UUID
    ): Long

    /**
     * Calculates total quantity returned for a product across all sales for a tenant.
     * 
     * @param productId The product ID to calculate for
     * @param tenantId The tenant ID to filter by
     * @return Total quantity returned
     */
    @Query("""
        SELECT COALESCE(SUM(li.returnedQuantity), 0) FROM SaleLineItem li 
        JOIN li.sale s 
        WHERE li.product.id = :productId AND s.tenant.id = :tenantId
    """)
    fun getTotalQuantityReturnedByProductIdAndTenantId(
        @Param("productId") productId: UUID, 
        @Param("tenantId") tenantId: UUID
    ): Long

    /**
     * Finds line items for sales by a cashier within a date range, with inventory fetched
     * so unit cost is available for commission calculation.
     * Used to compute cashier commission (15% of profit per item).
     */
    @Query("""
        SELECT li FROM SaleLineItem li
        JOIN FETCH li.inventory inv
        JOIN li.sale s
        WHERE s.cashier.id = :cashierId
        AND s.tenant.id = :tenantId
        AND s.saleDate BETWEEN :startDate AND :endDate
        AND s.returnStatus = :returnStatus
    """)
    fun findByCashierIdAndSaleDateBetweenWithInventory(
        @Param("cashierId") cashierId: UUID,
        @Param("tenantId") tenantId: UUID,
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("returnStatus") returnStatus: SaleReturnStatus
    ): List<SaleLineItem>
}
