package com.chemsys.repository

import com.chemsys.entity.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

/**
 * Repository interface for Sale entity operations.
 * Provides custom query methods for sales management and reporting.
 * 
 * This repository follows the Backend Data Consistency Rule by ensuring:
 * - All queries are filtered by tenant for proper isolation
 * - Proper indexing for performance optimization
 * - Support for complex search and reporting queries
 */
@Repository
interface SaleRepository : JpaRepository<Sale, UUID> {

    /**
     * Finds a sale by ID with line items loaded.
     * 
     * @param saleId The sale ID to find
     * @return Optional sale with line items loaded
     */
    @Query("SELECT DISTINCT s FROM Sale s LEFT JOIN FETCH s.lineItems WHERE s.id = :saleId")
    fun findByIdWithLineItems(@Param("saleId") saleId: UUID): Optional<Sale>

    /**
     * Finds line items for a specific sale.
     * 
     * @param saleId The sale ID to find line items for
     * @return List of line items for the sale
     */
    @Query("SELECT li FROM SaleLineItem li WHERE li.sale.id = :saleId")
    fun findLineItemsBySaleId(@Param("saleId") saleId: UUID): List<SaleLineItem>

    /**
     * Finds a sale by ID with payments loaded.
     * 
     * @param saleId The sale ID to find
     * @return Optional sale with payments loaded
     */
    @Query("SELECT s FROM Sale s LEFT JOIN FETCH s.payments p WHERE s.id = :saleId")
    fun findByIdWithPayments(@Param("saleId") saleId: UUID): Optional<Sale>

    /**
     * Finds all sales for a specific tenant with pagination.
     * 
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of sales for the tenant
     */
    fun findByTenantId(tenantId: UUID, pageable: Pageable): Page<Sale>

    /**
     * Finds all sales for a specific branch with pagination.
     * 
     * @param branchId The branch ID to filter by
     * @param pageable Pagination information
     * @return Page of sales for the branch
     */
    fun findByBranchId(branchId: UUID, pageable: Pageable): Page<Sale>

    /**
     * Finds a sale by sale number within a tenant.
     * 
     * @param saleNumber The sale number to search for
     * @param tenantId The tenant ID to filter by
     * @return Optional sale if found
     */
    fun findBySaleNumberAndTenantId(saleNumber: String, tenantId: UUID): Optional<Sale>

    /**
     * Finds all sales for a specific customer.
     * 
     * @param customerId The customer ID to filter by
     * @param pageable Pagination information
     * @return Page of sales for the customer
     */
    fun findByCustomerId(customerId: UUID, pageable: Pageable): Page<Sale>

    /**
     * Finds all sales processed by a specific cashier.
     * 
     * @param cashierId The cashier ID to filter by
     * @param pageable Pagination information
     * @return Page of sales processed by the cashier
     */
    fun findByCashierId(cashierId: UUID, pageable: Pageable): Page<Sale>

    /**
     * Finds sales by status within a tenant.
     * 
     * @param status The sale status to filter by
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of sales with the specified status
     */
    fun findByStatusAndTenantId(status: SaleStatus, tenantId: UUID, pageable: Pageable): Page<Sale>

    /**
     * Finds sales by status within a specific branch.
     * 
     * @param status The sale status to filter by
     * @param branchId The branch ID to filter by
     * @param pageable Pagination information
     * @return Page of sales with the specified status for the branch
     */
    fun findByStatusAndBranchId(status: SaleStatus, branchId: UUID, pageable: Pageable): Page<Sale>

    /**
     * Finds sales within a date range for a specific tenant.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of sales within the date range
     */
    fun findBySaleDateBetweenAndTenantId(
        startDate: OffsetDateTime,
        endDate: OffsetDateTime,
        tenantId: UUID,
        pageable: Pageable
    ): Page<Sale>

    /**
     * Finds sales within a date range for a specific branch.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param branchId The branch ID to filter by
     * @param pageable Pagination information
     * @return Page of sales within the date range for the branch
     */
    fun findBySaleDateBetweenAndBranchId(
        startDate: OffsetDateTime,
        endDate: OffsetDateTime,
        branchId: UUID,
        pageable: Pageable
    ): Page<Sale>

    /**
     * Finds sales with total amount within a range.
     * 
     * @param minAmount The minimum total amount
     * @param maxAmount The maximum total amount
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of sales within the amount range
     */
    fun findByTotalAmountBetweenAndTenantId(
        minAmount: BigDecimal,
        maxAmount: BigDecimal,
        tenantId: UUID,
        pageable: Pageable
    ): Page<Sale>

    /**
     * Finds sales by customer name (partial match).
     * 
     * @param customerName The customer name to search for (case-insensitive)
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of sales matching the customer name
     */
    @Query("SELECT s FROM Sale s WHERE " +
           "LOWER(s.customerName) LIKE LOWER(CONCAT('%', :customerName, '%')) " +
           "AND s.tenant.id = :tenantId")
    fun findByCustomerNameContainingIgnoreCaseAndTenantId(
        @Param("customerName") customerName: String,
        @Param("tenantId") tenantId: UUID,
        pageable: Pageable
    ): Page<Sale>

    /**
     * Finds sales that contain a specific product.
     * 
     * @param productId The product ID to search for
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of sales containing the product
     */
    @Query("SELECT DISTINCT s FROM Sale s JOIN s.lineItems li " +
           "WHERE li.product.id = :productId AND s.tenant.id = :tenantId")
    fun findByProductIdAndTenantId(
        @Param("productId") productId: UUID,
        @Param("tenantId") tenantId: UUID,
        pageable: Pageable
    ): Page<Sale>

    /**
     * Finds sales with a specific payment method.
     * 
     * @param paymentMethod The payment method to filter by
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of sales with the payment method
     */
    @Query("SELECT DISTINCT s FROM Sale s JOIN s.payments p " +
           "WHERE p.paymentMethod = :paymentMethod AND s.tenant.id = :tenantId")
    fun findByPaymentMethodAndTenantId(
        @Param("paymentMethod") paymentMethod: PaymentMethod,
        @Param("tenantId") tenantId: UUID,
        pageable: Pageable
    ): Page<Sale>

    /**
     * Finds sales with a specific payment method within a branch.
     * 
     * @param paymentMethod The payment method to filter by
     * @param branchId The branch ID to filter by
     * @param pageable Pagination information
     * @return Page of sales with the payment method for the branch
     */
    @Query("SELECT DISTINCT s FROM Sale s JOIN s.payments p " +
           "WHERE p.paymentMethod = :paymentMethod AND s.branch.id = :branchId")
    fun findByPaymentMethodAndBranchId(
        @Param("paymentMethod") paymentMethod: PaymentMethod,
        @Param("branchId") branchId: UUID,
        pageable: Pageable
    ): Page<Sale>

    /**
     * Finds sales by customer name within a specific branch.
     * 
     * @param customerName The customer name to search for (case-insensitive)
     * @param branchId The branch ID to filter by
     * @param pageable Pagination information
     * @return Page of sales matching the customer name for the branch
     */
    @Query("SELECT s FROM Sale s WHERE " +
           "LOWER(s.customerName) LIKE LOWER(CONCAT('%', :customerName, '%')) " +
           "AND s.branch.id = :branchId")
    fun findByCustomerNameContainingIgnoreCaseAndBranchId(
        @Param("customerName") customerName: String,
        @Param("branchId") branchId: UUID,
        pageable: Pageable
    ): Page<Sale>

    /**
     * Gets the total sales amount for a specific tenant within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @return Total sales amount
     */
    @Query("SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sale s " +
           "WHERE s.saleDate BETWEEN :startDate AND :endDate " +
           "AND s.tenant.id = :tenantId AND s.status = 'COMPLETED'")
    fun getTotalSalesAmountByDateRangeAndTenantId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("tenantId") tenantId: UUID
    ): BigDecimal

    /**
     * Gets the total sales amount for a specific branch within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param branchId The branch ID to filter by
     * @return Total sales amount
     */
    @Query("SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sale s " +
           "WHERE s.saleDate BETWEEN :startDate AND :endDate " +
           "AND s.branch.id = :branchId AND s.status = 'COMPLETED'")
    fun getTotalSalesAmountByDateRangeAndBranchId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("branchId") branchId: UUID
    ): BigDecimal

    /**
     * Gets the count of sales for a specific tenant within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @return Count of sales
     */
    @Query("SELECT COUNT(s) FROM Sale s " +
           "WHERE s.saleDate BETWEEN :startDate AND :endDate " +
           "AND s.tenant.id = :tenantId AND s.status = 'COMPLETED'")
    fun getSalesCountByDateRangeAndTenantId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("tenantId") tenantId: UUID
    ): Long

    /**
     * Gets the count of sales for a specific branch within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param branchId The branch ID to filter by
     * @return Count of sales
     */
    @Query("SELECT COUNT(s) FROM Sale s " +
           "WHERE s.saleDate BETWEEN :startDate AND :endDate " +
           "AND s.branch.id = :branchId AND s.status = 'COMPLETED'")
    fun getSalesCountByDateRangeAndBranchId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("branchId") branchId: UUID
    ): Long

    /**
     * Gets sales summary by payment method for a specific tenant within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @return List of payment method summaries
     */
    @Query("SELECT p.paymentMethod, SUM(p.amount) FROM Sale s JOIN s.payments p " +
           "WHERE s.saleDate BETWEEN :startDate AND :endDate " +
           "AND s.tenant.id = :tenantId AND s.status = 'COMPLETED' " +
           "GROUP BY p.paymentMethod")
    fun getSalesSummaryByPaymentMethodAndTenantId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("tenantId") tenantId: UUID
    ): List<Array<Any>>

    /**
     * Gets sales summary by hour for a specific tenant within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @return List of hour summaries
     */
    @Query("SELECT EXTRACT(HOUR FROM s.saleDate), COUNT(s) FROM Sale s " +
           "WHERE s.saleDate BETWEEN :startDate AND :endDate " +
           "AND s.tenant.id = :tenantId AND s.status = 'COMPLETED' " +
           "GROUP BY EXTRACT(HOUR FROM s.saleDate) " +
           "ORDER BY EXTRACT(HOUR FROM s.saleDate)")
    fun getSalesSummaryByHourAndTenantId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("tenantId") tenantId: UUID
    ): List<Array<Any>>

    /**
     * Gets top selling products for a specific tenant within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @param limit Maximum number of products to return
     * @return List of product sales summaries
     */
    @Query("SELECT li.product.id, li.product.name, SUM(li.quantity), SUM(li.lineTotal), AVG(li.unitPrice) " +
           "FROM Sale s JOIN s.lineItems li " +
           "WHERE s.saleDate BETWEEN :startDate AND :endDate " +
           "AND s.tenant.id = :tenantId AND s.status = 'COMPLETED' " +
           "GROUP BY li.product.id, li.product.name " +
           "ORDER BY SUM(li.quantity) DESC")
    fun getTopSellingProductsByTenantId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("tenantId") tenantId: UUID,
        pageable: Pageable
    ): Page<Array<Any>>

    /**
     * Checks if a sale number already exists within a tenant.
     * 
     * @param saleNumber The sale number to check
     * @param tenantId The tenant ID to filter by
     * @return True if the sale number exists, false otherwise
     */
    fun existsBySaleNumberAndTenantId(saleNumber: String, tenantId: UUID): Boolean

    /**
     * Gets the next sale number for a specific tenant.
     * 
     * @param tenantId The tenant ID to filter by
     * @return The next sale number
     */
    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(s.saleNumber, 4) AS INTEGER)), 0) + 1 " +
           "FROM Sale s WHERE s.tenant.id = :tenantId " +
           "AND s.saleNumber LIKE CONCAT('SAL', '%')")
    fun getNextSaleNumber(@Param("tenantId") tenantId: UUID): Long


    /**
     * Finds sales that need to be processed (e.g., pending payments).
     * 
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of sales that need processing
     */
    @Query("SELECT s FROM Sale s WHERE s.tenant.id = :tenantId " +
           "AND s.status IN ('PENDING', 'SUSPENDED') " +
           "ORDER BY s.createdAt ASC")
    fun findPendingSalesByTenantId(
        @Param("tenantId") tenantId: UUID,
        pageable: Pageable
    ): Page<Sale>

    /**
     * Finds all sales for a tenant (without pagination).
     * 
     * @param tenantId The tenant ID to filter by
     * @return List of sales for the tenant
     */
    fun findByTenantId(tenantId: UUID): List<Sale>

    /**
     * Finds all sales for a specific branch and tenant (without pagination).
     * 
     * @param branchId The branch ID to filter by
     * @param tenantId The tenant ID to filter by
     * @return List of sales for the branch
     */
    fun findByBranchIdAndTenantId(branchId: UUID, tenantId: UUID): List<Sale>

    /**
     * Finds sales within a date range for a tenant (without pagination).
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @return List of sales within the date range
     */
    fun findBySaleDateBetweenAndTenantIdAndReturnStatus(
        startDate: OffsetDateTime,
        endDate: OffsetDateTime,
        tenantId: UUID,
        returnStatus: SaleReturnStatus
    ): List<Sale>

    /**
     * Finds sales within a date range for a specific branch (without pagination).
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param branchId The branch ID to filter by
     * @param tenantId The tenant ID to filter by
     * @return List of sales within the date range for the branch
     */
    fun findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(
        startDate: OffsetDateTime,
        endDate: OffsetDateTime,
        branchId: UUID,
        tenantId: UUID,
        returnStatus: SaleReturnStatus
    ): List<Sale>

    /**
     * Counts sales within a date range for a specific branch.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param branchId The branch ID to filter by
     * @param tenantId The tenant ID to filter by
     * @return Count of sales within the date range for the branch
     */
    fun countBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(
        startDate: OffsetDateTime,
        endDate: OffsetDateTime,
        branchId: UUID,
        tenantId: UUID,
        returnStatus: SaleReturnStatus = SaleReturnStatus.NONE
    ): Long

    /**
     * Counts sales within a date range for a tenant.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @return Count of sales within the date range
     */
    fun countBySaleDateBetweenAndTenantIdAndReturnStatus(
        startDate: OffsetDateTime,
        endDate: OffsetDateTime,
        tenantId: UUID,
        returnStatus: SaleReturnStatus = SaleReturnStatus.NONE
    ): Long
}
