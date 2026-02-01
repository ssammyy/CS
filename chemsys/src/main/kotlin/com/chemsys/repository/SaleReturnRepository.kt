package com.chemsys.repository

import com.chemsys.entity.ReturnStatus
import com.chemsys.entity.SaleReturn
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
 * Repository interface for SaleReturn entity operations.
 * Provides custom query methods for return management and tracking.
 * 
 * This repository follows the Backend Data Consistency Rule by ensuring:
 * - All queries are filtered by tenant for proper isolation
 * - Proper indexing for performance optimization
 * - Support for return tracking and reporting
 */
@Repository
interface SaleReturnRepository : JpaRepository<SaleReturn, UUID> {

    /**
     * Finds all returns for a specific tenant with pagination.
     * 
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of returns for the tenant
     */
    fun findByTenantId(tenantId: UUID, pageable: Pageable): Page<SaleReturn>

    /**
     * Finds all returns for a specific branch with pagination.
     * 
     * @param branchId The branch ID to filter by
     * @param pageable Pagination information
     * @return Page of returns for the branch
     */
    fun findByBranchId(branchId: UUID, pageable: Pageable): Page<SaleReturn>

    /**
     * Finds a return by return number within a tenant.
     * 
     * @param returnNumber The return number to search for
     * @param tenantId The tenant ID to filter by
     * @return Optional return if found
     */
    fun findByReturnNumberAndTenantId(returnNumber: String, tenantId: UUID): Optional<SaleReturn>


    /**
     * Finds returns within a date range for a specific tenant.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of returns within the date range
     */
    fun findByReturnDateBetweenAndTenantId(
        startDate: OffsetDateTime,
        endDate: OffsetDateTime,
        tenantId: UUID,
        pageable: Pageable
    ): Page<SaleReturn>

    /**
     * Finds returns within a date range for a specific branch.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param branchId The branch ID to filter by
     * @param pageable Pagination information
     * @return Page of returns within the date range for the branch
     */
    fun findByReturnDateBetweenAndBranchId(
        startDate: OffsetDateTime,
        endDate: OffsetDateTime,
        branchId: UUID,
        pageable: Pageable
    ): Page<SaleReturn>

    /**
     * Finds returns with total refund amount within a range.
     * 
     * @param minAmount The minimum refund amount
     * @param maxAmount The maximum refund amount
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of returns within the amount range
     */
    fun findByTotalRefundAmountBetweenAndTenantId(
        minAmount: BigDecimal,
        maxAmount: BigDecimal,
        tenantId: UUID,
        pageable: Pageable
    ): Page<SaleReturn>

    /**
     * Finds returns by original sale ID.
     * 
     * @param originalSaleId The original sale ID to filter by
     * @param pageable Pagination information
     * @return Page of returns for the original sale
     */
    fun findByOriginalSaleId(originalSaleId: UUID, pageable: Pageable): Page<SaleReturn>

    /**
     * Finds returns by original sale ID and tenant ID.
     * 
     * @param originalSaleId The original sale ID to filter by
     * @param tenantId The tenant ID to filter by
     * @return List of returns for the original sale within the tenant
     */
    fun findByOriginalSaleIdAndTenantId(originalSaleId: UUID, tenantId: UUID): List<SaleReturn>

    /**
     * Finds returns processed by a specific user.
     * 
     * @param processedById The user ID who processed the return
     * @param pageable Pagination information
     * @return Page of returns processed by the user
     */
    fun findByProcessedById(processedById: UUID, pageable: Pageable): Page<SaleReturn>

    /**
     * Finds returns by return reason (partial match, case-insensitive).
     * 
     * @param returnReason The return reason to search for
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of returns matching the reason
     */
    @Query("SELECT sr FROM SaleReturn sr WHERE " +
           "LOWER(sr.returnReason) LIKE LOWER(CONCAT('%', :returnReason, '%')) " +
           "AND sr.tenant.id = :tenantId")
    fun findByReturnReasonContainingIgnoreCaseAndTenantId(
        @Param("returnReason") returnReason: String,
        @Param("tenantId") tenantId: UUID,
        pageable: Pageable
    ): Page<SaleReturn>

    /**
     * Gets the total refund amount for a specific tenant within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @return Total refund amount
     */
    @Query("SELECT COALESCE(SUM(sr.totalRefundAmount), 0) FROM SaleReturn sr " +
           "WHERE sr.returnDate BETWEEN :startDate AND :endDate " +
           "AND sr.tenant.id = :tenantId AND sr.status = 'PROCESSED'")
    fun getTotalRefundAmountByDateRangeAndTenantId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("tenantId") tenantId: UUID
    ): BigDecimal

    /**
     * Gets the total refund amount for a specific branch within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param branchId The branch ID to filter by
     * @return Total refund amount
     */
    @Query("SELECT COALESCE(SUM(sr.totalRefundAmount), 0) FROM SaleReturn sr " +
           "WHERE sr.returnDate BETWEEN :startDate AND :endDate " +
           "AND sr.branch.id = :branchId AND sr.status = 'PROCESSED'")
    fun getTotalRefundAmountByDateRangeAndBranchId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("branchId") branchId: UUID
    ): BigDecimal

    /**
     * Gets the count of returns for a specific tenant within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @return Count of returns
     */
    @Query("SELECT COUNT(sr) FROM SaleReturn sr " +
           "WHERE sr.returnDate BETWEEN :startDate AND :endDate " +
           "AND sr.tenant.id = :tenantId")
    fun getReturnsCountByDateRangeAndTenantId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("tenantId") tenantId: UUID
    ): Long

    /**
     * Gets the count of returns for a specific branch within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param branchId The branch ID to filter by
     * @return Count of returns
     */
    @Query("SELECT COUNT(sr) FROM SaleReturn sr " +
           "WHERE sr.returnDate BETWEEN :startDate AND :endDate " +
           "AND sr.branch.id = :branchId")
    fun getReturnsCountByDateRangeAndBranchId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("branchId") branchId: UUID
    ): Long

    /**
     * Gets returns summary by status for a specific tenant within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @return List of status summaries
     */
    @Query("SELECT sr.status, COUNT(sr), SUM(sr.totalRefundAmount) FROM SaleReturn sr " +
           "WHERE sr.returnDate BETWEEN :startDate AND :endDate " +
           "AND sr.tenant.id = :tenantId " +
           "GROUP BY sr.status")
    fun getReturnsSummaryByStatusAndTenantId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("tenantId") tenantId: UUID
    ): List<Array<Any>>

    /**
     * Gets returns summary by reason for a specific tenant within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @param limit Maximum number of reasons to return
     * @return List of reason summaries
     */
    @Query("SELECT sr.returnReason, COUNT(sr), SUM(sr.totalRefundAmount) FROM SaleReturn sr " +
           "WHERE sr.returnDate BETWEEN :startDate AND :endDate " +
           "AND sr.tenant.id = :tenantId " +
           "GROUP BY sr.returnReason " +
           "ORDER BY COUNT(sr) DESC")
    fun getReturnsSummaryByReasonAndTenantId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("tenantId") tenantId: UUID,
        pageable: Pageable
    ): Page<Array<Any>>

    /**
     * Checks if a return number already exists within a tenant.
     * 
     * @param returnNumber The return number to check
     * @param tenantId The tenant ID to filter by
     * @return True if the return number exists, false otherwise
     */
    fun existsByReturnNumberAndTenantId(returnNumber: String, tenantId: UUID): Boolean

    /**
     * Gets the next return number for a specific tenant.
     * 
     * @param tenantId The tenant ID to filter by
     * @return The next return number
     */
    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(sr.returnNumber, 4) AS INTEGER)), 0) + 1 " +
           "FROM SaleReturn sr WHERE sr.tenant.id = :tenantId " +
           "AND sr.returnNumber LIKE CONCAT('RET', '%')")
    fun getNextReturnNumber(@Param("tenantId") tenantId: UUID): Long

    /**
     * Finds pending returns for a specific tenant.
     * 
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of pending returns
     */
    fun findByStatusAndTenantId(status: ReturnStatus, tenantId: UUID, pageable: Pageable): Page<SaleReturn>

    /**
     * Finds returns that need to be processed (e.g., pending approval).
     * 
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of returns that need processing
     */
    @Query("SELECT sr FROM SaleReturn sr WHERE sr.tenant.id = :tenantId " +
           "AND sr.status IN ('PENDING', 'APPROVED') " +
           "ORDER BY sr.createdAt ASC")
    fun findPendingReturnsByTenantId(
        @Param("tenantId") tenantId: UUID,
        pageable: Pageable
    ): Page<SaleReturn>

    /**
     * Gets return statistics for a specific tenant.
     * 
     * @param tenantId The tenant ID to filter by
     * @return Array containing [totalReturns, pendingReturns, processedReturns, rejectedReturns]
     */
    @Query("SELECT " +
           "COUNT(sr), " +
           "SUM(CASE WHEN sr.status = 'PENDING' THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN sr.status = 'PROCESSED' THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN sr.status = 'REJECTED' THEN 1 ELSE 0 END) " +
           "FROM SaleReturn sr WHERE sr.tenant.id = :tenantId")
    fun getReturnStatistics(@Param("tenantId") tenantId: UUID): Array<Long>
}
