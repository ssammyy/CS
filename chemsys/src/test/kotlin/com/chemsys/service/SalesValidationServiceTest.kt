//package com.chemsys.service
//
//import com.chemsys.dto.*
//import com.chemsys.entity.*
//import com.chemsys.repository.*
//import com.chemsys.config.TenantContext
//import org.junit.jupiter.api.BeforeEach
//import org.junit.jupiter.api.Test
//import org.junit.jupiter.api.extension.ExtendWith
//import org.mockito.InjectMocks
//import org.mockito.Mock
//import org.mockito.Mockito.*
//import org.mockito.junit.jupiter.MockitoExtension
//import java.math.BigDecimal
//import java.time.LocalDate
//import java.util.*
//
///**
// * Unit tests for SalesValidationService.
// * Tests validation logic for sales operations including:
// * - Stock availability validation
// * - Prescription requirement validation
// * - Customer validation
// * - Business rule validation
// */
//@ExtendWith(MockitoExtension::class)
//class SalesValidationServiceTest {
//
//    @Mock
//    private lateinit var productRepository: ProductRepository
//
//    @Mock
//    private lateinit var inventoryRepository: InventoryRepository
//
//    @Mock
//    private lateinit var customerRepository: CustomerRepository
//
//    @Mock
//    private lateinit var branchRepository: BranchRepository
//
//    @InjectMocks
//    private lateinit var salesValidationService: SalesValidationService
//
//    private lateinit var testTenant: Tenant
//    private lateinit var testBranch: Branch
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
//            expiryDate = LocalDate.now().plusDays(365),
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
//    }
//
//    @Test
//    fun `validateSaleRequest should return valid result for valid request`() {
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
//            customerId = testCustomer.id
//        )
//
//        `when`(TenantContext.getCurrentTenantId()).thenReturn(tenantId)
//        `when`(branchRepository.findById(testBranch.id!!)).thenReturn(Optional.of(testBranch))
//        `when`(customerRepository.findById(testCustomer.id!!)).thenReturn(Optional.of(testCustomer))
//        `when`(productRepository.findById(testProduct.id!!)).thenReturn(Optional.of(testProduct))
//        `when`(inventoryRepository.findById(testInventory.id!!)).thenReturn(Optional.of(testInventory))
//
//        // When
//        val result = salesValidationService.validateSaleRequest(request)
//
//        // Then
//        assert(result.isValid == true)
//        assert(result.errors.isEmpty())
//    }
//
//    @Test
//    fun `validateSaleRequest should return invalid result when branch not found`() {
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
//        // When
//        val result = salesValidationService.validateSaleRequest(request)
//
//        // Then
//        assert(result.isValid == false)
//        assert(result.errors.any { it.contains("Branch not found") })
//    }
//
//    @Test
//    fun `validateSaleRequest should return invalid result when insufficient stock`() {
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
//        `when`(productRepository.findById(testProduct.id!!)).thenReturn(Optional.of(testProduct))
//        `when`(inventoryRepository.findById(testInventory.id!!)).thenReturn(Optional.of(testInventory))
//
//        // When
//        val result = salesValidationService.validateSaleRequest(request)
//
//        // Then
//        assert(result.isValid == false)
//        assert(result.errors.any { it.contains("Insufficient stock") })
//    }
//
//    @Test
//    fun `validateSaleRequest should return invalid result when payment total mismatch`() {
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
//        `when`(productRepository.findById(testProduct.id!!)).thenReturn(Optional.of(testProduct))
//        `when`(inventoryRepository.findById(testInventory.id!!)).thenReturn(Optional.of(testInventory))
//
//        // When
//        val result = salesValidationService.validateSaleRequest(request)
//
//        // Then
//        assert(result.isValid == false)
//        assert(result.errors.any { it.contains("Payment total") && it.contains("does not match") })
//    }
//
//    @Test
//    fun `validateStockAvailability should return available result when stock sufficient`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val productId = testProduct.id!!
//        val branchId = testBranch.id!!
//        val requestedQuantity = 50
//
//        `when`(productRepository.findById(productId)).thenReturn(Optional.of(testProduct))
//        `when`(inventoryRepository.findByProductIdAndBranchIdAndTenantId(productId, branchId, tenantId))
//            .thenReturn(listOf(testInventory))
//
//        // When
//        val result = salesValidationService.validateStockAvailability(
//            productId, branchId, requestedQuantity, tenantId
//        )
//
//        // Then
//        assert(result.productId == productId)
//        assert(result.productName == "Test Medicine")
//        assert(result.requestedQuantity == 50)
//        assert(result.availableQuantity == 100)
//        assert(result.isAvailable == true)
//        assert(result.inventoryItems.size == 1)
//    }
//
//    @Test
//    fun `validateStockAvailability should return unavailable result when stock insufficient`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val productId = testProduct.id!!
//        val branchId = testBranch.id!!
//        val requestedQuantity = 150
//
//        `when`(productRepository.findById(productId)).thenReturn(Optional.of(testProduct))
//        `when`(inventoryRepository.findByProductIdAndBranchIdAndTenantId(productId, branchId, tenantId))
//            .thenReturn(listOf(testInventory))
//
//        // When
//        val result = salesValidationService.validateStockAvailability(
//            productId, branchId, requestedQuantity, tenantId
//        )
//
//        // Then
//        assert(result.productId == productId)
//        assert(result.requestedQuantity == 150)
//        assert(result.availableQuantity == 100)
//        assert(result.isAvailable == false)
//    }
//
//    @Test
//    fun `validatePrescriptionRequirements should return no prescription required for regular product`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val productId = testProduct.id!!
//        val customerId = testCustomer.id
//
//        `when`(productRepository.findById(productId)).thenReturn(Optional.of(testProduct))
//
//        // When
//        val result = salesValidationService.validatePrescriptionRequirements(
//            productId, customerId, tenantId
//        )
//
//        // Then
//        assert(result.productId == productId)
//        assert(result.productName == "Test Medicine")
//        assert(result.requiresPrescription == false)
//        assert(result.isValid == true)
//        assert(result.message == "Product does not require prescription")
//    }
//
//    @Test
//    fun `validatePrescriptionRequirements should return prescription required for controlled substance`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val productId = testProduct.id!!
//        val customerId = testCustomer.id
//        val controlledProduct = testProduct.copy(requiresPrescription = true)
//
//        `when`(productRepository.findById(productId)).thenReturn(Optional.of(controlledProduct))
//
//        // When
//        val result = salesValidationService.validatePrescriptionRequirements(
//            productId, customerId, tenantId
//        )
//
//        // Then
//        assert(result.productId == productId)
//        assert(result.productName == "Test Medicine")
//        assert(result.requiresPrescription == true)
//        assert(result.isValid == false) // TODO: Will be true when prescription validation is implemented
//        assert(result.message.contains("Prescription validation"))
//    }
//
//    @Test
//    fun `validateCustomer should return valid result for active customer`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val customerId = testCustomer.id
//
//        `when`(customerRepository.findById(customerId)).thenReturn(Optional.of(testCustomer))
//
//        // When
//        val result = salesValidationService.validateCustomer(customerId, tenantId)
//
//        // Then
//        assert(result.customerId == customerId)
//        assert(result.customerName == "John Doe")
//        assert(result.isActive == true)
//        assert(result.isValid == true)
//        assert(result.message == "Customer is valid")
//    }
//
//    @Test
//    fun `validateCustomer should return invalid result for inactive customer`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val customerId = testCustomer.id
//        val inactiveCustomer = testCustomer.copy(isActive = false)
//
//        `when`(customerRepository.findById(customerId)).thenReturn(Optional.of(inactiveCustomer))
//
//        // When
//        val result = salesValidationService.validateCustomer(customerId, tenantId)
//
//        // Then
//        assert(result.customerId == customerId)
//        assert(result.customerName == "John Doe")
//        assert(result.isActive == false)
//        assert(result.isValid == false)
//        assert(result.message == "Customer account is inactive")
//    }
//
//    @Test
//    fun `validateSaleRequest should return warning for expiring products`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val expiringInventory = testInventory.copy(
//            expiryDate = LocalDate.now().plusDays(15) // Expiring soon
//        )
//        val request = CreateSaleRequest(
//            branchId = testBranch.id!!,
//            lineItems = listOf(
//                CreateSaleLineItemRequest(
//                    productId = testProduct.id!!,
//                    inventoryId = expiringInventory.id!!,
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
//        `when`(branchRepository.findById(testBranch.id!!)).thenReturn(Optional.of(testBranch))
//        `when`(productRepository.findById(testProduct.id!!)).thenReturn(Optional.of(testProduct))
//        `when`(inventoryRepository.findById(expiringInventory.id!!)).thenReturn(Optional.of(expiringInventory))
//
//        // When
//        val result = salesValidationService.validateSaleRequest(request)
//
//        // Then
//        assert(result.isValid == true) // Should still be valid
//        assert(result.warnings.any { it.contains("expiring soon") })
//    }
//
//    @Test
//    fun `validateSaleRequest should return error for expired products`() {
//        // Given
//        val tenantId = testTenant.id!!
//        val expiredInventory = testInventory.copy(
//            expiryDate = LocalDate.now().minusDays(1) // Expired
//        )
//        val request = CreateSaleRequest(
//            branchId = testBranch.id!!,
//            lineItems = listOf(
//                CreateSaleLineItemRequest(
//                    productId = testProduct.id!!,
//                    inventoryId = expiredInventory.id!!,
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
//        `when`(branchRepository.findById(testBranch.id!!)).thenReturn(Optional.of(testBranch))
//        `when`(productRepository.findById(testProduct.id!!)).thenReturn(Optional.of(testProduct))
//        `when`(inventoryRepository.findById(expiredInventory.id!!)).thenReturn(Optional.of(expiredInventory))
//
//        // When
//        val result = salesValidationService.validateSaleRequest(request)
//
//        // Then
//        assert(result.isValid == false)
//        assert(result.errors.any { it.contains("expired") })
//    }
//}
//
