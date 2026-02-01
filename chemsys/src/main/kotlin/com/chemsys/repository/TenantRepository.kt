package com.chemsys.repository

import com.chemsys.entity.Tenant
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface TenantRepository : JpaRepository<Tenant, UUID> {
    fun findByName(name: String): Tenant?
    fun existsByName(name: String): Boolean
}
