package com.chemsys.entity

import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.*
import org.hibernate.annotations.Filter
import org.hibernate.annotations.FilterDef
import org.hibernate.annotations.ParamDef

/**
 * Entity for storing user branch preferences and last selected branch context.
 * This solves the frontend branch context persistence issue by storing
 * the user's preferred/selected branch in the database.
 */
@Entity
@Table(name = "user_branch_preferences")
@FilterDef(name = "userBranchPreferenceTenantFilter", parameters = [ParamDef(name = "tenantId", type = UUID::class)])
@Filter(name = "userBranchPreferenceTenantFilter", condition = "tenant_id = :tenantId")
data class UserBranchPreference(
    @Id
    var id: UUID? = null,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    val branch: Branch,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    val tenant: Tenant,
    
    /**
     * Whether this is the user's preferred branch
     * A user can have multiple branch preferences, but only one can be preferred
     */
    @Column(name = "is_preferred", nullable = false)
    val isPreferred: Boolean = false,
    
    /**
     * Timestamp when this branch was last selected by the user
     */
    @Column(name = "last_selected_at", nullable = false)
    val lastSelectedAt: OffsetDateTime = OffsetDateTime.now(),
    
    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now(),
    
    @Column(name = "updated_at")
    val updatedAt: OffsetDateTime? = null
) {
    @PrePersist
    fun prePersist() {
        if (id == null) id = UUID.randomUUID()
    }
    
    @PreUpdate
    fun preUpdate() {
        // Update the updatedAt timestamp
        // Note: In a data class, we need to handle this in the service layer
    }
}
