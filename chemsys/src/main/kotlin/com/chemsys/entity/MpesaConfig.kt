package com.chemsys.entity

import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.*

/**
 * MpesaConfiguration entity stores M-Pesa integration settings per tenant
 */
@Entity
@Table(name = "mpesa_configurations")
data class MpesaConfiguration(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false, unique = true)
    val tenant: Tenant,

    @Column(name = "enabled", nullable = false)
    var enabled: Boolean = false,

    @Column(name = "tier_enabled", nullable = false)
    var tierEnabled: Boolean = false,

    @Column(name = "default_till_number")
    var defaultTillNumber: String?,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    var updatedAt: OffsetDateTime? = null,

    @OneToMany(mappedBy = "mpesaConfig", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val branchTillNumbers: MutableList<BranchMpesaTill> = mutableListOf()
)

/**
 * BranchMpesaTill entity stores per-branch M-Pesa till numbers
 * Allows different branches to use different till numbers
 */
@Entity
@Table(name = "branch_mpesa_tills")
data class BranchMpesaTill(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mpesa_config_id", nullable = false)
    val mpesaConfig: MpesaConfiguration,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    val branch: Branch,

    @Column(name = "till_number", nullable = false)
    var tillNumber: String,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    var updatedAt: OffsetDateTime? = null
)

/**
 * MpesaTransaction entity tracks all M-Pesa payment interactions
 * Audit trail for all M-Pesa transactions
 */
@Entity
@Table(name = "mpesa_transactions")
data class MpesaTransaction(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", nullable = false)
    val sale: Sale,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,

    @Column(name = "phone_number", nullable = false)
    val phoneNumber: String,

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    val amount: java.math.BigDecimal,

    @Column(name = "till_number", nullable = false)
    val tillNumber: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: MpesaTransactionStatus = MpesaTransactionStatus.PENDING,

    @Column(name = "checkout_request_id")
    var checkoutRequestId: String?,

    @Column(name = "mpesa_receipt_number")
    var mpesaReceiptNumber: String?,

    @Column(name = "error_code")
    var errorCode: String?,

    @Column(name = "error_message")
    var errorMessage: String?,

    @Column(name = "requested_at", nullable = false)
    val requestedAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "completed_at")
    var completedAt: OffsetDateTime? = null,

    @Column(name = "callback_received")
    var callbackReceived: Boolean = false
)

enum class MpesaTransactionStatus {
    PENDING,        // STK Push initiated, waiting for user response
    COMPLETED,      // Payment successful
    FAILED,         // Payment failed
    CANCELLED,      // User cancelled the prompt
    TIMEOUT,        // Request timeout
    ERROR           // System error
}
