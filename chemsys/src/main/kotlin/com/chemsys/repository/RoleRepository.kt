package com.chemsys.repository

import com.chemsys.entity.Role
import com.chemsys.entity.Tenant
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface RoleRepository : JpaRepository<Role, UUID> {
    fun findByTenantIsNullAndName(name: String): Role?
    fun findByTenantAndName(tenant: Tenant, name: String): Role?
}


