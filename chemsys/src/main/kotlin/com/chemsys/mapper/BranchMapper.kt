package com.chemsys.mapper

import com.chemsys.dto.BranchDto
import com.chemsys.entity.Branch
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class BranchMapper {
    
    fun toDto(branch: Branch, userCount: Long = 0): BranchDto {
        return BranchDto(
            id = branch.id!!,
            name = branch.name,
            location = branch.location,
            contactPhone = branch.contactPhone,
            contactEmail = branch.contactEmail,
            address = branch.address,
            isActive = branch.isActive,
            tenantId = branch.tenant.id!!,
            tenantName = branch.tenant.name,
            userCount = userCount,
            createdAt = branch.createdAt,
            updatedAt = branch.updatedAt
        )
    }
    
    fun toDtoList(branches: List<Branch>, userCounts: Map<UUID, Long> = emptyMap()): List<BranchDto> {
        return branches.map { branch ->
            toDto(branch, userCounts[branch.id] ?: 0)
        }
    }
}
