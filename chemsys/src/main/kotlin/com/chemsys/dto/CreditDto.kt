package com.chemsys.dto

import com.chemsys.entity.CreditAccount
import com.chemsys.entity.CreditPayment
import com.chemsys.entity.CreditStatus
import com.chemsys.entity.PaymentMethod
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.time.LocalDate
import java.util.*

/**
 * DTOs for credit account management.
 * Provides data transfer objects for credit sales and installment payments.
 */

/**
 * Request DTO for creating a new credit account
 */
data class CreateCreditAccountRequest(
    val saleId: UUID,
    val customerId: UUID,
    val totalAmount: BigDecimal,
    val expectedPaymentDate: LocalDate,
    val notes: String? = null,
    val paidAmount: BigDecimal? = null, // Nullable to support zero-payment credit sales
    val remainingAmount: BigDecimal? = null
)

/**
 * Response DTO for credit account information
 */
data class CreditAccountDto(
    val id: UUID,
    val creditNumber: String,
    val customer: CustomerDto,
    val sale: SaleDto,
    val totalAmount: BigDecimal,
    val paidAmount: BigDecimal,
    val remainingAmount: BigDecimal,
    val expectedPaymentDate: LocalDate,
    val status: CreditStatus,
    val notes: String?,
    val createdBy: UserDto,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime?,
    val closedAt: OffsetDateTime?,
    val payments: List<CreditPaymentDto> = emptyList()
)

/**
 * Request DTO for making a credit payment
 */
data class CreateCreditPaymentRequest(
    val creditAccountId: UUID,
    val amount: BigDecimal,
    val paymentMethod: PaymentMethod,
    val referenceNumber: String? = null,
    val notes: String? = null
)

/**
 * Response DTO for credit payment information
 */
data class CreditPaymentDto(
    val id: UUID,
    val paymentNumber: String,
    val creditAccountId: UUID,
    val amount: BigDecimal,
    val paymentMethod: PaymentMethod,
    val referenceNumber: String?,
    val notes: String?,
    val receivedBy: UserDto,
    val paymentDate: OffsetDateTime,
    val createdAt: OffsetDateTime
)

/**
 * Request DTO for updating credit account status
 */
data class UpdateCreditAccountStatusRequest(
    val status: CreditStatus,
    val notes: String? = null
)

/**
 * Response DTO for credit account summary (for lists)
 */
data class CreditAccountSummaryDto(
    val id: UUID,
    val creditNumber: String,
    val customerName: String,
    val customerPhone: String?,
    val totalAmount: BigDecimal,
    val paidAmount: BigDecimal,
    val remainingAmount: BigDecimal,
    val expectedPaymentDate: LocalDate,
    val status: CreditStatus,
    val createdAt: OffsetDateTime,
    val isOverdue: Boolean
)

/**
 * Response DTO for credit dashboard statistics
 */
data class CreditDashboardDto(
    val totalActiveAccounts: Long,
    val totalOutstandingAmount: BigDecimal,
    val overdueAccounts: Long,
    val overdueAmount: BigDecimal,
    val recentPayments: List<CreditPaymentDto>
)

/**
 * Request DTO for filtering credit accounts
 */
data class CreditAccountFilterRequest(
    val customerId: UUID? = null,
    val status: CreditStatus? = null,
    val branchId: UUID? = null,
    val isOverdue: Boolean? = null,
    val expectedPaymentDateFrom: LocalDate? = null,
    val expectedPaymentDateTo: LocalDate? = null,
    val page: Int = 0,
    val size: Int = 20
)

/**
 * Extension functions to convert entities to DTOs
 */
fun CreditAccount.toDto(
    customer: CustomerDto,
    sale: SaleDto,
    createdBy: UserDto,
    payments: List<CreditPaymentDto> = emptyList()
): CreditAccountDto {
    return CreditAccountDto(
        id = this.id!!,
        creditNumber = this.creditNumber,
        customer = customer,
        sale = sale,
        totalAmount = this.totalAmount,
        paidAmount = this.paidAmount,
        remainingAmount = this.remainingAmount,
        expectedPaymentDate = this.expectedPaymentDate,
        status = this.status,
        notes = this.notes,
        createdBy = createdBy,
        createdAt = this.createdAt,
        updatedAt = this.updatedAt,
        closedAt = this.closedAt,
        payments = payments
    )
}

fun CreditAccount.toSummaryDto(): CreditAccountSummaryDto {
    return CreditAccountSummaryDto(
        id = this.id!!,
        creditNumber = this.creditNumber,
        customerName = "${this.customer.firstName} ${this.customer.lastName}",
        customerPhone = this.customer.phone,
        totalAmount = this.totalAmount,
        paidAmount = this.paidAmount,
        remainingAmount = this.remainingAmount,
        expectedPaymentDate = this.expectedPaymentDate,
        status = this.status,
        createdAt = this.createdAt,
        isOverdue = this.status == CreditStatus.OVERDUE || 
                   (this.status == CreditStatus.ACTIVE && this.expectedPaymentDate.isBefore(LocalDate.now()))
    )
}

fun CreditPayment.toDto(receivedBy: UserDto): CreditPaymentDto {
    return CreditPaymentDto(
        id = this.id!!,
        paymentNumber = this.paymentNumber,
        creditAccountId = this.creditAccount.id!!,
        amount = this.amount,
        paymentMethod = this.paymentMethod,
        referenceNumber = this.referenceNumber,
        notes = this.notes,
        receivedBy = receivedBy,
        paymentDate = this.paymentDate,
        createdAt = this.createdAt
    )
}
