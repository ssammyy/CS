package com.chemsys.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.*

/**
 * Approval status for expenses raised by non-admins.
 * Admin-created expenses are set to APPROVED; others require admin approval.
 */
enum class ExpenseStatus {
    PENDING_APPROVAL,
    APPROVED,
    REJECTED
}

/**
 * Expense type classification for reporting and filtering.
 * Covers delivery, marketing, rent, utilities, cashier commissions, and miscellaneous.
 */
enum class ExpenseType {
    /** Delivery of stock / logistics */
    DELIVERY,
    /** Advertisements and marketing */
    ADVERTISEMENTS,
    /** Rent */
    RENT,
    /** Wifi / internet and similar utilities */
    WIFI,
    /** Commissions paid to cashiers */
    COMMISSIONS_PAID,
    /** Miscellaneous expenses */
    MISCELLANEOUS
}

/**
 * Expense entity represents an outgoing cost recorded by the business.
 * Non-admin-created expenses start as PENDING_APPROVAL and must be approved by admin.
 * Only APPROVED expenses are included in financial report totals.
 */
@Entity
@Table(name = "expenses")
data class Expense(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    val branch: Branch,

    @Enumerated(EnumType.STRING)
    @Column(name = "expense_type", nullable = false)
    val expenseType: ExpenseType,

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    val amount: BigDecimal,

    @Column(name = "expense_date", nullable = false)
    val expenseDate: LocalDate,

    @Column(name = "description", columnDefinition = "TEXT")
    val description: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: ExpenseStatus = ExpenseStatus.PENDING_APPROVAL,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    var approvedBy: User? = null,

    @Column(name = "approved_at")
    var approvedAt: OffsetDateTime? = null,

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    var rejectionReason: String? = null,

    @Column(name = "created_by")
    val createdBy: String? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
)
