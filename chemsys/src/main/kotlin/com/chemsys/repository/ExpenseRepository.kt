package com.chemsys.repository

import com.chemsys.entity.Expense
import com.chemsys.entity.ExpenseStatus
import com.chemsys.entity.ExpenseType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.util.*

@Repository
interface ExpenseRepository : JpaRepository<Expense, UUID> {

    fun findByTenantIdOrderByExpenseDateDescCreatedAtDesc(tenantId: UUID, pageable: Pageable): Page<Expense>

    fun findByTenantIdAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
        tenantId: UUID,
        startDate: LocalDate,
        endDate: LocalDate,
        pageable: Pageable
    ): Page<Expense>

    fun findByTenantIdAndBranchIdAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
        tenantId: UUID,
        branchId: UUID,
        startDate: LocalDate,
        endDate: LocalDate,
        pageable: Pageable
    ): Page<Expense>

    fun findByTenantIdAndExpenseTypeAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
        tenantId: UUID,
        expenseType: ExpenseType,
        startDate: LocalDate,
        endDate: LocalDate,
        pageable: Pageable
    ): Page<Expense>

    fun findByTenantIdAndBranchIdAndExpenseTypeAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
        tenantId: UUID,
        branchId: UUID,
        expenseType: ExpenseType,
        startDate: LocalDate,
        endDate: LocalDate,
        pageable: Pageable
    ): Page<Expense>

    /** Sum only APPROVED expenses for financial reports. */
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.tenant.id = :tenantId AND e.status = :status AND e.expenseDate BETWEEN :startDate AND :endDate")
    fun sumAmountByTenantIdAndStatusAndExpenseDateBetween(
        @Param("tenantId") tenantId: UUID,
        @Param("status") status: ExpenseStatus,
        @Param("startDate") startDate: LocalDate,
        @Param("endDate") endDate: LocalDate
    ): java.math.BigDecimal

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.tenant.id = :tenantId AND e.branch.id = :branchId AND e.status = :status AND e.expenseDate BETWEEN :startDate AND :endDate")
    fun sumAmountByTenantIdAndBranchIdAndStatusAndExpenseDateBetween(
        @Param("tenantId") tenantId: UUID,
        @Param("branchId") branchId: UUID,
        @Param("status") status: ExpenseStatus,
        @Param("startDate") startDate: LocalDate,
        @Param("endDate") endDate: LocalDate
    ): java.math.BigDecimal

    fun findByTenantIdAndStatusOrderByCreatedAtDesc(tenantId: UUID, status: ExpenseStatus, pageable: Pageable): Page<Expense>

    fun countByTenantIdAndStatus(tenantId: UUID, status: ExpenseStatus): Long
}
