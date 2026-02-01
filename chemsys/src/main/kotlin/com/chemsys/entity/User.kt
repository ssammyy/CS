package com.chemsys.entity

import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.*
import org.hibernate.annotations.Filter
import org.hibernate.annotations.FilterDef
import org.hibernate.annotations.ParamDef

enum class UserRole {
    PLATFORM_ADMIN, ADMIN, CASHIER, MANAGER
}

@Entity
@Table(name = "users")
@FilterDef(name = "tenantFilter", parameters = [ParamDef(name = "tenantId", type = UUID::class)])
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
data class User(
    @Id
    var id: UUID? = null,
    
    @Column(name = "username", nullable = false, unique = true)
    val username: String,
    
    @Column(name = "password_hash", nullable = false)
    val passwordHash: String,
    
    @Column(name = "email", nullable = false, unique = true)
    val email: String,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,
    
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    val role: UserRole = UserRole.CASHIER,

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_roles",
        joinColumns = [JoinColumn(name = "user_id")],
        inverseJoinColumns = [JoinColumn(name = "role_id")]
    )
    var roles: MutableSet<Role> = mutableSetOf(),
    
    @Column(name = "is_active", nullable = false)
    val isActive: Boolean = true,
    
    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),
    
    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
) {
    @PrePersist
    fun prePersist() {
        if (id == null) id = UUID.randomUUID()
    }
    
    // Helper method to get user's primary branch (if any)
    fun getPrimaryBranchId(): UUID? {
        // This will be populated by the service layer
        return null
    }
}
