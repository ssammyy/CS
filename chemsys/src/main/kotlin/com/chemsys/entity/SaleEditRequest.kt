package com.chemsys.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

enum class SaleEditRequestType {
    PRICE_CHANGE,
    LINE_DELETE
}

enum class SaleEditRequestStatus {
    PENDING,
    APPROVED,
    REJECTED
}

/**
 * Maker-checker: cashier requests an edit (price change or line delete), admin approves.
 * On approval: price change updates line + sale totals; line delete restores inventory and removes line.
 */
@Entity
@Table(name = "sale_edit_requests")
data class SaleEditRequest(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", nullable = false)
    val sale: Sale,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_line_item_id")
    val saleLineItem: SaleLineItem?,

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false)
    val requestType: SaleEditRequestType,

    @Enumerated(EnumType.STRING)
    @Column(name = "edit_type", nullable = false)
    val editType: SaleEditRequestType,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: SaleEditRequestStatus = SaleEditRequestStatus.PENDING,

    @Column(name = "new_unit_price", precision = 10, scale = 2)
    val newUnitPrice: BigDecimal? = null,

    @Column(name = "reason", columnDefinition = "TEXT")
    val reason: String? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_id", nullable = false)
    val requestedBy: User,

    @Column(name = "requested_at", nullable = false)
    val requestedAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    var approvedBy: User? = null,

    @Column(name = "approved_at")
    var approvedAt: OffsetDateTime? = null,

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    var rejectionReason: String? = null
)
