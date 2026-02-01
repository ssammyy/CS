package com.chemsys.repository

import com.chemsys.entity.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.*

/**
 * Repository interface for InventoryAuditLog entity operations.
 * Provides custom query methods for audit trail tracking and compliance reporting.
 * 
 * This repository is critical for the Backend Data Consistency Rule as it provides:
 * - Complete audit trail for all inventory mutations
 * - Idempotency checking through unique transaction references
 * - Compliance reporting and data integrity verification
 * - Performance optimization through proper indexing
 */
@Repository
interface InventoryAuditLogRepository : JpaRepository<InventoryAuditLog, UUID> {

    /**
     * Finds all audit logs for a specific tenant with pagination.
     * 
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of audit logs for the tenant
     */
    fun findByTenantId(tenantId: UUID, pageable: Pageable): Page<InventoryAuditLog>

    /**
     * Finds audit logs for a specific product within a tenant.
     * 
     * @param productId The product ID to filter by
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of audit logs for the product
     */
    fun findByProductIdAndTenantId(productId: UUID, tenantId: UUID, pageable: Pageable): Page<InventoryAuditLog>

    /**
     * Finds audit logs for a specific branch within a tenant.
     * 
     * @param branchId The branch ID to filter by
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of audit logs for the branch
     */
    fun findByBranchIdAndTenantId(branchId: UUID, tenantId: UUID, pageable: Pageable): Page<InventoryAuditLog>

    /**
     * Finds audit logs for a specific product and branch combination.
     * 
     * @param productId The product ID to filter by
     * @param branchId The branch ID to filter by
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of audit logs for the product-branch combination
     */
    fun findByProductIdAndBranchIdAndTenantId(
        productId: UUID,
        branchId: UUID,
        tenantId: UUID,
        pageable: Pageable
    ): Page<InventoryAuditLog>

    /**
     * Finds audit logs by transaction type within a tenant.
     * 
     * @param transactionType The transaction type to filter by
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of audit logs with the specified transaction type
     */
    fun findByTransactionTypeAndTenantId(
        transactionType: TransactionType,
        tenantId: UUID,
        pageable: Pageable
    ): Page<InventoryAuditLog>

    /**
     * Finds audit logs by source type within a tenant.
     * 
     * @param sourceType The source type to filter by
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of audit logs with the specified source type
     */
    fun findBySourceTypeAndTenantId(sourceType: SourceType, tenantId: UUID, pageable: Pageable): Page<InventoryAuditLog>

    /**
     * Finds audit logs within a date range for a specific tenant.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of audit logs within the date range
     */
    fun findByPerformedAtBetweenAndTenantId(
        startDate: OffsetDateTime,
        endDate: OffsetDateTime,
        tenantId: UUID,
        pageable: Pageable
    ): Page<InventoryAuditLog>

    /**
     * Finds audit logs by source reference and source type.
     * This is used for idempotency checking to prevent duplicate processing.
     * 
     * @param sourceReference The source reference to search for
     * @param sourceType The source type to filter by
     * @param tenantId The tenant ID to filter by
     * @return List of audit logs matching the source reference and type
     */
    fun findBySourceReferenceAndSourceTypeAndTenantId(
        sourceReference: String,
        sourceType: SourceType,
        tenantId: UUID
    ): List<InventoryAuditLog>

    /**
     * Checks if an audit log already exists for a specific source reference and type.
     * This is used for idempotency checking to prevent duplicate processing.
     * 
     * @param sourceReference The source reference to check
     * @param sourceType The source type to check
     * @param tenantId The tenant ID to filter by
     * @return True if an audit log exists, false otherwise
     */
    fun existsBySourceReferenceAndSourceTypeAndTenantId(
        sourceReference: String,
        sourceType: SourceType,
        tenantId: UUID
    ): Boolean

    /**
     * Finds audit logs by performed by user within a tenant.
     * 
     * @param performedById The user ID who performed the transaction
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of audit logs performed by the user
     */
    fun findByPerformedByIdAndTenantId(performedById: UUID, tenantId: UUID, pageable: Pageable): Page<InventoryAuditLog>

    /**
     * Finds audit logs by batch number within a tenant.
     * 
     * @param batchNumber The batch number to search for
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of audit logs for the batch number
     */
    fun findByBatchNumberAndTenantId(batchNumber: String, tenantId: UUID, pageable: Pageable): Page<InventoryAuditLog>

    /**
     * Finds audit logs by expiry date within a tenant.
     * 
     * @param expiryDate The expiry date to search for
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of audit logs for the expiry date
     */
    fun findByExpiryDateAndTenantId(expiryDate: java.time.LocalDate, tenantId: UUID, pageable: Pageable): Page<InventoryAuditLog>

    /**
     * Finds duplicate audit logs within a tenant.
     * 
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of duplicate audit logs
     */
    fun findByIsDuplicateTrueAndTenantId(tenantId: UUID, pageable: Pageable): Page<InventoryAuditLog>

    /**
     * Gets the current inventory quantity for a specific product and branch.
     * This is calculated by summing all quantity changes for the product-branch combination.
     * 
     * @param productId The product ID to check
     * @param branchId The branch ID to check
     * @param tenantId The tenant ID to filter by
     * @return Current inventory quantity
     */
    @Query("SELECT COALESCE(SUM(ial.quantityChanged), 0) FROM InventoryAuditLog ial " +
           "WHERE ial.product.id = :productId AND ial.branch.id = :branchId AND ial.tenant.id = :tenantId")
    fun getCurrentInventoryQuantity(
        @Param("productId") productId: UUID,
        @Param("branchId") branchId: UUID,
        @Param("tenantId") tenantId: UUID
    ): Int

    /**
     * Gets the inventory quantity at a specific point in time for a product and branch.
     * 
     * @param productId The product ID to check
     * @param branchId The branch ID to check
     * @param tenantId The tenant ID to filter by
     * @param asOfDate The date to check inventory as of
     * @return Inventory quantity at the specified date
     */
    @Query("SELECT COALESCE(SUM(ial.quantityChanged), 0) FROM InventoryAuditLog ial " +
           "WHERE ial.product.id = :productId AND ial.branch.id = :branchId AND ial.tenant.id = :tenantId " +
           "AND ial.performedAt <= :asOfDate")
    fun getInventoryQuantityAsOfDate(
        @Param("productId") productId: UUID,
        @Param("branchId") branchId: UUID,
        @Param("tenantId") tenantId: UUID,
        @Param("asOfDate") asOfDate: OffsetDateTime
    ): Int

    /**
     * Gets inventory movement summary for a specific product within a date range.
     * 
     * @param productId The product ID to check
     * @param tenantId The tenant ID to filter by
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @return List of movement summaries by transaction type
     */
    @Query("SELECT ial.transactionType, SUM(ial.quantityChanged), COUNT(ial) " +
           "FROM InventoryAuditLog ial " +
           "WHERE ial.product.id = :productId AND ial.tenant.id = :tenantId " +
           "AND ial.performedAt BETWEEN :startDate AND :endDate " +
           "GROUP BY ial.transactionType")
    fun getInventoryMovementSummaryByProduct(
        @Param("productId") productId: UUID,
        @Param("tenantId") tenantId: UUID,
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime
    ): List<Array<Any>>

    /**
     * Gets inventory movement summary for a specific branch within a date range.
     * 
     * @param branchId The branch ID to check
     * @param tenantId The tenant ID to filter by
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @return List of movement summaries by transaction type
     */
    @Query("SELECT ial.transactionType, SUM(ial.quantityChanged), COUNT(ial) " +
           "FROM InventoryAuditLog ial " +
           "WHERE ial.branch.id = :branchId AND ial.tenant.id = :tenantId " +
           "AND ial.performedAt BETWEEN :startDate AND :endDate " +
           "GROUP BY ial.transactionType")
    fun getInventoryMovementSummaryByBranch(
        @Param("branchId") branchId: UUID,
        @Param("tenantId") tenantId: UUID,
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime
    ): List<Array<Any>>

    /**
     * Gets the count of audit logs for a specific tenant within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @return Count of audit logs
     */
    @Query("SELECT COUNT(ial) FROM InventoryAuditLog ial " +
           "WHERE ial.performedAt BETWEEN :startDate AND :endDate " +
           "AND ial.tenant.id = :tenantId")
    fun getAuditLogsCountByDateRangeAndTenantId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("tenantId") tenantId: UUID
    ): Long

    /**
     * Gets audit log statistics for a specific tenant.
     * 
     * @param tenantId The tenant ID to filter by
     * @return Array containing [totalLogs, duplicateLogs, uniqueLogs]
     */
    @Query("SELECT " +
           "COUNT(ial), " +
           "SUM(CASE WHEN ial.isDuplicate = true THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN ial.isDuplicate = false THEN 1 ELSE 0 END) " +
           "FROM InventoryAuditLog ial WHERE ial.tenant.id = :tenantId")
    fun getAuditLogStatistics(@Param("tenantId") tenantId: UUID): Array<Long>

    /**
     * Finds audit logs that need to be reviewed (e.g., potential duplicates or anomalies).
     * 
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of audit logs that need review
     */
    @Query("SELECT ial FROM InventoryAuditLog ial WHERE ial.tenant.id = :tenantId " +
           "AND (ial.isDuplicate = true OR ial.quantityChanged = 0) " +
           "ORDER BY ial.performedAt DESC")
    fun findAuditLogsNeedingReview(
        @Param("tenantId") tenantId: UUID,
        pageable: Pageable
    ): Page<InventoryAuditLog>

    /**
     * Gets the latest audit log for a specific product and branch combination.
     * 
     * @param productId The product ID to check
     * @param branchId The branch ID to check
     * @param tenantId The tenant ID to filter by
     * @return Optional latest audit log
     */
    @Query("SELECT ial FROM InventoryAuditLog ial " +
           "WHERE ial.product.id = :productId AND ial.branch.id = :branchId AND ial.tenant.id = :tenantId " +
           "ORDER BY ial.performedAt DESC")
    fun findLatestAuditLogByProductAndBranch(
        @Param("productId") productId: UUID,
        @Param("branchId") branchId: UUID,
        @Param("tenantId") tenantId: UUID,
        pageable: Pageable
    ): Page<InventoryAuditLog>
}

