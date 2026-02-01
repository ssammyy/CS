package com.chemsys.repository

import com.chemsys.entity.CreditAccount
import com.chemsys.entity.CreditStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.util.*

/**
 * Repository interface for CreditAccount entity.
 * Provides data access methods for credit account management.
 */
@Repository
interface CreditAccountRepository : JpaRepository<CreditAccount, UUID> {

    /**
     * Find all credit accounts for a specific tenant and branch
     */
    fun findByTenantIdAndBranchId(tenantId: UUID, branchId: UUID, pageable: Pageable): Page<CreditAccount>

    /**
     * Find credit accounts by customer
     */
    fun findByCustomerIdAndTenantId(customerId: UUID, tenantId: UUID): List<CreditAccount>

    /**
     * Find credit accounts by status
     */
    fun findByStatusAndTenantIdAndBranchId(
        status: CreditStatus, 
        tenantId: UUID, 
        branchId: UUID, 
        pageable: Pageable
    ): Page<CreditAccount>

    /**
     * Find overdue credit accounts (past expected payment date)
     */
    @Query("""
        SELECT ca FROM CreditAccount ca 
        WHERE ca.tenant.id = :tenantId 
        AND ca.branch.id = :branchId 
        AND ca.status IN ('ACTIVE', 'OVERDUE')
        AND ca.expectedPaymentDate < :currentDate
    """)
    fun findOverdueAccounts(
        @Param("tenantId") tenantId: UUID,
        @Param("branchId") branchId: UUID,
        @Param("currentDate") currentDate: LocalDate
    ): List<CreditAccount>

    /**
     * Find credit accounts by sale
     */
    fun findBySaleId(saleId: UUID): Optional<CreditAccount>

    /**
     * Get total outstanding amount for a tenant and branch
     */
    @Query("""
        SELECT COALESCE(SUM(ca.remainingAmount), 0) 
        FROM CreditAccount ca 
        WHERE ca.tenant.id = :tenantId 
        AND ca.branch.id = :branchId 
        AND ca.status IN ('ACTIVE', 'OVERDUE')
    """)
    fun getTotalOutstandingAmount(@Param("tenantId") tenantId: UUID, @Param("branchId") branchId: UUID): java.math.BigDecimal

    /**
     * Get overdue amount for a tenant and branch
     */
    @Query("""
        SELECT COALESCE(SUM(ca.remainingAmount), 0) 
        FROM CreditAccount ca 
        WHERE ca.tenant.id = :tenantId 
        AND ca.branch.id = :branchId 
        AND ca.status = 'OVERDUE'
    """)
    fun getOverdueAmount(@Param("tenantId") tenantId: UUID, @Param("branchId") branchId: UUID): java.math.BigDecimal

    /**
     * Count active credit accounts
     */
    fun countByStatusAndTenantIdAndBranchId(status: CreditStatus, tenantId: UUID, branchId: UUID): Long

    /**
     * Find credit accounts by customer and status
     */
    fun findByCustomerIdAndStatusAndTenantId(customerId: UUID, status: CreditStatus, tenantId: UUID): List<CreditAccount>

    /**
     * Check if a sale already has a credit account
     */
    fun existsBySaleId(saleId: UUID): Boolean

    /**
     * Count credit accounts by tenant, branch, and credit number prefix
     */
    fun countByTenantIdAndBranchIdAndCreditNumberStartingWith(tenantId: UUID, branchId: UUID, prefix: String): Long

    /**
     * Count all credit accounts for a tenant
     */
    @Query("""
        SELECT COUNT(ca) FROM CreditAccount ca 
        WHERE ca.tenant.id = :tenantId 
        AND ca.status IN ('ACTIVE', 'OVERDUE')
    """)
    fun countByTenantId(@Param("tenantId") tenantId: UUID): Long

    /**
     * Count credit accounts for a specific branch
     */
    @Query("""
        SELECT COUNT(ca) FROM CreditAccount ca 
        WHERE ca.tenant.id = :tenantId 
        AND ca.branch.id = :branchId 
        AND ca.status IN ('ACTIVE', 'OVERDUE')
    """)
    fun countByBranchIdAndTenantId(@Param("branchId") branchId: UUID, @Param("tenantId") tenantId: UUID): Long

    /**
     * Get total outstanding amount for all branches in a tenant
     */
    @Query("""
        SELECT COALESCE(SUM(ca.remainingAmount), 0) 
        FROM CreditAccount ca 
        WHERE ca.tenant.id = :tenantId 
        AND ca.status IN ('ACTIVE', 'OVERDUE')
    """)
    fun getTotalOutstandingAmountForTenant(@Param("tenantId") tenantId: UUID): java.math.BigDecimal

    /**
     * Count overdue accounts for all branches in a tenant
     */
    @Query("""
        SELECT COUNT(ca) FROM CreditAccount ca 
        WHERE ca.tenant.id = :tenantId 
        AND ca.status IN ('ACTIVE', 'OVERDUE')
        AND ca.expectedPaymentDate < :currentDate
    """)
    fun countOverdueAccountsForTenant(@Param("tenantId") tenantId: UUID, @Param("currentDate") currentDate: LocalDate): Long

    /**
     * Count overdue accounts for a specific branch
     */
    @Query("""
        SELECT COUNT(ca) FROM CreditAccount ca 
        WHERE ca.tenant.id = :tenantId 
        AND ca.branch.id = :branchId 
        AND ca.status IN ('ACTIVE', 'OVERDUE')
        AND ca.expectedPaymentDate < :currentDate
    """)
    fun countOverdueAccounts(@Param("tenantId") tenantId: UUID, @Param("branchId") branchId: UUID, @Param("currentDate") currentDate: LocalDate): Long

    /**
     * Get overdue amount for all branches in a tenant
     */
    @Query("""
        SELECT COALESCE(SUM(ca.remainingAmount), 0) 
        FROM CreditAccount ca 
        WHERE ca.tenant.id = :tenantId 
        AND ca.status = 'OVERDUE'
    """)
    fun getOverdueAmountForTenant(@Param("tenantId") tenantId: UUID): java.math.BigDecimal
}
