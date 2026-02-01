package com.chemsys.mapper

import com.chemsys.dto.TenantDto
import com.chemsys.entity.Tenant
import org.springframework.stereotype.Component

/**
 * Manual mapper for `Tenant` to `TenantDto`.
 */
interface TenantMapper {
    fun toDto(entity: Tenant): TenantDto
}

@Component
class TenantMapperImpl : TenantMapper {
    override fun toDto(entity: Tenant): TenantDto = TenantDto(
        id = requireNotNull(entity.id),
        name = entity.name,
        createdAt = entity.createdAt
    )
}

