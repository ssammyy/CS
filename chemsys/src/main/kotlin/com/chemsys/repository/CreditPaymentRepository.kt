package com.chemsys.repository

import com.chemsys.entity.CreditPayment
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.*

/**
 * Repository interface for CreditPayment entity.
 * Provides data access methods for credit payment tracking.
 */
@Repository
interface CreditPaymentRepository : JpaRepository<CreditPayment, UUID> {

    /**
     * Find all payments for a credit account
     */
    fun findByCreditAccountIdOrderByPaymentDateDesc(creditAccountId: UUID): List<CreditPayment>

    /**
     * Find recent payments for a tenant and branch
     */
    @Query("""
        SELECT cp FROM CreditPayment cp 
        WHERE cp.creditAccount.tenant.id = :tenantId 
        AND cp.creditAccount.branch.id = :branchId 
        ORDER BY cp.paymentDate DESC
    """)
    fun findRecentPayments(
        @Param("tenantId") tenantId: UUID,
        @Param("branchId") branchId: UUID,
        pageable: Pageable
    ): Page<CreditPayment>

    /**
     * Get total payments made for a credit account
     */
    @Query("""
        SELECT COALESCE(SUM(cp.amount), 0) 
        FROM CreditPayment cp 
        WHERE cp.creditAccount.id = :creditAccountId
    """)
    fun getTotalPaymentsForAccount(@Param("creditAccountId") creditAccountId: UUID): java.math.BigDecimal

    /**
     * Find payments by date range
     */
    @Query("""
        SELECT cp FROM CreditPayment cp 
        WHERE cp.creditAccount.tenant.id = :tenantId 
        AND cp.creditAccount.branch.id = :branchId 
        AND cp.paymentDate BETWEEN :startDate AND :endDate
        ORDER BY cp.paymentDate DESC
    """)
    fun findPaymentsByDateRange(
        @Param("tenantId") tenantId: UUID,
        @Param("branchId") branchId: UUID,
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime
    ): List<CreditPayment>

    /**
     * Find payments by user (who received the payment)
     */
    fun findByReceivedByIdOrderByPaymentDateDesc(receivedById: UUID, pageable: Pageable): Page<CreditPayment>

    /**
     * Check if a reference number already exists for a payment method
     */
    fun existsByReferenceNumberAndCreditAccountId(referenceNumber: String, creditAccountId: UUID): Boolean

    /**
     * Find payments by date range for a specific branch
     */
    @Query("""
        SELECT cp FROM CreditPayment cp 
        WHERE cp.creditAccount.tenant.id = :tenantId 
        AND cp.creditAccount.branch.id = :branchId 
        AND cp.paymentDate BETWEEN :startDate AND :endDate
        ORDER BY cp.paymentDate DESC
    """)
    fun findByPaymentDateBetweenAndBranchId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("branchId") branchId: UUID,
        @Param("tenantId") tenantId: UUID
    ): List<CreditPayment>

    /**
     * Find payments by date range for all branches in a tenant
     */
    @Query("""
        SELECT cp FROM CreditPayment cp 
        WHERE cp.creditAccount.tenant.id = :tenantId 
        AND cp.paymentDate BETWEEN :startDate AND :endDate
        ORDER BY cp.paymentDate DESC
    """)
    fun findByPaymentDateBetweenAndTenantId(
        @Param("startDate") startDate: OffsetDateTime,
        @Param("endDate") endDate: OffsetDateTime,
        @Param("tenantId") tenantId: UUID
    ): List<CreditPayment>
}

