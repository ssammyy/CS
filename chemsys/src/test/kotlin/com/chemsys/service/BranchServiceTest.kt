package com.chemsys.service

import com.chemsys.dto.CreateBranchRequest
import com.chemsys.entity.Branch
import com.chemsys.entity.Tenant
import com.chemsys.mapper.BranchMapper
import com.chemsys.repository.BranchRepository
import com.chemsys.repository.TenantRepository
import com.chemsys.repository.UserBranchRepository
import com.chemsys.repository.UserRepository
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.*
import org.mockito.junit.jupiter.MockitoExtension
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import java.time.OffsetDateTime
import java.util.*

@ExtendWith(MockitoExtension::class)
class BranchServiceTest {

    @Mock
    private lateinit var branchRepository: BranchRepository

    @Mock
    private lateinit var userBranchRepository: UserBranchRepository

    @Mock
    private lateinit var userRepository: UserRepository

    @Mock
    private lateinit var tenantRepository: TenantRepository

    @Mock
    private lateinit var branchMapper: BranchMapper

    @InjectMocks
    private lateinit var branchService: BranchService

    @Test
    fun `createBranch should create and return branch`() {
        // Given
        val tenantId = UUID.randomUUID()
        val tenant = Tenant(id = tenantId, name = "Test Tenant")
        val request = CreateBranchRequest(
            name = "Test Branch",
            location = "Test Location",
            contactPhone = "1234567890",
            contactEmail = "test@example.com",
            address = "Test Address"
        )
        
        val branch = Branch(
            id = UUID.randomUUID(),
            name = request.name,
            location = request.location,
            contactPhone = request.contactPhone,
            contactEmail = request.contactEmail,
            address = request.address,
            tenant = tenant
        )
        
        // Mock repository calls
        `when`(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant))
        `when`(branchRepository.findByNameAndTenantId(request.name, tenantId)).thenReturn(Optional.empty())
        `when`(branchRepository.save(any())).thenReturn(branch)
        `when`(branchMapper.toDto(branch)).thenReturn(
            com.chemsys.dto.BranchDto(
                id = branch.id!!,
                name = branch.name,
                location = branch.location,
                contactPhone = branch.contactPhone,
                contactEmail = branch.contactEmail,
                address = branch.address,
                isActive = branch.isActive,
                tenantId = tenant.id!!,
                tenantName = tenant.name,
                userCount = 0,
                createdAt = branch.createdAt,
                updatedAt = branch.updatedAt
            )
        )
        
        // When
        val result = branchService.createBranch(request)
        
        // Then
        assertNotNull(result)
        assertEquals(request.name, result.name)
        assertEquals(request.location, result.location)
        assertEquals(request.contactPhone, result.contactPhone)
        assertEquals(request.contactEmail, result.contactEmail)
        
        verify(branchRepository).save(any())
        verify(branchMapper).toDto(branch)
    }
}
