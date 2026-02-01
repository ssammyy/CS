//package com.chemsys.service
//
//import com.chemsys.dto.*
//import com.chemsys.entity.*
//import com.chemsys.mapper.PurchaseOrderMapper
//import com.chemsys.repository.PurchaseOrderRepository
//import com.chemsys.repository.PurchaseOrderLineItemRepository
//import com.chemsys.repository.PurchaseOrderHistoryRepository
//import com.chemsys.repository.SupplierRepository
//import com.chemsys.repository.ProductRepository
//import com.chemsys.repository.TenantRepository
//import com.chemsys.repository.BranchRepository
//import com.chemsys.config.TenantContext
//import org.junit.jupiter.api.BeforeEach
//import org.junit.jupiter.api.Test
//import org.junit.jupiter.api.extension.ExtendWith
//import org.mockito.InjectMocks
//import org.mockito.Mock
//import org.mockito.Mockito.*
//import org.mockito.junit.jupiter.MockitoExtension
//import org.springframework.test.util.ReflectionTestUtils
//import java.math.BigDecimal
//import java.time.LocalDate
//import java.time.OffsetDateTime
//import java.util.*
//
///**
// * PurchaseOrderServiceTest provides comprehensive testing for the PurchaseOrderService.
// * Tests all business logic, workflow management, CRUD operations, and edge cases.
// *
// * This test class follows testing best practices:
// * - Uses Mockito for mocking dependencies
// * - Tests both success and failure scenarios
// * - Validates business logic and validation rules
// * - Covers all service methods and edge cases
// */
//@ExtendWith(MockitoExtension::class)
//class PurchaseOrderServiceTest {
//
//    @Mock
//    private lateinit var purchaseOrderRepository: PurchaseOrderRepository
//
//    @Mock
//    private lateinit var lineItemRepository: PurchaseOrderLineItemRepository
//
//    @Mock
//    private lateinit var historyRepository: PurchaseOrderHistoryRepository
//
//    @Mock
//    private lateinit var supplierRepository: SupplierRepository
//
//    @Mock
//    private lateinit var productRepository: ProductRepository
//
//    @Mock
//    private lateinit var tenantRepository: TenantRepository
//
//    @Mock
//    private lateinit var branchRepository: BranchRepository
//
//    @Mock
//    private lateinit var purchaseOrderMapper: PurchaseOrderMapper
//
//    @InjectMocks
//    private lateinit var purchaseOrderService: PurchaseOrderService
//
//    private lateinit var testTenant: Tenant
//    private lateinit var testSupplier: Supplier
//    private lateinit var testBranch: Branch
//    private lateinit var testProduct: Product
//    private lateinit var testPurchaseOrder: PurchaseOrder
//    private lateinit var testLineItem: PurchaseOrderLineItem
//
//    @BeforeEach
//    fun setUp() {
//        // Set up test data
//        testTenant = Tenant(
//            id = UUID.randomUUID(),
//            name = "Test Tenant",
//            createdAt = OffsetDateTime.now()
//        )
//
//        testSupplier = Supplier(
//            id = UUID.randomUUID(),
//            name = "Test Supplier",
//            contactPerson = "John Doe",
//            phone = "+1234567890",
//            email = "john@supplier.com",
//            address = "123 Supplier St",
//            paymentTerms = "Net 30",
//            category = SupplierCategory.WHOLESALER,
//            status = SupplierStatus.ACTIVE,
//            tenant = testTenant,
//            createdAt = OffsetDateTime.now(),
//            updatedAt = OffsetDateTime.now()
//        )
//
//        testBranch = Branch(
//            id = UUID.randomUUID(),
//            name = "Test Branch",
//            address = "123 Branch St",
//            phone = "+1234567890",
//            email = "branch@test.com",
//            tenant = testTenant,
//            createdAt = OffsetDateTime.now(),
//            updatedAt = OffsetDateTime.now()
//        )
//
//        testProduct = Product(
//            id = UUID.randomUUID(),
//            name = "Test Product",
//            description = "Test product description",
//            sku = "TEST-001",
//            category = ProductCategory.CHEMICAL,
//            unit = ProductUnit.KG,
//            tenant = testTenant,
//            createdAt = OffsetDateTime.now(),
//            updatedAt = OffsetDateTime.now()
//        )
//        testPurchaseOrder = PurchaseOrder(
//            id = UUID.randomUUID(),
//            poNumber = "PO-001",
//            title = "Test Purchase Order",
//            description = "Test purchase order description",
//            supplier = testSupplier,
//            tenant = testTenant,
//            branch = testBranch,
//            status = PurchaseOrderStatus.DRAFT,
//            totalAmount = BigDecimal("100.00"),
//            grandTotal = BigDecimal("100.00"),
//            paymentTerms = "Net 30",
//            expectedDeliveryDate = LocalDate.now().plusDays(7),
//            notes = "Test notes",
//            createdBy = "testuser",
//            createdAt = OffsetDateTime.now(),
//            updatedAt = OffsetDateTime.now()
//        )
//
//        testLineItem = PurchaseOrderLineItem(
//            id = UUID.randomUUID(),
//            purchaseOrder = testPurchaseOrder,
//            product = testProduct,
//            quantity = 10,
//            unitPrice = BigDecimal("10.00"),
//            totalPrice = BigDecimal("100.00"),
//            receivedQuantity = 0,
//            expectedDeliveryDate = LocalDate.now().plusDays(7),
//            notes = "Test line item",
//            createdAt = OffsetDateTime.now(),
//            updatedAt = OffsetDateTime.now()
//        )
//
//        // Set up TenantContext mock
//        ReflectionTestUtils.setField(TenantContext::class.java, "currentTenant", testTenant.id)
//    }
//
//    @Test
//    fun `createPurchaseOrder should create purchase order successfully`() {
//        // Arrange
//        val createRequest = CreatePurchaseOrderRequest(
//            title = "Test PO",
//            description = "Test description",
//            supplierId = testSupplier.id!!,
//            branchId = testBranch.id!!,
//            paymentTerms = "Net 30",
//            expectedDeliveryDate = LocalDate.now().plusDays(7),
//            notes = "Test notes",
//            lineItems = listOf(
//                CreatePurchaseOrderLineItemRequest(
//                    productId = testProduct.id!!,
//                    quantity = 10,
//                    unitPrice = BigDecimal("10.00"),
//                    expectedDeliveryDate = LocalDate.now().plusDays(7),
//                    notes = "Test line item"
//                )
//            )
//        )
//
//        val createdPurchaseOrder = testPurchaseOrder.copy(
//            title = createRequest.title,
//            description = createRequest.description
//        )
//
//        val createdLineItems = listOf(testLineItem)
//
//        `when`(tenantRepository.findById(testTenant.id!!)).thenReturn(Optional.of(testTenant))
//        `when`(supplierRepository.findById(testSupplier.id!!)).thenReturn(Optional.of(testSupplier))
//        `when`(branchRepository.findById(testBranch.id!!)).thenReturn(Optional.of(testBranch))
//        `when`(purchaseOrderRepository.save(any(PurchaseOrder::class.java))).thenReturn(createdPurchaseOrder)
//        `when`(productRepository.findAllById(any())).thenReturn(listOf(testProduct))
//        `when`(purchaseOrderMapper.fromCreateRequest(any(), any(), any(), any())).thenReturn(createdPurchaseOrder)
//        `when`(purchaseOrderMapper.fromCreateLineItemRequests(any(), any(), any())).thenReturn(createdLineItems)
//        `when`(lineItemRepository.saveAll(any())).thenReturn(createdLineItems)
//        `when`(purchaseOrderMapper.toDtoWithLineItems(any(), any())).thenReturn(
//            PurchaseOrderDto(
//                id = createdPurchaseOrder.id!!,
//                poNumber = createdPurchaseOrder.poNumber,
//                title = createdPurchaseOrder.title,
//                description = createdPurchaseOrder.description,
//                supplierId = createdPurchaseOrder.supplier.id!!,
//                supplierName = createdPurchaseOrder.supplier.name,
//                tenantId = createdPurchaseOrder.tenant.id!!,
//                tenantName = createdPurchaseOrder.tenant.name,
//                branchId = createdPurchaseOrder.branch.id!!,
//                branchName = createdPurchaseOrder.branch.name,
//                status = createdPurchaseOrder.status,
//                totalAmount = createdPurchaseOrder.totalAmount,
//                grandTotal = createdPurchaseOrder.grandTotal,
//                paymentTerms = createdPurchaseOrder.paymentTerms,
//                expectedDeliveryDate = createdPurchaseOrder.expectedDeliveryDate,
//                notes = createdPurchaseOrder.notes,
//                createdBy = createdPurchaseOrder.createdBy,
//                createdAt = createdPurchaseOrder.createdAt,
//                updatedAt = createdPurchaseOrder.updatedAt,
//                lineItems = emptyList()
//            )
//        )
//
//        // Act
//        val result = purchaseOrderService.createPurchaseOrder(createRequest, "testuser")
//
//        // Assert
//        assert(result.title == createRequest.title)
//        assert(result.description == createRequest.description)
//        verify(purchaseOrderRepository, times(2)).save(any(PurchaseOrder::class.java))
//        verify(lineItemRepository).saveAll(any())
//        verify(historyRepository).save(any(PurchaseOrderHistory::class.java))
//    }
//
//    @Test
//    fun `createPurchaseOrder should throw exception when supplier not found`() {
//        // Arrange
//        val createRequest = CreatePurchaseOrderRequest(
//            title = "Test PO",
//            description = "Test description",
//            supplierId = UUID.randomUUID(),
//            paymentTerms = "Net 30",
//            expectedDeliveryDate = LocalDate.now().plusDays(7),
//            notes = "Test notes",
//            lineItems = listOf(
//                CreatePurchaseOrderLineItemRequest(
//                    productId = testProduct.id!!,
//                    quantity = 10,
//                    unitPrice = BigDecimal("10.00"),
//                    expectedDeliveryDate = LocalDate.now().plusDays(7),
//                    notes = "Test line item"
//                )
//            )
//        )
//
//        `when`(tenantRepository.findById(testTenant.id!!)).thenReturn(Optional.of(testTenant))
//        `when`(supplierRepository.findById(any())).thenReturn(Optional.empty())
//
//        // Act & Assert
//        try {
//            purchaseOrderService.createPurchaseOrder(createRequest, "testuser")
//            assert(false) { "Expected exception was not thrown" }
//        } catch (e: RuntimeException) {
//            assert(e.message!!.contains("Supplier not found"))
//        }
//    }
//
//    @Test
//    fun `createPurchaseOrder should throw exception when line items are empty`() {
//        // Arrange
//        val createRequest = CreatePurchaseOrderRequest(
//            title = "Test PO",
//            description = "Test description",
//            supplierId = testSupplier.id!!,
//            branchId = testBranch.id!!,
//            paymentTerms = "Net 30",
//            expectedDeliveryDate = LocalDate.now().plusDays(7),
//            notes = "Test notes",
//            lineItems = emptyList()
//        )
//
//        `when`(tenantRepository.findById(testTenant.id!!)).thenReturn(Optional.of(testTenant))
//        `when`(supplierRepository.findById(testSupplier.id!!)).thenReturn(Optional.of(testSupplier))
//        `when`(branchRepository.findById(testBranch.id!!)).thenReturn(Optional.of(testBranch))
//
//        // Act & Assert
//        try {
//            purchaseOrderService.createPurchaseOrder(createRequest, "testuser")
//            assert(false) { "Expected exception was not thrown" }
//        } catch (e: RuntimeException) {
//            assert(e.message!!.contains("Purchase order must have at least one line item"))
//        }
//    }
//
//    @Test
//    fun `createPurchaseOrder should throw exception when branch not found`() {
//        // Arrange
//        val createRequest = CreatePurchaseOrderRequest(
//            title = "Test PO",
//            description = "Test description",
//            supplierId = testSupplier.id!!,
//            branchId = UUID.randomUUID(),
//            paymentTerms = "Net 30",
//            expectedDeliveryDate = LocalDate.now().plusDays(7),
//            notes = "Test notes",
//            lineItems = listOf(
//                CreatePurchaseOrderLineItemRequest(
//                    productId = testProduct.id!!,
//                    quantity = 10,
//                    unitPrice = BigDecimal("10.00"),
//                    expectedDeliveryDate = LocalDate.now().plusDays(7),
//                    notes = "Test line item"
//                )
//            )
//        )
//
//        `when`(tenantRepository.findById(testTenant.id!!)).thenReturn(Optional.of(testTenant))
//        `when`(supplierRepository.findById(testSupplier.id!!)).thenReturn(Optional.of(testSupplier))
//        `when`(branchRepository.findById(any())).thenReturn(Optional.empty())
//
//        // Act & Assert
//        try {
//            purchaseOrderService.createPurchaseOrder(createRequest, "testuser")
//            assert(false) { "Expected exception was not thrown" }
//        } catch (e: RuntimeException) {
//            assert(e.message!!.contains("Branch not found"))
//        }
//    }
//
//    @Test
//    fun `getPurchaseOrderById should return purchase order when found`() {
//        // Arrange
//        val purchaseOrderDto = PurchaseOrderDto(
//            id = testPurchaseOrder.id!!,
//            poNumber = testPurchaseOrder.poNumber,
//            title = testPurchaseOrder.title,
//            description = testPurchaseOrder.description,
//            supplierId = testPurchaseOrder.supplier.id!!,
//            supplierName = testPurchaseOrder.supplier.name,
//            status = testPurchaseOrder.status,
//            totalAmount = testPurchaseOrder.totalAmount,
//            grandTotal = testPurchaseOrder.grandTotal,
//            paymentTerms = testPurchaseOrder.paymentTerms,
//            expectedDeliveryDate = testPurchaseOrder.expectedDeliveryDate,
//            notes = testPurchaseOrder.notes,
//            createdBy = testPurchaseOrder.createdBy,
//            createdAt = testPurchaseOrder.createdAt,
//            updatedAt = testPurchaseOrder.updatedAt,
//            lineItems = emptyList()
//        )
//
//        `when`(purchaseOrderRepository.findById(testPurchaseOrder.id!!)).thenReturn(Optional.of(testPurchaseOrder))
//        `when`(lineItemRepository.findByPurchaseOrderId(testPurchaseOrder.id!!)).thenReturn(listOf(testLineItem))
//        `when`(purchaseOrderMapper.toDtoWithLineItems(any(), any())).thenReturn(purchaseOrderDto)
//
//        // Act
//        val result = purchaseOrderService.getPurchaseOrderById(testPurchaseOrder.id!!)
//
//        // Assert
//        assert(result.id == testPurchaseOrder.id)
//        assert(result.title == testPurchaseOrder.title)
//        verify(purchaseOrderRepository).findById(testPurchaseOrder.id!!)
//        verify(lineItemRepository).findByPurchaseOrderId(testPurchaseOrder.id!!)
//    }
//
//    @Test
//    fun `getPurchaseOrderById should throw exception when purchase order not found`() {
//        // Arrange
//        val nonExistentId = UUID.randomUUID()
//        `when`(purchaseOrderRepository.findById(nonExistentId)).thenReturn(Optional.empty())
//
//        // Act & Assert
//        try {
//            purchaseOrderService.getPurchaseOrderById(nonExistentId)
//            assert(false) { "Expected exception was not thrown" }
//        } catch (e: RuntimeException) {
//            assert(e.message!!.contains("Purchase order not found"))
//        }
//    }
//
//    @Test
//    fun `getAllPurchaseOrders should return purchase order list response`() {
//        // Arrange
//        val purchaseOrders = listOf(testPurchaseOrder)
//        val purchaseOrderDtos = listOf(
//            PurchaseOrderDto(
//                id = testPurchaseOrder.id!!,
//                poNumber = testPurchaseOrder.poNumber,
//                title = testPurchaseOrder.title,
//                description = testPurchaseOrder.description,
//                supplierId = testPurchaseOrder.supplier.id!!,
//                supplierName = testPurchaseOrder.supplier.name,
//                status = testPurchaseOrder.status,
//                totalAmount = testPurchaseOrder.totalAmount,
//                grandTotal = testPurchaseOrder.grandTotal,
//                paymentTerms = testPurchaseOrder.paymentTerms,
//                expectedDeliveryDate = testPurchaseOrder.expectedDeliveryDate,
//                notes = testPurchaseOrder.notes,
//                createdBy = testPurchaseOrder.createdBy,
//                createdAt = testPurchaseOrder.createdAt,
//                updatedAt = testPurchaseOrder.updatedAt,
//                lineItems = emptyList()
//            )
//        )
//
//        `when`(purchaseOrderRepository.findByTenantId(testTenant.id!!)).thenReturn(purchaseOrders)
//        `when`(purchaseOrderMapper.toDtoList(purchaseOrders)).thenReturn(purchaseOrderDtos)
//
//        // Act
//        val result = purchaseOrderService.getAllPurchaseOrders()
//
//        // Assert
//        assert(result.purchaseOrders.size == 1)
//        assert(result.totalCount == 1L)
//        assert(result.draftCount == 1L)
//        verify(purchaseOrderRepository).findByTenantId(testTenant.id!!)
//    }
//
//    @Test
//    fun `changePurchaseOrderStatus should change status successfully`() {
//        // Arrange
//        val statusChangeRequest = ChangePurchaseOrderStatusRequest(
//            newStatus = PurchaseOrderStatus.PENDING_APPROVAL,
//            notes = "Submitted for approval"
//        )
//
//        val updatedPurchaseOrder = testPurchaseOrder.copy(
//            status = PurchaseOrderStatus.PENDING_APPROVAL,
//            updatedAt = OffsetDateTime.now()
//        )
//
//        `when`(purchaseOrderRepository.findById(testPurchaseOrder.id!!)).thenReturn(Optional.of(testPurchaseOrder))
//        `when`(purchaseOrderRepository.save(any(PurchaseOrder::class.java))).thenReturn(updatedPurchaseOrder)
//        `when`(lineItemRepository.findByPurchaseOrderId(testPurchaseOrder.id!!)).thenReturn(listOf(testLineItem))
//        `when`(purchaseOrderMapper.toDtoWithLineItems(any(), any())).thenReturn(
//            PurchaseOrderDto(
//                id = updatedPurchaseOrder.id!!,
//                poNumber = updatedPurchaseOrder.poNumber,
//                title = updatedPurchaseOrder.title,
//                description = updatedPurchaseOrder.description,
//                supplierId = updatedPurchaseOrder.supplier.id!!,
//                supplierName = updatedPurchaseOrder.supplier.name,
//                status = updatedPurchaseOrder.status,
//                totalAmount = updatedPurchaseOrder.totalAmount,
//                grandTotal = updatedPurchaseOrder.grandTotal,
//                paymentTerms = updatedPurchaseOrder.paymentTerms,
//                expectedDeliveryDate = updatedPurchaseOrder.expectedDeliveryDate,
//                notes = updatedPurchaseOrder.notes,
//                createdBy = updatedPurchaseOrder.createdBy,
//                createdAt = updatedPurchaseOrder.createdAt,
//                updatedAt = updatedPurchaseOrder.updatedAt,
//                lineItems = emptyList()
//            )
//        )
//
//        // Act
//        val result = purchaseOrderService.changePurchaseOrderStatus(
//            testPurchaseOrder.id!!,
//            statusChangeRequest,
//            "testuser"
//        )
//
//        // Assert
//        assert(result.status == PurchaseOrderStatus.PENDING_APPROVAL)
//        verify(purchaseOrderRepository).save(any(PurchaseOrder::class.java))
//        verify(historyRepository).save(any(PurchaseOrderHistory::class.java))
//    }
//
//    @Test
//    fun `changePurchaseOrderStatus should throw exception for invalid status transition`() {
//        // Arrange
//        val statusChangeRequest = ChangePurchaseOrderStatusRequest(
//            newStatus = PurchaseOrderStatus.CLOSED,
//            notes = "Invalid transition"
//        )
//
//        `when`(purchaseOrderRepository.findById(testPurchaseOrder.id!!)).thenReturn(Optional.of(testPurchaseOrder))
//
//        // Act & Assert
//        try {
//            purchaseOrderService.changePurchaseOrderStatus(
//                testPurchaseOrder.id!!,
//                statusChangeRequest,
//                "testuser"
//            )
//            assert(false) { "Expected exception was not thrown" }
//        } catch (e: RuntimeException) {
//            assert(e.message!!.contains("Invalid status transition"))
//        }
//    }
//
//    @Test
//    fun `approvePurchaseOrder should approve purchase order successfully`() {
//        // Arrange
//        val approvalRequest = ApprovePurchaseOrderRequest(
//            approvedBy = "adminuser",
//            notes = "Approved by admin"
//        )
//
//        val pendingPurchaseOrder = testPurchaseOrder.copy(status = PurchaseOrderStatus.PENDING_APPROVAL)
//        val approvedPurchaseOrder = testPurchaseOrder.copy(
//            status = PurchaseOrderStatus.APPROVED,
//            approvedBy = "adminuser",
//            approvedAt = OffsetDateTime.now(),
//            updatedAt = OffsetDateTime.now()
//        )
//
//        `when`(purchaseOrderRepository.findById(testPurchaseOrder.id!!)).thenReturn(Optional.of(pendingPurchaseOrder))
//        `when`(purchaseOrderRepository.save(any(PurchaseOrder::class.java))).thenReturn(approvedPurchaseOrder)
//        `when`(lineItemRepository.findByPurchaseOrderId(testPurchaseOrder.id!!)).thenReturn(listOf(testLineItem))
//        `when`(purchaseOrderMapper.toDtoWithLineItems(any(), any())).thenReturn(
//            PurchaseOrderDto(
//                id = approvedPurchaseOrder.id!!,
//                poNumber = approvedPurchaseOrder.poNumber,
//                title = approvedPurchaseOrder.title,
//                description = approvedPurchaseOrder.description,
//                supplierId = approvedPurchaseOrder.supplier.id!!,
//                supplierName = approvedPurchaseOrder.supplier.name,
//                status = approvedPurchaseOrder.status,
//                totalAmount = approvedPurchaseOrder.totalAmount,
//                grandTotal = approvedPurchaseOrder.grandTotal,
//                paymentTerms = approvedPurchaseOrder.paymentTerms,
//                expectedDeliveryDate = approvedPurchaseOrder.expectedDeliveryDate,
//                notes = approvedPurchaseOrder.notes,
//                createdBy = approvedPurchaseOrder.createdBy,
//                createdAt = approvedPurchaseOrder.createdAt,
//                updatedAt = approvedPurchaseOrder.updatedAt,
//                lineItems = emptyList()
//            )
//        )
//
//        // Act
//        val result = purchaseOrderService.approvePurchaseOrder(testPurchaseOrder.id!!, approvalRequest)
//
//        // Assert
//        assert(result.status == PurchaseOrderStatus.APPROVED)
//        assert(result.approvedBy == "adminuser")
//        verify(purchaseOrderRepository).save(any(PurchaseOrder::class.java))
//        verify(historyRepository).save(any(PurchaseOrderHistory::class.java))
//    }
//
//    @Test
//    fun `approvePurchaseOrder should throw exception when not in pending approval status`() {
//        // Arrange
//        val approvalRequest = ApprovePurchaseOrderRequest(
//            approvedBy = "adminuser",
//            notes = "Approved by admin"
//        )
//
//        `when`(purchaseOrderRepository.findById(testPurchaseOrder.id!!)).thenReturn(Optional.of(testPurchaseOrder))
//
//        // Act & Assert
//        try {
//            purchaseOrderService.approvePurchaseOrder(testPurchaseOrder.id!!, approvalRequest)
//            assert(false) { "Expected exception was not thrown" }
//        } catch (e: RuntimeException) {
//            assert(e.message!!.contains("Only pending approval purchase orders can be approved"))
//        }
//    }
//
//    @Test
//    fun `deletePurchaseOrder should delete purchase order successfully`() {
//        // Arrange
//        `when`(purchaseOrderRepository.findById(testPurchaseOrder.id!!)).thenReturn(Optional.of(testPurchaseOrder))
//        `when`(lineItemRepository.deleteByPurchaseOrderId(testPurchaseOrder.id!!)).thenReturn(Unit)
//
//        // Act
//        purchaseOrderService.deletePurchaseOrder(testPurchaseOrder.id!!)
//
//        // Assert
//        verify(lineItemRepository).deleteByPurchaseOrderId(testPurchaseOrder.id!!)
//        verify(purchaseOrderRepository).deleteById(testPurchaseOrder.id!!)
//    }
//
//    @Test
//    fun `deletePurchaseOrder should throw exception when not in draft status`() {
//        // Arrange
//        val nonDraftPurchaseOrder = testPurchaseOrder.copy(status = PurchaseOrderStatus.APPROVED)
//        `when`(purchaseOrderRepository.findById(testPurchaseOrder.id!!)).thenReturn(Optional.of(nonDraftPurchaseOrder))
//
//        // Act & Assert
//        try {
//            purchaseOrderService.deletePurchaseOrder(testPurchaseOrder.id!!)
//            assert(false) { "Expected exception was not thrown" }
//        } catch (e: RuntimeException) {
//            assert(e.message!!.contains("Only draft purchase orders can be deleted"))
//        }
//    }
//
//    @Test
//    fun `getPurchaseOrderSummary should return summary statistics`() {
//        // Arrange
//        val purchaseOrders = listOf(testPurchaseOrder)
//        val statusBreakdown = listOf(
//            arrayOf(PurchaseOrderStatus.DRAFT, 1L)
//        )
//
//        `when`(purchaseOrderRepository.countByTenantId(testTenant.id!!)).thenReturn(1L)
//        `when`(purchaseOrderRepository.countByStatusAndTenantId(testTenant.id!!)).thenReturn(statusBreakdown)
//        `when`(purchaseOrderRepository.findByTenantId(testTenant.id!!)).thenReturn(purchaseOrders)
//        `when`(purchaseOrderRepository.findOverduePurchaseOrders(any(), any())).thenReturn(emptyList())
//        `when`(purchaseOrderRepository.getMonthlyTrends(any(), any())).thenReturn(emptyList())
//
//        // Act
//        val result = purchaseOrderService.getPurchaseOrderSummary()
//
//        // Assert
//        assert(result.totalPurchaseOrders == 1L)
//        assert(result.totalValue == BigDecimal("100.00"))
//        assert(result.draftCount == 1L)
//        verify(purchaseOrderRepository).countByTenantId(testTenant.id!!)
//        verify(purchaseOrderRepository).countByStatusAndTenantId(testTenant.id!!)
//    }
//
//    @Test
//    fun `getPurchaseOrderHistory should return history entries`() {
//        // Arrange
//        val historyEntry = PurchaseOrderHistory(
//            id = UUID.randomUUID(),
//            purchaseOrder = testPurchaseOrder,
//            previousStatus = null,
//            newStatus = PurchaseOrderStatus.DRAFT,
//            action = "PURCHASE_ORDER_CREATED",
//            description = "Purchase order created",
//            performedBy = "testuser",
//            performedAt = OffsetDateTime.now()
//        )
//
//        val historySummary = mapOf(
//            "id" to historyEntry.id,
//            "action" to historyEntry.action,
//            "description" to historyEntry.description
//        )
//
//        `when`(purchaseOrderRepository.findById(testPurchaseOrder.id!!)).thenReturn(Optional.of(testPurchaseOrder))
//        `when`(historyRepository.findByPurchaseOrderId(testPurchaseOrder.id!!)).thenReturn(listOf(historyEntry))
//        `when`(purchaseOrderMapper.toHistorySummaryList(listOf(historyEntry))).thenReturn(listOf(historySummary))
//
//        // Act
//        val result = purchaseOrderService.getPurchaseOrderHistory(testPurchaseOrder.id!!)
//
//        // Assert
//        assert(result.size == 1)
//        assert(result[0]["action"] == "PURCHASE_ORDER_CREATED")
//        verify(historyRepository).findByPurchaseOrderId(testPurchaseOrder.id!!)
//    }
//}
