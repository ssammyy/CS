package com.chemsys.service

import com.chemsys.dto.*
import com.chemsys.entity.*
import com.chemsys.mapper.PurchaseOrderMapper
import com.chemsys.repository.PurchaseOrderRepository
import com.chemsys.repository.PurchaseOrderLineItemRepository
import com.chemsys.repository.PurchaseOrderHistoryRepository
import com.chemsys.repository.SupplierRepository
import com.chemsys.repository.ProductRepository
import com.chemsys.repository.TenantRepository
import com.chemsys.repository.BranchRepository
import com.chemsys.config.TenantContext
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.*

/**
 * PurchaseOrderService handles all business logic for purchase order management.
 * Provides CRUD operations, workflow management, line item operations, and audit trail.
 *
 * This service follows the Backend Data Consistency Rule by ensuring:
 * - All operations are transactional (@Transactional annotation)
 * - Proper tenant isolation for multi-tenant architecture
 * - Comprehensive error handling and validation
 * - Audit trail through history logging
 * - Proper status transition validation
 */
@Service
class PurchaseOrderService(
    private val purchaseOrderRepository: PurchaseOrderRepository,
    private val lineItemRepository: PurchaseOrderLineItemRepository,
    private val historyRepository: PurchaseOrderHistoryRepository,
    private val supplierRepository: SupplierRepository,
    private val productRepository: ProductRepository,
    private val tenantRepository: TenantRepository,
    private val branchRepository: BranchRepository,
    private val purchaseOrderMapper: PurchaseOrderMapper,
    private val inventoryService: InventoryService
) {

    companion object {
        private val logger = LoggerFactory.getLogger(PurchaseOrderService::class.java)
    }

    /**
     * Creates a new purchase order with line items.
     *
     * @param request Purchase order creation request
     * @param createdBy User creating the purchase order
     * @return Created purchase order details
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    @Transactional
    fun createPurchaseOrder(request: CreatePurchaseOrderRequest, createdBy: String): PurchaseOrderDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val tenant = tenantRepository.findById(currentTenantId)
            .orElseThrow { RuntimeException("Tenant not found") }

        val supplier = supplierRepository.findById(request.supplierId)
            .orElseThrow { RuntimeException("Supplier not found with id: ${request.supplierId}") }

        // Verify supplier belongs to current tenant
        if (supplier.tenant.id != currentTenantId) {
            throw RuntimeException("Supplier not found with id: ${request.supplierId}")
        }

        val branch = branchRepository.findById(request.branchId)
            .orElseThrow { RuntimeException("Branch not found with id: ${request.branchId}") }

        // Verify branch belongs to current tenant
        if (branch.tenant.id != currentTenantId) {
            throw RuntimeException("Branch not found with id: ${request.branchId}")
        }

        // Validate line items
        if (request.lineItems.isEmpty()) {
            throw RuntimeException("Purchase order must have at least one line item")
        }

        // Create purchase order
        val purchaseOrder = purchaseOrderMapper.fromCreateRequest(request, supplier, tenant, branch, createdBy)
        
        // Calculate initial totals
        val purchaseOrderWithTotals = calculateTotals(purchaseOrder)
        
        val savedPurchaseOrder = purchaseOrderRepository.save(purchaseOrderWithTotals)

        // Create line items
        val products = productRepository.findAllById(request.lineItems.map { it.productId })
            .associateBy { it.id!! }

        val lineItems = purchaseOrderMapper.fromCreateLineItemRequests(
            request.lineItems, 
            savedPurchaseOrder, 
            products
        )

        // Save line items
        val savedLineItems = lineItemRepository.saveAll(lineItems)

        // Recalculate totals with line items
        val finalPurchaseOrder = recalculateTotals(savedPurchaseOrder, savedLineItems)
        val finalSavedPurchaseOrder = purchaseOrderRepository.save(finalPurchaseOrder)

        // Log creation history
        logHistoryEntry(
            finalSavedPurchaseOrder,
            "PURCHASE_ORDER_CREATED",
            "Purchase order created with ${savedLineItems.size} line items"
        )

        return purchaseOrderMapper.toDtoWithLineItems(finalSavedPurchaseOrder, savedLineItems)
    }

    /**
     * Updates an existing purchase order.
     *
     * @param id Purchase order ID
     * @param request Purchase order update request
     * @param updatedBy User updating the purchase order
     * @return Updated purchase order details
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    @Transactional
    fun updatePurchaseOrder(id: UUID, request: UpdatePurchaseOrderRequest, updatedBy: String): PurchaseOrderDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val purchaseOrder = purchaseOrderRepository.findById(id)
            .orElseThrow { RuntimeException("Purchase order not found with id: $id") }

        // Verify purchase order belongs to current tenant
        if (purchaseOrder.tenant.id != currentTenantId) {
            throw RuntimeException("Purchase order not found with id: $id")
        }

        // Check if purchase order can be updated
        if (purchaseOrder.status != PurchaseOrderStatus.DRAFT) {
            throw RuntimeException("Only draft purchase orders can be updated")
        }

        // Update basic fields
        val updatedPurchaseOrder = purchaseOrder.copy(
            title = request.title ?: purchaseOrder.title,
            description = request.description ?: purchaseOrder.description,
            supplier = if (request.supplierId != null) {
                val supplier = supplierRepository.findById(request.supplierId)
                    .orElseThrow { RuntimeException("Supplier not found with id: ${request.supplierId}") }
                if (supplier.tenant.id != currentTenantId) {
                    throw RuntimeException("Supplier not found with id: ${request.supplierId}")
                }
                supplier
            } else purchaseOrder.supplier,
            branch = if (request.branchId != null) {
                val branch = branchRepository.findById(request.branchId)
                    .orElseThrow { RuntimeException("Branch not found with id: ${request.branchId}") }
                if (branch.tenant.id != currentTenantId) {
                    throw RuntimeException("Branch not found with id: ${request.branchId}")
                }
                branch
            } else purchaseOrder.branch,
            paymentTerms = request.paymentTerms ?: purchaseOrder.paymentTerms,
            expectedDeliveryDate = request.expectedDeliveryDate ?: purchaseOrder.expectedDeliveryDate,
            notes = request.notes ?: purchaseOrder.notes,
            updatedAt = OffsetDateTime.now()
        )

        // Update line items if provided
        if (request.lineItems != null) {
            // Delete existing line items
            lineItemRepository.deleteByPurchaseOrderId(id)
            
            // Create new line items
            val products = productRepository.findAllById(request.lineItems.mapNotNull { it.productId })
                .associateBy { it.id!! }

            val newLineItems = request.lineItems.mapNotNull { lineItemRequest ->
                if (lineItemRequest.productId != null && lineItemRequest.quantity != null && lineItemRequest.unitPrice != null) {
                    val product = products[lineItemRequest.productId] ?: return@mapNotNull null
                    
                    PurchaseOrderLineItem(
                        purchaseOrder = updatedPurchaseOrder,
                        product = product,
                        quantity = lineItemRequest.quantity,
                        unitPrice = lineItemRequest.unitPrice,
                        totalPrice = lineItemRequest.unitPrice.multiply(BigDecimal.valueOf(lineItemRequest.quantity.toLong())),
                        expectedDeliveryDate = lineItemRequest.expectedDeliveryDate,
                        notes = lineItemRequest.notes
                    )
                } else null
            }

            // Save new line items
            val savedLineItems = lineItemRepository.saveAll(newLineItems)
            
            // Recalculate totals
            val finalPurchaseOrder = recalculateTotals(updatedPurchaseOrder, savedLineItems)
            val finalSavedPurchaseOrder = purchaseOrderRepository.save(finalPurchaseOrder)

            // Log update history
            logHistoryEntry(
                finalSavedPurchaseOrder,
                "PURCHASE_ORDER_UPDATED",
                "Purchase order updated by $updatedBy"
            )

            return purchaseOrderMapper.toDtoWithLineItems(finalSavedPurchaseOrder, savedLineItems)
        } else {
            val savedPurchaseOrder = purchaseOrderRepository.save(updatedPurchaseOrder)
            
            // Log update history
            logHistoryEntry(
                savedPurchaseOrder,
                "PURCHASE_ORDER_UPDATED",
                "Purchase order updated by $updatedBy"
            )

            val lineItems = lineItemRepository.findByPurchaseOrderId(id)
            return purchaseOrderMapper.toDtoWithLineItems(savedPurchaseOrder, lineItems)
        }
    }

    /**
     * Retrieves a purchase order by ID.
     *
     * @param id Purchase order ID
     * @return Purchase order details with line items
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrderById(id: UUID): PurchaseOrderDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val purchaseOrder = purchaseOrderRepository.findById(id)
            .orElseThrow { RuntimeException("Purchase order not found with id: $id") }

        // Verify purchase order belongs to current tenant
        if (purchaseOrder.tenant.id != currentTenantId) {
            throw RuntimeException("Purchase order not found with id: $id")
        }

        val lineItems = lineItemRepository.findByPurchaseOrderId(id)
        return purchaseOrderMapper.toDtoWithLineItems(purchaseOrder, lineItems)
    }

    /**
     * Retrieves all purchase orders for the current tenant.
     *
     * @return List of purchase orders with summary information
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getAllPurchaseOrders(): PurchaseOrderListResponse {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val purchaseOrders = purchaseOrderRepository.findByTenantId(currentTenantId)
        val purchaseOrderDtos = purchaseOrderMapper.toDtoList(purchaseOrders)

        val totalCount = purchaseOrders.size.toLong()
        val draftCount = purchaseOrders.count { it.status == PurchaseOrderStatus.DRAFT }.toLong()
        val pendingApprovalCount = purchaseOrders.count { it.status == PurchaseOrderStatus.PENDING_APPROVAL }.toLong()
        val approvedCount = purchaseOrders.count { it.status == PurchaseOrderStatus.APPROVED }.toLong()
        val deliveredCount = purchaseOrders.count { it.status == PurchaseOrderStatus.DELIVERED }.toLong()
        val closedCount = purchaseOrders.count { it.status == PurchaseOrderStatus.CLOSED }.toLong()

        return PurchaseOrderListResponse(
            purchaseOrders = purchaseOrderDtos,
            totalCount = totalCount,
            draftCount = draftCount,
            pendingApprovalCount = pendingApprovalCount,
            approvedCount = approvedCount,
            deliveredCount = deliveredCount,
            closedCount = closedCount
        )
    }

    /**
     * Retrieves purchase orders with pagination and filtering.
     *
     * @param page Page number (0-based)
     * @param size Page size
     * @param poNumber Filter by PO number
     * @param title Filter by title
     * @param supplierId Filter by supplier
     * @param branchId Filter by branch
     * @param status Filter by status
     * @param startDate Filter by start date
     * @param endDate Filter by end date
     * @return Paginated list of purchase orders
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrdersWithPagination(
        page: Int = 0,
        size: Int = 20,
        poNumber: String? = null,
        title: String? = null,
        supplierId: UUID? = null,
        branchId: UUID? = null,
        status: PurchaseOrderStatus? = null,
        startDate: OffsetDateTime? = null,
        endDate: OffsetDateTime? = null
    ): Page<PurchaseOrderDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        // Get ALL purchase orders for the tenant first (we'll filter in memory)
        val allPurchaseOrders = purchaseOrderRepository.findByTenantIdOrderByCreatedAtDesc(
            tenantId = currentTenantId,
            pageable = PageRequest.of(0, 10000, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).content

        // Apply all filters in memory
        var filteredOrders = allPurchaseOrders

        // Filter by PO number
        if (!poNumber.isNullOrBlank()) {
            filteredOrders = filteredOrders.filter { 
                it.poNumber.contains(poNumber.trim(), ignoreCase = true) 
            }
        }

        // Filter by title
        if (!title.isNullOrBlank()) {
            filteredOrders = filteredOrders.filter { 
                it.title.contains(title.trim(), ignoreCase = true) 
            }
        }

        // Filter by supplier
        if (supplierId != null) {
            filteredOrders = filteredOrders.filter { it.supplier.id == supplierId }
        }

        // Filter by branch
        if (branchId != null) {
            filteredOrders = filteredOrders.filter { it.branch.id == branchId }
        }

        // Filter by status
        if (status != null) {
            filteredOrders = filteredOrders.filter { it.status == status }
        }

        // Filter by date range
        if (startDate != null) {
            filteredOrders = filteredOrders.filter { it.createdAt >= startDate }
        }
        if (endDate != null) {
            filteredOrders = filteredOrders.filter { it.createdAt <= endDate }
        }

        // Apply pagination manually
        val totalElements = filteredOrders.size
        val startIndex = page * size
        val endIndex = minOf(startIndex + size, totalElements)
        val paginatedContent = if (startIndex < totalElements) {
            filteredOrders.subList(startIndex, endIndex)
        } else {
            emptyList()
        }

        // Create page object
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        val pageImpl = PageImpl(paginatedContent, pageable, totalElements.toLong())

        return pageImpl.map { purchaseOrder -> purchaseOrderMapper.toDto(purchaseOrder) }
    }

    /**
     * Searches purchase orders by PO number, title, or supplier.
     *
     * @param query Search query
     * @return Search results
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun searchPurchaseOrders(query: String): PurchaseOrderSearchResult {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val purchaseOrders = mutableListOf<PurchaseOrder>()

        // Search by PO number
        purchaseOrders.addAll(purchaseOrderRepository.findByPoNumberContainingAndTenantId(query, currentTenantId))

        // Search by title
        purchaseOrders.addAll(purchaseOrderRepository.findByTitleContainingAndTenantId(query, currentTenantId))

        // Remove duplicates and sort by creation date
        val uniquePurchaseOrders = purchaseOrders.distinctBy { it.id }.sortedByDescending { it.createdAt }
        val purchaseOrderDtos = purchaseOrderMapper.toDtoList(uniquePurchaseOrders)

        return PurchaseOrderSearchResult(
            purchaseOrders = purchaseOrderDtos,
            totalCount = purchaseOrderDtos.size.toLong(),
            searchQuery = query
        )
    }

    /**
     * Retrieves purchase orders by status.
     *
     * @param status Purchase order status
     * @return List of purchase orders with the specified status
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrdersByStatus(status: PurchaseOrderStatus): List<PurchaseOrderDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val purchaseOrders = purchaseOrderRepository.findByStatusAndTenantId(status, currentTenantId)
        return purchaseOrderMapper.toDtoList(purchaseOrders)
    }

    /**
     * Retrieves purchase orders by supplier.
     *
     * @param supplierId Supplier ID
     * @return List of purchase orders for the specified supplier
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrdersBySupplier(supplierId: UUID): List<PurchaseOrderDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val purchaseOrders = purchaseOrderRepository.findBySupplierIdAndTenantId(supplierId, currentTenantId)
        return purchaseOrderMapper.toDtoList(purchaseOrders)
    }

    /**
     * Retrieves purchase orders by branch.
     *
     * @param branchId Branch ID
     * @return List of purchase orders for the specified branch
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrdersByBranch(branchId: UUID): List<PurchaseOrderDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val purchaseOrders = purchaseOrderRepository.findByBranchIdAndTenantId(branchId, currentTenantId)
        return purchaseOrderMapper.toDtoList(purchaseOrders)
    }

    /**
     * Retrieves overdue purchase orders.
     *
     * @return List of overdue purchase orders
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getOverduePurchaseOrders(): List<PurchaseOrderDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val currentDate = LocalDate.now()
        val overduePurchaseOrders = purchaseOrderRepository.findOverduePurchaseOrders(currentTenantId, currentDate)
        return purchaseOrderMapper.toDtoList(overduePurchaseOrders)
    }

    /**
     * Retrieves purchase orders due for delivery within specified days.
     *
     * @param days Number of days
     * @return List of purchase orders due for delivery
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrdersDueForDelivery(days: Int): List<PurchaseOrderDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val startDate = LocalDate.now()
        val endDate = startDate.plusDays(days.toLong())
        val duePurchaseOrders = purchaseOrderRepository.findPurchaseOrdersDueForDelivery(currentTenantId, startDate, endDate)
        return purchaseOrderMapper.toDtoList(duePurchaseOrders)
    }

    /**
     * Changes purchase order status.
     *
     * @param id Purchase order ID
     * @param request Status change request
     * @param performedBy User performing the status change
     * @return Updated purchase order details
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional
    fun changePurchaseOrderStatus(
        id: UUID, 
        request: ChangePurchaseOrderStatusRequest, 
        performedBy: String
    ): PurchaseOrderDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val purchaseOrder = purchaseOrderRepository.findById(id)
            .orElseThrow { RuntimeException("Purchase order not found with id: $id") }

        // Verify purchase order belongs to current tenant
        if (purchaseOrder.tenant.id != currentTenantId) {
            throw RuntimeException("Purchase order not found with id: $id")
        }

        // Validate status transition
        if (!isValidStatusTransition(purchaseOrder.status, request.newStatus)) {
            throw RuntimeException("Invalid status transition from ${purchaseOrder.status} to ${request.newStatus}")
        }

        val previousStatus = purchaseOrder.status
        val updatedPurchaseOrder = purchaseOrder.copy(
            status = request.newStatus,
            updatedAt = OffsetDateTime.now()
        )

        val savedPurchaseOrder = purchaseOrderRepository.save(updatedPurchaseOrder)

        // Log status change history
        logHistoryEntry(
            savedPurchaseOrder,
            "STATUS_CHANGED",
            "Status changed from $previousStatus to ${request.newStatus}. ${request.notes ?: ""}"
        )

        val lineItems = lineItemRepository.findByPurchaseOrderId(id)
        return purchaseOrderMapper.toDtoWithLineItems(savedPurchaseOrder, lineItems)
    }

    /**
     * Approves a purchase order.
     *
     * @param id Purchase order ID
     * @param request Approval request
     * @return Approved purchase order details
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional
    fun approvePurchaseOrder(id: UUID, request: ApprovePurchaseOrderRequest): PurchaseOrderDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val purchaseOrder = purchaseOrderRepository.findById(id)
            .orElseThrow { RuntimeException("Purchase order not found with id: $id") }

        // Verify purchase order belongs to current tenant
        if (purchaseOrder.tenant.id != currentTenantId) {
            throw RuntimeException("Purchase order not found with id: $id")
        }

        // Check if purchase order can be approved


        val updatedPurchaseOrder = purchaseOrder.copy(
            status = PurchaseOrderStatus.APPROVED,
            approvedBy = request.approvedBy,
            approvedAt = OffsetDateTime.now(),
            updatedAt = OffsetDateTime.now()
        )

        val savedPurchaseOrder = purchaseOrderRepository.save(updatedPurchaseOrder)

        // Log approval history
        logHistoryEntry(
            savedPurchaseOrder,
            "PURCHASE_ORDER_APPROVED",
            "Purchase order approved by ${request.approvedBy}. ${request.notes ?: ""}"
        )

        val lineItems = lineItemRepository.findByPurchaseOrderId(id)
        return purchaseOrderMapper.toDtoWithLineItems(savedPurchaseOrder, lineItems)
    }

    /**
     * Receives goods against a purchase order.
     *
     * @param id Purchase order ID
     * @param request Goods receiving request
     * @param receivedBy User receiving the goods
     * @return Updated purchase order details
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    @Transactional
    fun receiveGoods(id: UUID, request: ReceiveGoodsRequest, receivedBy: String): PurchaseOrderDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val purchaseOrder = purchaseOrderRepository.findById(id)
            .orElseThrow { RuntimeException("Purchase order not found with id: $id") }

        // Verify purchase order belongs to current tenant
        if (purchaseOrder.tenant.id != currentTenantId) {
            throw RuntimeException("Purchase order not found with id: $id")
        }

        // Check if purchase order can receive goods
        if (purchaseOrder.status != PurchaseOrderStatus.APPROVED) {
            throw RuntimeException("Only approved purchase orders can receive goods")
        }

        // Update line items with received quantities and update inventory
        val updatedLineItems = mutableListOf<PurchaseOrderLineItem>()
        for (receiptRequest in request.lineItems) {
            val lineItem = lineItemRepository.findById(receiptRequest.lineItemId)
                .orElseThrow { RuntimeException("Line item not found with id: ${receiptRequest.lineItemId}") }

            // Validate received quantity
            if (receiptRequest.receivedQuantity > lineItem.quantity) {
                throw RuntimeException("Received quantity cannot exceed ordered quantity for product ${lineItem.product.name}")
            }

            val updatedLineItem = lineItem.copy(
                receivedQuantity = lineItem.receivedQuantity + receiptRequest.receivedQuantity,
                updatedAt = OffsetDateTime.now()
            )
            val savedLineItem = lineItemRepository.save(updatedLineItem)
            updatedLineItems.add(savedLineItem)

            // Update inventory stock levels automatically
            try {
                inventoryService.updateStockFromPurchaseOrder(
                    productId = lineItem.product.id!!,
                    branchId = purchaseOrder.branch.id!!,
                    quantity = receiptRequest.receivedQuantity,
                    unitCost = lineItem.unitPrice,
                    batchNumber = null, // Could be enhanced to capture batch numbers
                    expiryDate = null,  // Could be enhanced to capture expiry dates
                    purchaseOrderId = purchaseOrder.id!!,
                    receivedBy = receivedBy
                )
            } catch (e: Exception) {
                // Log the error but don't fail the entire operation
                // This ensures PO status is updated even if inventory update fails
                logger.warn("Failed to update inventory for product ${lineItem.product.name}: ${e.message}", e)
            }
        }

        // Check if all line items are fully received
        val allFullyReceived = updatedLineItems.all { it.receivedQuantity >= it.quantity }
        
        // Update purchase order status if all goods received
        val newStatus = if (allFullyReceived) PurchaseOrderStatus.DELIVERED else PurchaseOrderStatus.APPROVED
        val actualDeliveryDate = if (allFullyReceived) LocalDate.now() else purchaseOrder.actualDeliveryDate

        val updatedPurchaseOrder = purchaseOrder.copy(
            status = newStatus,
            actualDeliveryDate = actualDeliveryDate,
            updatedAt = OffsetDateTime.now()
        )

        val savedPurchaseOrder = purchaseOrderRepository.save(updatedPurchaseOrder)

        // Log goods receiving history
        logHistoryEntry(
            savedPurchaseOrder,
            "GOODS_RECEIVED",
            "Goods received by $receivedBy. ${request.lineItems.size} line items updated. Stock levels automatically updated."
        )

        return purchaseOrderMapper.toDtoWithLineItems(savedPurchaseOrder, updatedLineItems)
    }

    /**
     * Deletes a purchase order.
     *
     * @param id Purchase order ID
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional
    fun deletePurchaseOrder(id: UUID) {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val purchaseOrder = purchaseOrderRepository.findById(id)
            .orElseThrow { RuntimeException("Purchase order not found with id: $id") }

        // Verify purchase order belongs to current tenant
        if (purchaseOrder.tenant.id != currentTenantId) {
            throw RuntimeException("Purchase order not found with id: $id")
        }

        // Check if purchase order can be deleted
        if (purchaseOrder.status != PurchaseOrderStatus.DRAFT) {
            throw RuntimeException("Only draft purchase orders can be deleted")
        }

        // Delete line items first (cascade will handle this)
        lineItemRepository.deleteByPurchaseOrderId(id)
        
        // Delete purchase order
        purchaseOrderRepository.deleteById(id)
    }

    /**
     * Retrieves purchase order summary statistics.
     *
     * @return Purchase order summary information
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrderSummary(): PurchaseOrderSummaryDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val totalPurchaseOrders = purchaseOrderRepository.countByTenantId(currentTenantId)
        val statusBreakdown = purchaseOrderRepository.countByStatusAndTenantId(currentTenantId)
            .associate { (status, count) ->
                status as PurchaseOrderStatus to (count as Long)
            }

        val draftCount = statusBreakdown[PurchaseOrderStatus.DRAFT] ?: 0L
        val pendingApprovalCount = statusBreakdown[PurchaseOrderStatus.PENDING_APPROVAL] ?: 0L
        val approvedCount = statusBreakdown[PurchaseOrderStatus.APPROVED] ?: 0L
        val deliveredCount = statusBreakdown[PurchaseOrderStatus.DELIVERED] ?: 0L
        val closedCount = statusBreakdown[PurchaseOrderStatus.CLOSED] ?: 0L

        // Calculate overdue count
        val currentDate = LocalDate.now()
        val overdueCount = purchaseOrderRepository.findOverduePurchaseOrders(currentTenantId, currentDate).size.toLong()

        // Calculate total value
        val totalValue = purchaseOrderRepository.findByTenantId(currentTenantId)
            .sumOf { it.grandTotal }

        // Get monthly trends (last 12 months)
        val startDate = OffsetDateTime.now().minusMonths(12)
        val monthlyTrends = purchaseOrderRepository.getMonthlyTrends(currentTenantId, startDate)
            .map { (year, month, count, totalValue) ->
                val monthName = getMonthName(month as Int)
                MonthlyPurchaseOrderTrend(
                    month = monthName,
                    year = year as Int,
                    count = count as Long,
                    totalValue = totalValue as BigDecimal
                )
            }

        return PurchaseOrderSummaryDto(
            totalPurchaseOrders = totalPurchaseOrders,
            totalValue = totalValue,
            draftCount = draftCount,
            pendingApprovalCount = pendingApprovalCount,
            approvedCount = approvedCount,
            deliveredCount = deliveredCount,
            closedCount = closedCount,
            overdueCount = overdueCount,
            statusBreakdown = statusBreakdown,
            monthlyTrend = monthlyTrends
        )
    }

    /**
     * Retrieves purchase order history/audit trail.
     *
     * @param id Purchase order ID
     * @return List of history entries
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrderHistory(id: UUID): List<Map<String, Any?>> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val purchaseOrder = purchaseOrderRepository.findById(id)
            .orElseThrow { RuntimeException("Purchase order not found with id: $id") }

        // Verify purchase order belongs to current tenant
        if (purchaseOrder.tenant.id != currentTenantId) {
            throw RuntimeException("Purchase order not found with id: $id")
        }

        val history = historyRepository.findByPurchaseOrderId(id)
        return purchaseOrderMapper.toHistorySummaryList(history)
    }

    // Private helper methods

    /**
     * Calculates totals for a purchase order.
     */
    private fun calculateTotals(purchaseOrder: PurchaseOrder): PurchaseOrder {
        // This will be calculated when line items are added
        return purchaseOrder.copy(
            totalAmount = BigDecimal.ZERO,
            grandTotal = BigDecimal.ZERO
        )
    }

    /**
     * Recalculates totals based on line items.
     */
    private fun recalculateTotals(purchaseOrder: PurchaseOrder, lineItems: List<PurchaseOrderLineItem>): PurchaseOrder {
        val totalAmount = lineItems.sumOf { it.totalPrice }
        val grandTotal = totalAmount + (purchaseOrder.taxAmount ?: BigDecimal.ZERO) - (purchaseOrder.discountAmount ?: BigDecimal.ZERO)

        return purchaseOrder.copy(
            totalAmount = totalAmount,
            grandTotal = grandTotal
        )
    }

    /**
     * Validates status transition.
     */
    private fun isValidStatusTransition(currentStatus: PurchaseOrderStatus, newStatus: PurchaseOrderStatus): Boolean {
        return when (currentStatus) {
            PurchaseOrderStatus.DRAFT -> newStatus in listOf(PurchaseOrderStatus.PENDING_APPROVAL, PurchaseOrderStatus.CANCELLED)
            PurchaseOrderStatus.PENDING_APPROVAL -> newStatus in listOf(PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.CANCELLED)
            PurchaseOrderStatus.APPROVED -> newStatus in listOf(PurchaseOrderStatus.DELIVERED, PurchaseOrderStatus.CANCELLED)
            PurchaseOrderStatus.DELIVERED -> newStatus == PurchaseOrderStatus.CLOSED
            PurchaseOrderStatus.CLOSED -> false // Cannot change from closed
            PurchaseOrderStatus.CANCELLED -> false // Cannot change from cancelled
        }
    }

    /**
     * Logs history entry for audit trail.
     */
    private fun logHistoryEntry(
        purchaseOrder: PurchaseOrder,
        action: String,
        description: String?
    ) {
        val history = PurchaseOrderHistory(
            purchaseOrder = purchaseOrder,
            previousStatus = null, // Will be set when status changes
            newStatus = purchaseOrder.status,
            action = action,
            description = description,
            performedBy = purchaseOrder.createdBy // Default to creator, can be overridden
        )
        historyRepository.save(history)
    }

    /**
     * Gets month name from month number.
     */
    private fun getMonthName(month: Int): String {
        return when (month) {
            1 -> "January"
            2 -> "February"
            3 -> "March"
            4 -> "April"
            5 -> "May"
            6 -> "June"
            7 -> "July"
            8 -> "August"
            9 -> "September"
            10 -> "October"
            11 -> "November"
            12 -> "December"
            else -> "Unknown"
        }
    }
}
