package com.chemsys.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.time.LocalDate
import java.util.*

/**
 * CreditAccount entity represents a credit account for a customer.
 * Tracks items sold on credit, payment status, and installment payments.
 * 
 * This entity follows the Backend Data Consistency Rule by ensuring:
 * - All credit accounts are linked to a specific tenant and branch for proper isolation
 * - Audit trail through creation timestamps and user tracking
 * - Proper relationships with sales for complete transaction history
 */
@Entity
@Table(name = "credit_accounts")
data class CreditAccount(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "credit_number", nullable = false, unique = true)
    val creditNumber: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    val branch: Branch,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    val customer: Customer,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", nullable = false)
    val sale: Sale,

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    val totalAmount: BigDecimal,

    @Column(name = "paid_amount", nullable = false, precision = 15, scale = 2)
    val paidAmount: BigDecimal = BigDecimal.ZERO,

    @Column(name = "remaining_amount", nullable = false, precision = 15, scale = 2)
    val remainingAmount: BigDecimal,

    @Column(name = "expected_payment_date", nullable = false)
    val expectedPaymentDate: LocalDate,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    val status: CreditStatus = CreditStatus.ACTIVE,

    @Column(name = "notes", columnDefinition = "TEXT")
    val notes: String?,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    val createdBy: User,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null,

    @Column(name = "closed_at")
    val closedAt: OffsetDateTime? = null,

    // One-to-many relationship with credit payments
    @OneToMany(mappedBy = "creditAccount", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val payments: MutableList<CreditPayment> = mutableListOf()
)

/**
 * CreditPayment entity tracks installment payments for credit accounts.
 * Records partial payments made by customers over time.
 */
@Entity
@Table(name = "credit_payments")
data class CreditPayment(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "payment_number", nullable = false, unique = true)
    val paymentNumber: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_account_id", nullable = false)
    val creditAccount: CreditAccount,

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    val amount: BigDecimal,

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    val paymentMethod: PaymentMethod,

    @Column(name = "reference_number")
    val referenceNumber: String?,

    @Column(name = "notes")
    val notes: String?,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "received_by", nullable = false)
    val receivedBy: User,

    @Column(name = "payment_date", nullable = false)
    val paymentDate: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),
//    createdBy: User // Optionally track who created the payment record

)

/**
 * Enum for credit account status
 */
enum class CreditStatus {
    ACTIVE,         // Credit account is active and has outstanding balance
    PAID,           // Credit account is fully paid
    OVERDUE,        // Credit account is past due date
    CLOSED,         // Credit account is closed (written off or settled)
    SUSPENDED       // Credit account is suspended
}
