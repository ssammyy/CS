//package com.chemsys.service
//
//import com.chemsys.dto.*
//import com.chemsys.entity.*
//import com.chemsys.mapper.SalesMapper
//import com.chemsys.repository.*
//import com.chemsys.config.TenantContext
//import org.junit.jupiter.api.BeforeEach
//import org.junit.jupiter.api.Test
//import org.junit.jupiter.api.extension.ExtendWith
//import org.mockito.InjectMocks
//import org.mockito.Mock
//import org.mockito.Mockito.*
//import org.mockito.junit.jupiter.MockitoExtension
//import org.springframework.security.core.context.SecurityContextHolder
//import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
//import org.springframework.security.core.Authentication
//import java.math.BigDecimal
//import java.time.OffsetDateTime
//import java.util.*
//
///**
// * Unit tests for SalesService.
// * Tests the core business logic for sales operations including:
// * - Sale creation with proper validation
// * - Stock deduction and audit logging
// * - Transactional integrity
// * - Error handling and edge cases
// */
//@ExtendWith(MockitoExtension::class)
//class SalesServiceTest {
//
//    @Mock
//    private lateinit var saleRepository: SaleRepository
//
//    @Mock
//    private lateinit var customerRepository: CustomerRepository
//
//    @Mock
//    private lateinit var saleReturnRepository: SaleReturnRepository
//
//    @Mock
//    private lateinit var inventoryAuditLogRepository: InventoryAuditLogRepository
//
//    @Mock
//    private lateinit var inventoryRepository: InventoryRepository
//
//    @Mock
//    private lateinit var productRepository: ProductRepository
//
//    @Mock
//    private lateinit var branchRepository: BranchRepository
//
//    @Mock
//    private lateinit var tenantRepository: TenantRepository
//
//    @Mock
//    private lateinit var userRepository: UserRepository
//
//    @Mock
//    private lateinit var salesMapper: SalesMapper
//
//    @InjectMocks
//    private lateinit var salesService: SalesService
//
//    private lateinit var testTenant: Tenant
//    private lateinit var testBranch: Branch
//    private lateinit var testUser: User
//    private lateinit var testProduct: Product
//    private lateinit var testInventory: Inventory
//    private lateinit var testCustomer: Customer
//
//    @BeforeEach
//    fun setUp() {
//        // Setup test data
//        testTenant = Tenant(
//            id = UUID.randomUUID(),
//            name = "Test Pharmacy",
//            code = "TEST",
//            isActive = true
//        )
//
//        testBranch = Branch(
//            id = UUID.randomUUID(),
//            name = "Test Branch",
//            address = "123 Test Street",
//            phone = "123-456-7890",
//            tenant = testTenant
//        )
//
//        testUser = User(
//            id = UUID.randomUUID(),
//            username = "testuser",
//            passwordHash = "hashedpassword",
//            email = "test@example.com",
//            tenant = testTenant,
//            role = UserRole.CASHIER
//        )
//
//        testProduct = Product(
//            id = UUID.randomUUID(),
//            name = "Test Medicine",
//            genericName = "Test Generic",
//            description = "Test Description",
//            strength = "100mg",
//            dosageForm = "Tablet",
//            manufacturer = "Test Manufacturer",
//            barcode = "123456789",
//            isActive = true,
//            requiresPrescription = false,
//            minStockLevel = 10,
//            tenant = testTenant
//        )
//
//        testInventory = Inventory(
//            id = UUID.randomUUID(),
//            product = testProduct,
//            branch = testBranch,
//            batchNumber = "BATCH001",
//            expiryDate = java.time.LocalDate.now().plusDays(365),
//            quantity = 100,
//            unitCost = BigDecimal("10.00"),
//            sellingPrice = BigDecimal("15.00"),
//            isActive = true
//        )
//
//        testCustomer = Customer(
//            id = UUID.randomUUID(),
//            customerNumber = "CUS00000001",
//            firstName = "John",
//            lastName = "Doe",
//            phone = "123-456-7890",
//            email = "john.doe@example.com",
//            tenant = testTenant
//        )
//
//        // Setup security context
//        val authentication: Authentication = UsernamePasswordAuthenticationToken(
//            "testuser", null, emptyList()
//        )
//        SecurityContextHolder.getContext().authentication = authentication
//    }
//
//    @Test
//    fun `createSale should create a valid sale with proper stock deduction`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val request = CreateSaleRequest(
//            branchId = testBranch.id!!,
//            lineItems = listOf(
//                CreateSaleLineItemRequest(
//                    productId = testProduct.id!!,
//                    inventoryId = testInventory.id!!,
//                    quantity = 5,
//                    unitPrice = BigDecimal("15.00")
//                )
//            ),
//            payments = listOf(
//                CreateSalePaymentRequest(
//                    paymentMethod = PaymentMethod.CASH,
//                    amount = BigDecimal("75.00")
//                )
//            ),
//            customerId = testCustomer.id,
//            taxAmount = BigDecimal("0.00"),
//            discountAmount = BigDecimal("0.00")
//        )
//
//        val expectedSale = Sale(
//            id = UUID.randomUUID(),
//            saleNumber = "SAL00000001",
//            tenant = testTenant,
//            branch = testBranch,
//            customer = testCustomer,
//            subtotal = BigDecimal("75.00"),
//            totalAmount = BigDecimal("75.00"),
//            status = SaleStatus.COMPLETED,
//            cashier = testUser
//        )
//
//        val expectedSaleDto = SaleDto(
//            id = expectedSale.id!!,
//            saleNumber = expectedSale.saleNumber,
//            branchId = testBranch.id!!,
//            branchName = testBranch.name,
//            customerId = testCustomer.id,
//            customerName = "${testCustomer.firstName} ${testCustomer.lastName}",
//            subtotal = BigDecimal("75.00"),
//            totalAmount = BigDecimal("75.00"),
//            status = SaleStatus.COMPLETED,
//            cashierId = testUser.id!!,
//            cashierName = testUser.username,
//            saleDate = OffsetDateTime.now(),
//            createdAt = OffsetDateTime.now(),
//            lineItems = emptyList(),
//            payments = emptyList()
//        )
//
//        // Mock repository calls
//        `when`(TenantContext.getCurrentTenantId()).thenReturn(tenantId)
//        `when`(branchRepository.findById(testBranch.id!!)).thenReturn(Optional.of(testBranch))
//        `when`(inventoryRepository.findById(testInventory.id!!)).thenReturn(Optional.of(testInventory))
//        `when`(customerRepository.findById(testCustomer.id!!)).thenReturn(Optional.of(testCustomer))
//        `when`(tenantRepository.findById(tenantId)).thenReturn(Optional.of(testTenant))
//        `when`(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser))
//        `when`(saleRepository.getNextSaleNumber(tenantId)).thenReturn(1L)
//        `when`(saleRepository.save(any(Sale::class.java))).thenReturn(expectedSale)
//        `when`(inventoryRepository.save(any(Inventory::class.java))).thenReturn(testInventory)
//        `when`(inventoryAuditLogRepository.save(any(InventoryAuditLog::class.java))).thenReturn(InventoryAuditLog())
//        `when`(salesMapper.toSaleDto(expectedSale)).thenReturn(expectedSaleDto)
//
//        // When
//        val result = salesService.createSale(request)
//
//        // Then
//        assert(result.id == expectedSale.id)
//        assert(result.saleNumber == expectedSale.saleNumber)
//        assert(result.totalAmount == BigDecimal("75.00"))
//        assert(result.status == SaleStatus.COMPLETED)
//
//        // Verify inventory was updated
//        verify(inventoryRepository).save(argThat { inventory ->
//            inventory.quantity == 95 // 100 - 5
//        })
//
//        // Verify audit log was created
//        verify(inventoryAuditLogRepository).save(argThat { auditLog ->
//            auditLog.transactionType == TransactionType.SALE &&
//            auditLog.quantityChanged == -5 &&
//            auditLog.sourceType == SourceType.SALE
//        })
//    }
//
//    @Test
//    fun `createSale should throw exception when branch not found`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val request = CreateSaleRequest(
//            branchId = UUID.randomUUID(),
//            lineItems = listOf(
//                CreateSaleLineItemRequest(
//                    productId = testProduct.id!!,
//                    inventoryId = testInventory.id!!,
//                    quantity = 5,
//                    unitPrice = BigDecimal("15.00")
//                )
//            ),
//            payments = listOf(
//                CreateSalePaymentRequest(
//                    paymentMethod = PaymentMethod.CASH,
//                    amount = BigDecimal("75.00")
//                )
//            )
//        )
//
//        `when`(TenantContext.getCurrentTenantId()).thenReturn(tenantId)
//        `when`(branchRepository.findById(any())).thenReturn(Optional.empty())
//
//        // When & Then
//        try {
//            salesService.createSale(request)
//            assert(false) { "Expected IllegalArgumentException" }
//        } catch (e: IllegalArgumentException) {
//            assert(e.message?.contains("Branch not found") == true)
//        }
//    }
//
//    @Test
//    fun `createSale should throw exception when insufficient stock`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val request = CreateSaleRequest(
//            branchId = testBranch.id!!,
//            lineItems = listOf(
//                CreateSaleLineItemRequest(
//                    productId = testProduct.id!!,
//                    inventoryId = testInventory.id!!,
//                    quantity = 150, // More than available (100)
//                    unitPrice = BigDecimal("15.00")
//                )
//            ),
//            payments = listOf(
//                CreateSalePaymentRequest(
//                    paymentMethod = PaymentMethod.CASH,
//                    amount = BigDecimal("2250.00")
//                )
//            )
//        )
//
//        `when`(TenantContext.getCurrentTenantId()).thenReturn(tenantId)
//        `when`(branchRepository.findById(testBranch.id!!)).thenReturn(Optional.of(testBranch))
//        `when`(inventoryRepository.findById(testInventory.id!!)).thenReturn(Optional.of(testInventory))
//
//        // When & Then
//        try {
//            salesService.createSale(request)
//            assert(false) { "Expected IllegalArgumentException" }
//        } catch (e: IllegalArgumentException) {
//            assert(e.message?.contains("Insufficient stock") == true)
//        }
//    }
//
//    @Test
//    fun `createSale should throw exception when payment total mismatch`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val request = CreateSaleRequest(
//            branchId = testBranch.id!!,
//            lineItems = listOf(
//                CreateSaleLineItemRequest(
//                    productId = testProduct.id!!,
//                    inventoryId = testInventory.id!!,
//                    quantity = 5,
//                    unitPrice = BigDecimal("15.00")
//                )
//            ),
//            payments = listOf(
//                CreateSalePaymentRequest(
//                    paymentMethod = PaymentMethod.CASH,
//                    amount = BigDecimal("50.00") // Less than total (75.00)
//                )
//            )
//        )
//
//        `when`(TenantContext.getCurrentTenantId()).thenReturn(tenantId)
//        `when`(branchRepository.findById(testBranch.id!!)).thenReturn(Optional.of(testBranch))
//        `when`(inventoryRepository.findById(testInventory.id!!)).thenReturn(Optional.of(testInventory))
//
//        // When & Then
//        try {
//            salesService.createSale(request)
//            assert(false) { "Expected IllegalArgumentException" }
//        } catch (e: IllegalArgumentException) {
//            assert(e.message?.contains("Payment total does not match sale total") == true)
//        }
//    }
//
//    @Test
//    fun `getSaleById should return sale when found`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val saleId = UUID.randomUUID()
//        val sale = Sale(
//            id = saleId,
//            saleNumber = "SAL00000001",
//            tenant = testTenant,
//            branch = testBranch,
//            customer = testCustomer,
//            subtotal = BigDecimal("75.00"),
//            totalAmount = BigDecimal("75.00"),
//            status = SaleStatus.COMPLETED,
//            cashier = testUser
//        )
//
//        val expectedSaleDto = SaleDto(
//            id = saleId,
//            saleNumber = "SAL00000001",
//            branchId = testBranch.id!!,
//            branchName = testBranch.name,
//            customerId = testCustomer.id,
//            customerName = "${testCustomer.firstName} ${testCustomer.lastName}",
//            subtotal = BigDecimal("75.00"),
//            totalAmount = BigDecimal("75.00"),
//            status = SaleStatus.COMPLETED,
//            cashierId = testUser.id!!,
//            cashierName = testUser.username,
//            saleDate = OffsetDateTime.now(),
//            createdAt = OffsetDateTime.now(),
//            lineItems = emptyList(),
//            payments = emptyList()
//        )
//
//        `when`(TenantContext.getCurrentTenantId()).thenReturn(tenantId)
//        `when`(saleRepository.findById(saleId)).thenReturn(Optional.of(sale))
//        `when`(salesMapper.toSaleDto(sale)).thenReturn(expectedSaleDto)
//
//        // When
//        val result = salesService.getSaleById(saleId)
//
//        // Then
//        assert(result.id == saleId)
//        assert(result.saleNumber == "SAL00000001")
//        assert(result.totalAmount == BigDecimal("75.00"))
//    }
//
//    @Test
//    fun `getSaleById should throw exception when sale not found`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val saleId = UUID.randomUUID()
//
//        `when`(TenantContext.getCurrentTenantId()).thenReturn(tenantId)
//        `when`(saleRepository.findById(saleId)).thenReturn(Optional.empty())
//
//        // When & Then
//        try {
//            salesService.getSaleById(saleId)
//            assert(false) { "Expected IllegalArgumentException" }
//        } catch (e: IllegalArgumentException) {
//            assert(e.message?.contains("Sale not found") == true)
//        }
//    }
//
//    @Test
//    fun `getSaleById should throw exception when sale belongs to different tenant`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val otherTenantId = UUID.randomUUID()
//        val saleId = UUID.randomUUID()
//        val otherTenant = testTenant.copy(id = otherTenantId)
//        val sale = Sale(
//            id = saleId,
//            saleNumber = "SAL00000001",
//            tenant = otherTenant,
//            branch = testBranch,
//            subtotal = BigDecimal("75.00"),
//            totalAmount = BigDecimal("75.00"),
//            status = SaleStatus.COMPLETED,
//            cashier = testUser
//        )
//
//        `when`(TenantContext.getCurrentTenantId()).thenReturn(tenantId)
//        `when`(saleRepository.findById(saleId)).thenReturn(Optional.of(sale))
//
//        // When & Then
//        try {
//            salesService.getSaleById(saleId)
//            assert(false) { "Expected IllegalArgumentException" }
//        } catch (e: IllegalArgumentException) {
//            assert(e.message?.contains("Sale does not belong to current tenant") == true)
//        }
//    }
//
//    @Test
//    fun `createCustomer should create a valid customer`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val request = CreateCustomerRequest(
//            firstName = "Jane",
//            lastName = "Smith",
//            phone = "987-654-3210",
//            email = "jane.smith@example.com"
//        )
//
//        val expectedCustomer = Customer(
//            id = UUID.randomUUID(),
//            customerNumber = "CUS00000002",
//            firstName = "Jane",
//            lastName = "Smith",
//            phone = "987-654-3210",
//            email = "jane.smith@example.com",
//            tenant = testTenant
//        )
//
//        val expectedCustomerDto = CustomerDto(
//            id = expectedCustomer.id!!,
//            customerNumber = "CUS00000002",
//            firstName = "Jane",
//            lastName = "Smith",
//            phone = "987-654-3210",
//            email = "jane.smith@example.com",
//            isActive = true,
//            createdAt = OffsetDateTime.now()
//        )
//
//        `when`(TenantContext.getCurrentTenantId()).thenReturn(tenantId)
//        `when`(tenantRepository.findById(tenantId)).thenReturn(Optional.of(testTenant))
//        `when`(customerRepository.existsByEmailAndTenantId("jane.smith@example.com", tenantId)).thenReturn(false)
//        `when`(customerRepository.existsByPhoneAndTenantId("987-654-3210", tenantId)).thenReturn(false)
//        `when`(customerRepository.getNextCustomerNumber(tenantId)).thenReturn(2L)
//        `when`(customerRepository.save(any(Customer::class.java))).thenReturn(expectedCustomer)
//        `when`(salesMapper.toCustomerDto(expectedCustomer)).thenReturn(expectedCustomerDto)
//
//        // When
//        val result = salesService.createCustomer(request)
//
//        // Then
//        assert(result.firstName == "Jane")
//        assert(result.lastName == "Smith")
//        assert(result.phone == "987-654-3210")
//        assert(result.email == "jane.smith@example.com")
//        assert(result.isActive == true)
//    }
//
//    @Test
//    fun `scanBarcode should return product information when barcode found`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val request = BarcodeScanRequest(
//            barcode = "123456789",
//            branchId = testBranch.id!!
//        )
//
//        val expectedResponse = BarcodeScanResponse(
//            productId = testProduct.id!!,
//            productName = "Test Medicine",
//            barcode = "123456789",
//            availableInventory = listOf(
//                InventoryItemDto(
//                    inventoryId = testInventory.id!!,
//                    batchNumber = "BATCH001",
//                    expiryDate = java.time.LocalDate.now().plusDays(365),
//                    quantity = 100,
//                    unitCost = BigDecimal("10.00"),
//                    sellingPrice = BigDecimal("15.00")
//                )
//            ),
//            sellingPrice = BigDecimal("15.00"),
//            requiresPrescription = false
//        )
//
//        `when`(TenantContext.getCurrentTenantId()).thenReturn(tenantId)
//        `when`(productRepository.findByBarcodeAndTenantId("123456789", tenantId)).thenReturn(Optional.of(testProduct))
//        `when`(inventoryRepository.findByProductIdAndBranchIdAndTenantId(testProduct.id!!, testBranch.id!!, tenantId))
//            .thenReturn(listOf(testInventory))
//        `when`(salesMapper.toBarcodeScanResponse(testProduct, listOf(testInventory))).thenReturn(expectedResponse)
//
//        // When
//        val result = salesService.scanBarcode(request)
//
//        // Then
//        assert(result.productId == testProduct.id)
//        assert(result.productName == "Test Medicine")
//        assert(result.barcode == "123456789")
//        assert(result.availableInventory.size == 1)
//        assert(result.requiresPrescription == false)
//    }
//
//    @Test
//    fun `scanBarcode should throw exception when barcode not found`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val request = BarcodeScanRequest(
//            barcode = "999999999",
//            branchId = testBranch.id!!
//        )
//
//        `when`(TenantContext.getCurrentTenantId()).thenReturn(tenantId)
//        `when`(productRepository.findByBarcodeAndTenantId("999999999", tenantId)).thenReturn(Optional.empty())
//
//        // When & Then
//        try {
//            salesService.scanBarcode(request)
//            assert(false) { "Expected IllegalArgumentException" }
//        } catch (e: IllegalArgumentException) {
//            assert(e.message?.contains("Product with barcode 999999999 not found") == true)
//        }
//    }
//}
//
