package com.chemsys.entity

import jakarta.persistence.*
import java.util.*

@Entity
@Table(name = "permissions")
data class Permission(
    @Id
    var id: UUID? = null,

    @Column(name = "name", nullable = false, unique = true)
    val name: String
)


