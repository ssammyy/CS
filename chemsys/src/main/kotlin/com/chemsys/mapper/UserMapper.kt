package com.chemsys.mapper

import com.chemsys.dto.UserDto
import com.chemsys.dto.UserManagementDto
import com.chemsys.entity.User
import org.springframework.stereotype.Component

/**
 * Manual mapper for converting `User` entities to DTOs.
 * Replaces MapStruct due to kapt issues on JDK 23.
 */
interface UserMapper {
    fun toUserDto(user: User): UserDto
    fun toManagementDto(user: User, branches: List<String>, primaryBranch: String?): UserManagementDto
}

@Component
class UserMapperImpl : UserMapper {
    override fun toUserDto(user: User): UserDto = UserDto(
        id = requireNotNull(user.id),
        username = user.username,
        email = user.email,
        role = user.role.name,
        tenantId = requireNotNull(user.tenant.id),
        tenantName = user.tenant.name,
        isActive = user.isActive
    )

    override fun toManagementDto(user: User, branches: List<String>, primaryBranch: String?): UserManagementDto = UserManagementDto(
        id = requireNotNull(user.id),
        username = user.username,
        email = user.email,
        phone = user.phone,
        role = user.role,
        roles = user.roles.map { it.name },
        tenantId = requireNotNull(user.tenant.id),
        tenantName = user.tenant.name,
        isActive = user.isActive,
        branches = branches,
        primaryBranch = primaryBranch,
        createdAt = user.createdAt,
        updatedAt = user.updatedAt
    )
}

