package com.chemsys.entity

import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.*

/**
 * Supplier entity represents a vendor or supplier in the procurement system.
 * Each supplier has a unique identifier and is associated with a specific tenant.
 * Suppliers can be categorized and have various statuses for procurement management.
 */
@Entity
@Table(name = "suppliers")
data class Supplier(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "name", nullable = false)
    val name: String,

    @Column(name = "contact_person")
    val contactPerson: String?,

    @Column(name = "phone")
    val phone: String?,

    @Column(name = "email")
    val email: String?,

    @Column(name = "physical_address", columnDefinition = "TEXT")
    val physicalAddress: String?,

    @Column(name = "payment_terms")
    val paymentTerms: String?,

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    val category: SupplierCategory = SupplierCategory.WHOLESALER,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    val status: SupplierStatus = SupplierStatus.ACTIVE,

    @Column(name = "tax_identification_number")
    val taxIdentificationNumber: String?,

    @Column(name = "bank_account_details")
    val bankAccountDetails: String?,

    @Column(name = "credit_limit")
    val creditLimit: Double?,

    @Column(name = "notes", columnDefinition = "TEXT")
    val notes: String?,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,

    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
)

/**
 * Enumeration for supplier categories.
 * Defines the type of supplier (e.g., wholesaler, manufacturer, distributor).
 */
enum class SupplierCategory {
    WHOLESALER,      // Sells products in bulk to retailers
    MANUFACTURER,    // Produces the products directly
    DISTRIBUTOR,     // Distributes products from manufacturers
    IMPORTER,        // Imports products from foreign manufacturers
    SPECIALTY        // Specialized supplier for specific product types
}

/**
 * Enumeration for supplier status.
 * Indicates whether a supplier is active or inactive in the system.
 */
enum class SupplierStatus {
    ACTIVE,          // Supplier is currently active and can be used for procurement
    INACTIVE,        // Supplier is temporarily inactive
    SUSPENDED,       // Supplier is suspended due to issues
    BLACKLISTED      // Supplier is blacklisted and should not be used
}


