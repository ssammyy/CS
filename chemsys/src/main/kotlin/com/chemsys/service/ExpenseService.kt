package com.chemsys.service

import com.chemsys.config.TenantContext
import com.chemsys.dto.*
import com.chemsys.entity.Expense
import com.chemsys.entity.ExpenseStatus
import com.chemsys.entity.ExpenseType
import com.chemsys.entity.UserRole
import com.chemsys.repository.BranchRepository
import com.chemsys.repository.ExpenseRepository
import com.chemsys.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.*

/**
 * Service for managing expenses (delivery, advertisements, rent, wifi, commissions paid, miscellaneous).
 * Non-admins create expenses as PENDING_APPROVAL; admins approve/reject via notification flow.
 * Only APPROVED expenses are included in financial report totals.
 */
@Service
class ExpenseService(
    private val expenseRepository: ExpenseRepository,
    private val branchRepository: BranchRepository,
    private val userRepository: UserRepository
) {
    companion object {
        private val logger = LoggerFactory.getLogger(ExpenseService::class.java)
    }

    private fun getCurrentUsername(): String? =
        SecurityContextHolder.getContext()?.authentication?.name

    private fun getCurrentUser(): com.chemsys.entity.User? =
        getCurrentUsername()?.let { userRepository.findByUsername(it) }

    private fun isCurrentUserAdmin(): Boolean {
        val user = getCurrentUser() ?: return false
        return user.role == UserRole.ADMIN || user.role == UserRole.PLATFORM_ADMIN
    }

    /**
     * Creates a new expense. Admin/PlatformAdmin: status APPROVED and approvedBy set.
     * Others: status PENDING_APPROVAL until admin approves (notification).
     */
    @Transactional
    fun create(request: CreateExpenseRequest): ExpenseDto {
        val tenantId = TenantContext.getCurrentTenant() ?: throw RuntimeException("No tenant context found")
        val branch = branchRepository.findById(request.branchId)
            .orElseThrow { RuntimeException("Branch not found: ${request.branchId}") }
        if (branch.tenant.id != tenantId) {
            throw RuntimeException("Branch does not belong to current tenant")
        }
        val expenseType = parseExpenseType(request.expenseType)
        val now = OffsetDateTime.now()
        val currentUser = getCurrentUser()
        val isAdmin = isCurrentUserAdmin()

        val expense = Expense(
            tenant = branch.tenant,
            branch = branch,
            expenseType = expenseType,
            amount = request.amount,
            expenseDate = request.expenseDate,
            description = request.description,
            status = if (isAdmin) ExpenseStatus.APPROVED else ExpenseStatus.PENDING_APPROVAL,
            approvedBy = if (isAdmin) currentUser else null,
            approvedAt = if (isAdmin) now else null,
            createdBy = getCurrentUsername()
        )
        val saved = expenseRepository.save(expense)
        return toDto(saved)
    }

    /**
     * Updates an existing expense. Non-admins may only update PENDING_APPROVAL; admins may update any expense.
     */
    @Transactional
    fun update(id: UUID, request: UpdateExpenseRequest): ExpenseDto {
        val tenantId = TenantContext.getCurrentTenant() ?: throw RuntimeException("No tenant context found")
        val expense = expenseRepository.findById(id)
            .orElseThrow { RuntimeException("Expense not found: $id") }
        if (expense.tenant.id != tenantId) {
            throw RuntimeException("Expense does not belong to current tenant")
        }
        val isAdmin = isCurrentUserAdmin()
        if (!isAdmin && expense.status != ExpenseStatus.PENDING_APPROVAL) {
            throw RuntimeException("Only pending expenses can be updated")
        }
        val updated = expense.copy(
            branch = request.branchId?.let { bid ->
                val b = branchRepository.findById(bid).orElseThrow { RuntimeException("Branch not found: $bid") }
                if (b.tenant.id != tenantId) throw RuntimeException("Branch does not belong to tenant")
                b
            } ?: expense.branch,
            expenseType = request.expenseType?.let { parseExpenseType(it) } ?: expense.expenseType,
            amount = request.amount ?: expense.amount,
            expenseDate = request.expenseDate ?: expense.expenseDate,
            description = request.description ?: expense.description
        )
        val saved = expenseRepository.save(updated)
        return toDto(saved)
    }

    /**
     * Deletes an expense by id (tenant-scoped). Non-admins may only delete PENDING_APPROVAL; admins may delete any expense.
     */
    @Transactional
    fun delete(id: UUID) {
        val tenantId = TenantContext.getCurrentTenant() ?: throw RuntimeException("No tenant context found")
        val expense = expenseRepository.findById(id)
            .orElseThrow { RuntimeException("Expense not found: $id") }
        if (expense.tenant.id != tenantId) {
            throw RuntimeException("Expense does not belong to current tenant")
        }
        val isAdmin = isCurrentUserAdmin()
        if (!isAdmin && expense.status != ExpenseStatus.PENDING_APPROVAL) {
            throw RuntimeException("Only pending expenses can be deleted")
        }
        expenseRepository.delete(expense)
    }

    /**
     * Returns a single expense by id (tenant-scoped).
     */
    @Transactional(readOnly = true)
    fun getById(id: UUID): ExpenseDto {
        val tenantId = TenantContext.getCurrentTenant() ?: throw RuntimeException("No tenant context found")
        val expense = expenseRepository.findById(id)
            .orElseThrow { RuntimeException("Expense not found: $id") }
        if (expense.tenant.id != tenantId) {
            throw RuntimeException("Expense does not belong to current tenant")
        }
        return toDto(expense)
    }

    /**
     * Lists expenses with optional filters: branch, expense type, date range.
     * Default date range: start of current month to today.
     */
    @Transactional(readOnly = true)
    fun list(
        branchId: UUID?,
        expenseType: String?,
        startDate: LocalDate,
        endDate: LocalDate,
        page: Int,
        size: Int
    ): ExpenseListResponse {
        val tenantId = TenantContext.getCurrentTenant() ?: throw RuntimeException("No tenant context found")
        val pageable: Pageable = PageRequest.of(page.coerceAtLeast(0), size.coerceIn(1, 100))

        val pageResult = when {
            branchId != null && expenseType != null -> {
                val type = parseExpenseType(expenseType)
                expenseRepository.findByTenantIdAndBranchIdAndExpenseTypeAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
                    tenantId, branchId, type, startDate, endDate, pageable
                )
            }
            branchId != null -> {
                expenseRepository.findByTenantIdAndBranchIdAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
                    tenantId, branchId, startDate, endDate, pageable
                )
            }
            expenseType != null -> {
                val type = parseExpenseType(expenseType)
                expenseRepository.findByTenantIdAndExpenseTypeAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
                    tenantId, type, startDate, endDate, pageable
                )
            }
            else -> {
                expenseRepository.findByTenantIdAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
                    tenantId, startDate, endDate, pageable
                )
            }
        }

        val totalAmount = if (branchId != null)
            expenseRepository.sumAmountByTenantIdAndBranchIdAndStatusAndExpenseDateBetween(tenantId, branchId, ExpenseStatus.APPROVED, startDate, endDate)
        else
            expenseRepository.sumAmountByTenantIdAndStatusAndExpenseDateBetween(tenantId, ExpenseStatus.APPROVED, startDate, endDate)
        val dtos = pageResult.content.map { toDto(it) }

        return ExpenseListResponse(
            content = dtos,
            totalElements = pageResult.totalElements,
            totalPages = pageResult.totalPages,
            size = pageResult.size,
            number = pageResult.number,
            totalAmountInRange = totalAmount
        )
    }

    /**
     * List expenses pending admin approval (for notification center).
     */
    @Transactional(readOnly = true)
    fun listPending(page: Int, size: Int): PendingExpenseListResponse {
        val tenantId = TenantContext.getCurrentTenant() ?: throw RuntimeException("No tenant context found")
        val pageable = PageRequest.of(page.coerceAtLeast(0), size.coerceIn(1, 50))
        val pageResult = expenseRepository.findByTenantIdAndStatusOrderByCreatedAtDesc(tenantId, ExpenseStatus.PENDING_APPROVAL, pageable)
        val total = expenseRepository.countByTenantIdAndStatus(tenantId, ExpenseStatus.PENDING_APPROVAL)
        return PendingExpenseListResponse(
            items = pageResult.content.map { toDto(it) },
            total = total
        )
    }

    @Transactional(readOnly = true)
    fun getPendingCount(): Long {
        val tenantId = TenantContext.getCurrentTenant() ?: throw RuntimeException("No tenant context found")
        return expenseRepository.countByTenantIdAndStatus(tenantId, ExpenseStatus.PENDING_APPROVAL)
    }

    /**
     * Admin approves an expense. Only PENDING_APPROVAL can be approved.
     */
    @Transactional
    fun approve(id: UUID): ExpenseDto {
        val tenantId = TenantContext.getCurrentTenant() ?: throw RuntimeException("No tenant context found")
        val currentUser = getCurrentUser() ?: throw RuntimeException("User not found")
        if (currentUser.role != UserRole.ADMIN && currentUser.role != UserRole.PLATFORM_ADMIN) {
            throw RuntimeException("Only admins can approve expenses")
        }
        val expense = expenseRepository.findById(id)
            .orElseThrow { RuntimeException("Expense not found: $id") }
        if (expense.tenant.id != tenantId) throw RuntimeException("Expense does not belong to current tenant")
        if (expense.status != ExpenseStatus.PENDING_APPROVAL) throw RuntimeException("Expense is not pending approval")
        expense.status = ExpenseStatus.APPROVED
        expense.approvedBy = currentUser
        expense.approvedAt = OffsetDateTime.now()
        expense.rejectionReason = null
        val saved = expenseRepository.save(expense)
        return toDto(saved)
    }

    /**
     * Admin rejects an expense. Only PENDING_APPROVAL can be rejected.
     */
    @Transactional
    fun reject(id: UUID, rejectionReason: String?): ExpenseDto {
        val tenantId = TenantContext.getCurrentTenant() ?: throw RuntimeException("No tenant context found")
        val currentUser = getCurrentUser() ?: throw RuntimeException("User not found")
        if (currentUser.role != UserRole.ADMIN && currentUser.role != UserRole.PLATFORM_ADMIN) {
            throw RuntimeException("Only admins can reject expenses")
        }
        val expense = expenseRepository.findById(id)
            .orElseThrow { RuntimeException("Expense not found: $id") }
        if (expense.tenant.id != tenantId) throw RuntimeException("Expense does not belong to current tenant")
        if (expense.status != ExpenseStatus.PENDING_APPROVAL) throw RuntimeException("Expense is not pending approval")
        expense.status = ExpenseStatus.REJECTED
        expense.approvedBy = currentUser
        expense.approvedAt = OffsetDateTime.now()
        expense.rejectionReason = rejectionReason
        val saved = expenseRepository.save(expense)
        return toDto(saved)
    }

    private fun toDto(e: Expense): ExpenseDto {
        return ExpenseDto(
            id = e.id!!,
            branchId = e.branch.id!!,
            branchName = e.branch.name,
            expenseType = e.expenseType.name,
            amount = e.amount,
            expenseDate = e.expenseDate,
            description = e.description,
            status = e.status.name,
            createdBy = e.createdBy,
            createdAt = e.createdAt,
            approvedByName = e.approvedBy?.username,
            approvedAt = e.approvedAt,
            rejectionReason = e.rejectionReason
        )
    }

    private fun parseExpenseType(value: String): ExpenseType {
        return try {
            ExpenseType.valueOf(value.uppercase())
        } catch (e: IllegalArgumentException) {
            throw RuntimeException("Invalid expense type: $value. Valid: ${ExpenseType.entries.joinToString { it.name }}")
        }
    }
}
