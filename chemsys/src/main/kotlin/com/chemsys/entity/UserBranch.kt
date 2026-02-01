package com.chemsys.entity

import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(name = "user_branches")
data class UserBranch(
    @Id
    var id: UUID? = null,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    val branch: Branch,
    
    @Column(name = "is_primary", nullable = false)
    val isPrimary: Boolean = false,
    
    @Column(name = "assigned_at", nullable = false)
    val assignedAt: OffsetDateTime = OffsetDateTime.now(),
    
    @Column(name = "assigned_by")
    val assignedBy: UUID? = null
) {
    @PrePersist
    fun prePersist() {
        if (id == null) id = UUID.randomUUID()
    }
}
