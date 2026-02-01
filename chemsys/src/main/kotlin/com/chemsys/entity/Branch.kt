package com.chemsys.entity

import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.*

/**
 * Branch entity represents a physical location of a pharmacy under a tenant.
 * Each branch can have multiple users assigned to it and operates independently
 * for inventory, sales, and reporting purposes.
 */
@Entity
@Table(name = "branches")
data class Branch(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "name", nullable = false)
    val name: String,

    @Column(name = "location", nullable = false)
    val location: String,

    @Column(name = "contact_email")
    val contactEmail: String?,

    @Column(name = "contact_phone")
    val contactPhone: String?,

    @Column(name = "address", columnDefinition = "TEXT")
    val address: String?,

    @Column(name = "is_active", nullable = false)
    val isActive: Boolean = true,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
)
