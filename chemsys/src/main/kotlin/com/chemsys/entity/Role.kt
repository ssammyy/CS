package com.chemsys.entity

import jakarta.persistence.*
import java.util.*

@Entity
@Table(name = "roles",
    uniqueConstraints = [UniqueConstraint(name = "uq_roles_tenant_name", columnNames = ["tenant_id", "name"])])
data class Role(
    @Id
    var id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id")
    val tenant: Tenant? = null,

    @Column(name = "name", nullable = false)
    val name: String,

    @Column(name = "is_system", nullable = false)
    val isSystem: Boolean = false,

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "role_permissions",
        joinColumns = [JoinColumn(name = "role_id")],
        inverseJoinColumns = [JoinColumn(name = "permission_id")]
    )
    val permissions: Set<Permission> = emptySet()
)


