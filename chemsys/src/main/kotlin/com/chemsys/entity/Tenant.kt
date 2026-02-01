package com.chemsys.entity

import jakarta.persistence.*
import java.time.OffsetDateTime
import java.util.*

@Entity
@Table(name = "tenants")
data class Tenant(
    @Id
    var id: UUID? = null,
    
    @Column(name = "name", nullable = false, unique = true)
    val name: String,
    
    @Column(name = "created_at", nullable = false)
    val createdAt: OffsetDateTime = OffsetDateTime.now()
) {
    @PrePersist
    fun prePersist() {
        if (id == null) id = UUID.randomUUID()
    }
}
