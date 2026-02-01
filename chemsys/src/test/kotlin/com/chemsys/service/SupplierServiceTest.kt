package com.chemsys.service

import com.chemsys.dto.CreateSupplierRequest
import com.chemsys.dto.SupplierDto
import com.chemsys.entity.Supplier
import com.chemsys.entity.SupplierCategory
import com.chemsys.entity.SupplierStatus
import com.chemsys.entity.Tenant
import com.chemsys.mapper.SupplierMapper
import com.chemsys.repository.SupplierRepository
import com.chemsys.repository.TenantRepository
import com.chemsys.config.TenantContext
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.*
import org.mockito.junit.jupiter.MockitoExtension
import java.time.OffsetDateTime
import java.util.*

/**
 * Unit tests for SupplierService.
 * Tests the core business logic and validation for supplier management operations.
 */
@ExtendWith(MockitoExtension::class)
class SupplierServiceTest {

    @Mock
    private lateinit var supplierRepository: SupplierRepository

    @Mock
    private lateinit var tenantRepository: TenantRepository

    @Mock
    private lateinit var supplierMapper: SupplierMapper

    @InjectMocks
    private lateinit var supplierService: SupplierService

    private lateinit var testTenant: Tenant
    private lateinit var testSupplier: Supplier
    private lateinit var testSupplierDto: SupplierDto
    private lateinit var createRequest: CreateSupplierRequest

    @BeforeEach
    fun setUp() {
        // Setup test data
        testTenant = Tenant(
            id = UUID.randomUUID(),
            name = "Test Tenant",
            createdAt = OffsetDateTime.now()
        )

        testSupplier = Supplier(
            id = UUID.randomUUID(),
            name = "Test Supplier",
            contactPerson = "John Doe",
            phone = "+1234567890",
            email = "john@testsupplier.com",
            physicalAddress = "123 Test St, Test City",
            paymentTerms = "Net 30",
            category = SupplierCategory.WHOLESALER,
            status = SupplierStatus.ACTIVE,
            taxIdentificationNumber = "TAX123456",
            bankAccountDetails = "Bank: Test Bank, Acc: 123456789",
            creditLimit = 10000.0,
            notes = "Test supplier for unit testing",
            tenant = testTenant,
            createdAt = OffsetDateTime.now()
        )

        testSupplierDto = SupplierDto(
            id = testSupplier.id!!,
            name = testSupplier.name,
            contactPerson = testSupplier.contactPerson,
            phone = testSupplier.phone,
            email = testSupplier.email,
            physicalAddress = testSupplier.physicalAddress,
            paymentTerms = testSupplier.paymentTerms,
            category = testSupplier.category,
            status = testSupplier.status,
            taxIdentificationNumber = testSupplier.taxIdentificationNumber,
            bankAccountDetails = testSupplier.bankAccountDetails,
            creditLimit = testSupplier.creditLimit,
            notes = testSupplier.notes,
            tenantId = testTenant.id!!,
            tenantName = testTenant.name,
            createdAt = testSupplier.createdAt,
            updatedAt = testSupplier.updatedAt
        )

        createRequest = CreateSupplierRequest(
            name = "Test Supplier",
            contactPerson = "John Doe",
            phone = "+1234567890",
            email = "john@testsupplier.com",
            physicalAddress = "123 Test St, Test City",
            paymentTerms = "Net 30",
            category = SupplierCategory.WHOLESALER,
            status = SupplierStatus.ACTIVE,
            taxIdentificationNumber = "TAX123456",
            bankAccountDetails = "Bank: Test Bank, Acc: 123456789",
            creditLimit = 10000.0,
            notes = "Test supplier for unit testing"
        )
    }

    @Test
    fun `createSupplier should create and return supplier when valid request is provided`() {
        // Given
        `when`(TenantContext.getCurrentTenant()).thenReturn(testTenant.id)
        `when`(tenantRepository.findById(testTenant.id!!)).thenReturn(Optional.of(testTenant))
        `when`(supplierRepository.existsByNameAndTenantId(createRequest.name, testTenant.id!!)).thenReturn(false)
        `when`(supplierRepository.existsByEmailAndTenantId(createRequest.email!!, testTenant.id!!)).thenReturn(false)
        `when`(supplierRepository.save(any(Supplier::class.java))).thenReturn(testSupplier)
        `when`(supplierMapper.toDto(testSupplier)).thenReturn(testSupplierDto)

        // When
        val result = supplierService.createSupplier(createRequest)

        // Then
        assert(result == testSupplierDto)
        verify(supplierRepository).save(any(Supplier::class.java))
        verify(supplierMapper).toDto(testSupplier)
    }

    @Test
    fun `createSupplier should throw exception when supplier name already exists`() {
        // Given
        `when`(TenantContext.getCurrentTenant()).thenReturn(testTenant.id)
        `when`(tenantRepository.findById(testTenant.id!!)).thenReturn(Optional.of(testTenant))
        `when`(supplierRepository.existsByNameAndTenantId(createRequest.name, testTenant.id!!)).thenReturn(true)

        // When & Then
        val exception = org.junit.jupiter.api.assertThrows<RuntimeException> {
            supplierService.createSupplier(createRequest)
        }
        assert(exception.message!!.contains("already exists"))
        verify(supplierRepository, never()).save(any(Supplier::class.java))
    }

    @Test
    fun `createSupplier should throw exception when supplier email already exists`() {
        // Given
        `when`(TenantContext.getCurrentTenant()).thenReturn(testTenant.id)
        `when`(tenantRepository.findById(testTenant.id!!)).thenReturn(Optional.of(testTenant))
        `when`(supplierRepository.existsByNameAndTenantId(createRequest.name, testTenant.id!!)).thenReturn(false)
        `when`(supplierRepository.existsByEmailAndTenantId(createRequest.email!!, testTenant.id!!)).thenReturn(true)

        // When & Then
        val exception = org.junit.jupiter.api.assertThrows<RuntimeException> {
            supplierService.createSupplier(createRequest)
        }
        assert(exception.message!!.contains("already exists"))
        verify(supplierRepository, never()).save(any(Supplier::class.java))
    }

    @Test
    fun `getSupplierById should return supplier when valid ID is provided`() {
        // Given
        `when`(TenantContext.getCurrentTenant()).thenReturn(testTenant.id)
        `when`(supplierRepository.findById(testSupplier.id!!)).thenReturn(Optional.of(testSupplier))
        `when`(supplierMapper.toDto(testSupplier)).thenReturn(testSupplierDto)

        // When
        val result = supplierService.getSupplierById(testSupplier.id!!)

        // Then
        assert(result == testSupplierDto)
        verify(supplierRepository).findById(testSupplier.id!!)
        verify(supplierMapper).toDto(testSupplier)
    }

    @Test
    fun `getSupplierById should throw exception when supplier not found`() {
        // Given
        val nonExistentId = UUID.randomUUID()
        `when`(TenantContext.getCurrentTenant()).thenReturn(testTenant.id)
        `when`(supplierRepository.findById(nonExistentId)).thenReturn(Optional.empty())

        // When & Then
        val exception = org.junit.jupiter.api.assertThrows<RuntimeException> {
            supplierService.getSupplierById(nonExistentId)
        }
        assert(exception.message!!.contains("not found"))
    }
}
