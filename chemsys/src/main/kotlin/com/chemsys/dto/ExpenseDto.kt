package com.chemsys.dto

import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.NotNull
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.*

/** Response DTO for a single expense. */
data class ExpenseDto(
    val id: UUID,
    val branchId: UUID,
    val branchName: String,
    val expenseType: String,
    val amount: BigDecimal,
    val expenseDate: LocalDate,
    val description: String?,
    val status: String,
    val createdBy: String?,
    val createdAt: OffsetDateTime,
    val approvedByName: String? = null,
    val approvedAt: OffsetDateTime? = null,
    val rejectionReason: String? = null
)

/** Request to create an expense. */
data class CreateExpenseRequest(
    @field:NotNull(message = "Branch ID is required")
    val branchId: UUID,

    @field:NotNull(message = "Expense type is required")
    val expenseType: String,

    @field:NotNull(message = "Amount is required")
    @field:DecimalMin(value = "0.01", message = "Amount must be positive")
    val amount: BigDecimal,

    @field:NotNull(message = "Expense date is required")
    val expenseDate: LocalDate,

    val description: String? = null
)

/** Request to update an expense (all fields optional). */
data class UpdateExpenseRequest(
    val branchId: UUID? = null,
    val expenseType: String? = null,
    val amount: BigDecimal? = null,
    val expenseDate: LocalDate? = null,
    val description: String? = null
)

/** Paginated list of expenses with total amount in range (approved only for total). */
data class ExpenseListResponse(
    val content: List<ExpenseDto>,
    val totalElements: Long,
    val totalPages: Int,
    val size: Int,
    val number: Int,
    val totalAmountInRange: BigDecimal
)

/** List of pending expenses for admin approval (notification center). */
data class PendingExpenseListResponse(
    val items: List<ExpenseDto>,
    val total: Long
)

/** Request body for approve/reject expense. */
data class ApproveRejectExpenseRequest(
    val approved: Boolean,
    val rejectionReason: String? = null
)
