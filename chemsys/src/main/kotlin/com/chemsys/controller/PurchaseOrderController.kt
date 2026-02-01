package com.chemsys.controller

import com.chemsys.dto.*
import com.chemsys.service.PurchaseOrderService
import com.chemsys.entity.PurchaseOrderStatus
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Page
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.*
import jakarta.validation.Valid

/**
 * PurchaseOrderController provides REST API endpoints for purchase order management.
 * Handles CRUD operations, workflow management, search, filtering, and reporting.
 *
 * This controller follows RESTful API design principles and includes:
 * - Comprehensive input validation
 * - Proper HTTP status codes
 * - Role-based access control
 * - Tenant isolation
 * - Error handling and logging
 */
@RestController
@RequestMapping("/api/v1/purchase-orders")
@CrossOrigin(origins = ["*"])
class PurchaseOrderController(
    private val purchaseOrderService: PurchaseOrderService
) {

    companion object {
        private val logger = LoggerFactory.getLogger(PurchaseOrderController::class.java)
    }

    /**
     * Creates a new purchase order.
     *
     * @param request Purchase order creation request
     * @param createdBy User creating the purchase order
     * @return Created purchase order details
     */
    @PostMapping("/")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun createPurchaseOrder(
        @Valid @RequestBody request: CreatePurchaseOrderRequest,
        @RequestParam createdBy: String
    ): ResponseEntity<PurchaseOrderDto> {
        return try {
            val purchaseOrder = purchaseOrderService.createPurchaseOrder(request, createdBy)
            ResponseEntity.status(HttpStatus.CREATED).body(purchaseOrder)
        } catch (e: RuntimeException) {
            ResponseEntity.badRequest().build()
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Retrieves a purchase order by ID.
     *
     * @param id Purchase order ID
     * @return Purchase order details
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrderById(@PathVariable id: UUID): ResponseEntity<PurchaseOrderDto> {
        return try {
            val purchaseOrder = purchaseOrderService.getPurchaseOrderById(id)
            ResponseEntity.ok(purchaseOrder)
        } catch (e: RuntimeException) {
            ResponseEntity.notFound().build()
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Retrieves all purchase orders for the current tenant.
     *
     * @return List of purchase orders with summary information
     */
    @GetMapping("/")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getAllPurchaseOrders(): ResponseEntity<PurchaseOrderListResponse> {
        return try {
            val purchaseOrders = purchaseOrderService.getAllPurchaseOrders()
            ResponseEntity.ok(purchaseOrders)
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Retrieves purchase orders with pagination and filtering.
     *
     * @param page Page number (0-based)
     * @param size Page size
     * @param poNumber Filter by PO number
     * @param title Filter by title
     * @param supplierId Filter by supplier
     * @param status Filter by status
     * @param startDate Filter by start date
     * @param endDate Filter by end date
     * @return Paginated list of purchase orders
     */
    @GetMapping("/paginated")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrdersWithPagination(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) poNumber: String?,
        @RequestParam(required = false) title: String?,
        @RequestParam(required = false) supplierId: UUID?,
        @RequestParam(required = false) branchId: UUID?,
        @RequestParam(required = false) status: PurchaseOrderStatus?,
        @RequestParam(required = false) startDate: String?,
        @RequestParam(required = false) endDate: String?
    ): ResponseEntity<Page<PurchaseOrderDto>> {
        return try {
            // Parse dates if provided
            val parsedStartDate = startDate?.let { java.time.OffsetDateTime.parse(it) }
            val parsedEndDate = endDate?.let { java.time.OffsetDateTime.parse(it) }

            val purchaseOrders = purchaseOrderService.getPurchaseOrdersWithPagination(
                page = page,
                size = size,
                poNumber = poNumber,
                title = title,
                supplierId = supplierId,
                branchId = branchId,
                status = status,
                startDate = parsedStartDate,
                endDate = parsedEndDate
            )
            ResponseEntity.ok(purchaseOrders)
        } catch (e: Exception) {
            e.printStackTrace()
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Searches purchase orders by query.
     *
     * @param query Search query
     * @return Search results
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun searchPurchaseOrders(@RequestParam query: String): ResponseEntity<PurchaseOrderSearchResult> {
        return try {
            val results = purchaseOrderService.searchPurchaseOrders(query)
            ResponseEntity.ok(results)
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Retrieves purchase orders by status.
     *
     * @param status Purchase order status
     * @return List of purchase orders with the specified status
     */
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrdersByStatus(@PathVariable status: PurchaseOrderStatus): ResponseEntity<List<PurchaseOrderDto>> {
        return try {
            val purchaseOrders = purchaseOrderService.getPurchaseOrdersByStatus(status)
            ResponseEntity.ok(purchaseOrders)
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Retrieves purchase orders by supplier.
     *
     * @param supplierId Supplier ID
     * @return List of purchase orders for the specified supplier
     */
    @GetMapping("/supplier/{supplierId}")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrdersBySupplier(@PathVariable supplierId: UUID): ResponseEntity<List<PurchaseOrderDto>> {
        return try {
            val purchaseOrders = purchaseOrderService.getPurchaseOrdersBySupplier(supplierId)
            ResponseEntity.ok(purchaseOrders)
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Retrieves purchase orders by branch.
     *
     * @param branchId Branch ID
     * @return List of purchase orders for the specified branch
     */
    @GetMapping("/branch/{branchId}")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrdersByBranch(@PathVariable branchId: UUID): ResponseEntity<List<PurchaseOrderDto>> {
        return try {
            val purchaseOrders = purchaseOrderService.getPurchaseOrdersByBranch(branchId)
            ResponseEntity.ok(purchaseOrders)
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Retrieves overdue purchase orders.
     *
     * @return List of overdue purchase orders
     */
    @GetMapping("/overdue")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getOverduePurchaseOrders(): ResponseEntity<List<PurchaseOrderDto>> {
        return try {
            val purchaseOrders = purchaseOrderService.getOverduePurchaseOrders()
            ResponseEntity.ok(purchaseOrders)
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Retrieves purchase orders due for delivery.
     *
     * @param days Number of days to look ahead
     * @return List of purchase orders due for delivery
     */
    @GetMapping("/due-for-delivery")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrdersDueForDelivery(@RequestParam(defaultValue = "7") days: Int): ResponseEntity<List<PurchaseOrderDto>> {
        return try {
            val purchaseOrders = purchaseOrderService.getPurchaseOrdersDueForDelivery(days)
            ResponseEntity.ok(purchaseOrders)
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Updates an existing purchase order.
     *
     * @param id Purchase order ID
     * @param request Purchase order update request
     * @param updatedBy User updating the purchase order
     * @return Updated purchase order details
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun updatePurchaseOrder(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdatePurchaseOrderRequest,
        @RequestParam updatedBy: String
    ): ResponseEntity<PurchaseOrderDto> {
        return try {
            val purchaseOrder = purchaseOrderService.updatePurchaseOrder(id, request, updatedBy)
            ResponseEntity.ok(purchaseOrder)
        } catch (e: RuntimeException) {
            ResponseEntity.badRequest().build()
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Changes purchase order status.
     *
     * @param id Purchase order ID
     * @param request Status change request
     * @param performedBy User performing the status change
     * @return Updated purchase order details
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun changePurchaseOrderStatus(
        @PathVariable id: UUID,
        @Valid @RequestBody request: ChangePurchaseOrderStatusRequest,
        @RequestParam performedBy: String
    ): ResponseEntity<PurchaseOrderDto> {
        return try {
            val purchaseOrder = purchaseOrderService.changePurchaseOrderStatus(id, request, performedBy)
            ResponseEntity.ok(purchaseOrder)
        } catch (e: RuntimeException) {
            ResponseEntity.badRequest().build()
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Approves a purchase order.
     *
     * @param id Purchase order ID
     * @param request Approval request
     * @return Approved purchase order details
     */
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun approvePurchaseOrder(
        @PathVariable id: UUID,
        @Valid @RequestBody request: ApprovePurchaseOrderRequest
    ): ResponseEntity<PurchaseOrderDto> {
        return try {
            val purchaseOrder = purchaseOrderService.approvePurchaseOrder(id, request)
            ResponseEntity.ok(purchaseOrder)
        } catch (e: RuntimeException) {
            logger.error("Error approving PO: ${e.message}", e)
            //return the error return
            ResponseEntity.badRequest().build()
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Receives goods against a purchase order.
     *
     * @param id Purchase order ID
     * @param request Goods receiving request
     * @param receivedBy User receiving the goods
     * @return Updated purchase order details
     */
    @PostMapping("/{id}/receive-goods")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun receiveGoods(
        @PathVariable id: UUID,
        @Valid @RequestBody request: ReceiveGoodsRequest,
        @RequestParam receivedBy: String
    ): ResponseEntity<PurchaseOrderDto> {
        return try {
            val purchaseOrder = purchaseOrderService.receiveGoods(id, request, receivedBy)
            ResponseEntity.ok(purchaseOrder)
        } catch (e: RuntimeException) {
            ResponseEntity.badRequest().build()
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Deletes a purchase order.
     *
     * @param id Purchase order ID
     * @return No content response
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun deletePurchaseOrder(@PathVariable id: UUID): ResponseEntity<Void> {
        return try {
            purchaseOrderService.deletePurchaseOrder(id)
            ResponseEntity.noContent().build()
        } catch (e: RuntimeException) {
            ResponseEntity.badRequest().build()
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Retrieves purchase order summary statistics.
     *
     * @return Purchase order summary information
     */
    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrderSummary(): ResponseEntity<PurchaseOrderSummaryDto> {
        return try {
            val summary = purchaseOrderService.getPurchaseOrderSummary()
            ResponseEntity.ok(summary)
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Retrieves purchase order history/audit trail.
     *
     * @param id Purchase order ID
     * @return List of history entries
     */
    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrderHistory(@PathVariable id: UUID): ResponseEntity<List<Map<String, Any?>>> {
        return try {
            val history = purchaseOrderService.getPurchaseOrderHistory(id)
            ResponseEntity.ok(history)
        } catch (e: RuntimeException) {
            ResponseEntity.notFound().build()
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Retrieves available purchase order statuses.
     *
     * @return List of available statuses
     */
    @GetMapping("/statuses")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun getPurchaseOrderStatuses(): ResponseEntity<List<PurchaseOrderStatus>> {
        return try {
            val statuses = PurchaseOrderStatus.values().toList()
            ResponseEntity.ok(statuses)
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Submits a purchase order for approval.
     *
     * @param id Purchase order ID
     * @param submittedBy User submitting the purchase order
     * @return Updated purchase order details
     */
    @PostMapping("/{id}/submit-for-approval")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun submitForApproval(
        @PathVariable id: UUID,
        @RequestParam submittedBy: String
    ): ResponseEntity<PurchaseOrderDto> {
        return try {
            val request = ChangePurchaseOrderStatusRequest(
                newStatus = PurchaseOrderStatus.PENDING_APPROVAL,
                notes = "Submitted for approval by $submittedBy"
            )
            val purchaseOrder = purchaseOrderService.changePurchaseOrderStatus(id, request, submittedBy)
            ResponseEntity.ok(purchaseOrder)
        } catch (e: RuntimeException) {
            ResponseEntity.badRequest().build()
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Marks a purchase order as delivered.
     *
     * @param id Purchase order ID
     * @param markedBy User marking the purchase order as delivered
     * @return Updated purchase order details
     */
    @PostMapping("/{id}/mark-delivered")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','USER')")
    fun markAsDelivered(
        @PathVariable id: UUID,
        @RequestParam markedBy: String
    ): ResponseEntity<PurchaseOrderDto> {
        return try {
            val request = ChangePurchaseOrderStatusRequest(
                newStatus = PurchaseOrderStatus.DELIVERED,
                notes = "Marked as delivered by $markedBy"
            )
            val purchaseOrder = purchaseOrderService.changePurchaseOrderStatus(id, request, markedBy)
            ResponseEntity.ok(purchaseOrder)
        } catch (e: RuntimeException) {
            ResponseEntity.badRequest().build()
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Closes a purchase order.
     *
     * @param id Purchase order ID
     * @param closedBy User closing the purchase order
     * @return Updated purchase order details
     */
    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun closePurchaseOrder(
        @PathVariable id: UUID,
        @RequestParam closedBy: String
    ): ResponseEntity<PurchaseOrderDto> {
        return try {
            val request = ChangePurchaseOrderStatusRequest(
                newStatus = PurchaseOrderStatus.CLOSED,
                notes = "Closed by $closedBy"
            )
            val purchaseOrder = purchaseOrderService.changePurchaseOrderStatus(id, request, closedBy)
            ResponseEntity.ok(purchaseOrder)
        } catch (e: RuntimeException) {
            ResponseEntity.badRequest().build()
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }

    /**
     * Cancels a purchase order.
     *
     * @param id Purchase order ID
     * @param cancelledBy User cancelling the purchase order
     * @param reason Reason for cancellation
     * @return Updated purchase order details
     */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    fun cancelPurchaseOrder(
        @PathVariable id: UUID,
        @RequestParam cancelledBy: String,
        @RequestParam reason: String
    ): ResponseEntity<PurchaseOrderDto> {
        return try {
            val request = ChangePurchaseOrderStatusRequest(
                newStatus = PurchaseOrderStatus.CANCELLED,
                notes = "Cancelled by $cancelledBy. Reason: $reason"
            )
            val purchaseOrder = purchaseOrderService.changePurchaseOrderStatus(id, request, cancelledBy)
            ResponseEntity.ok(purchaseOrder)
        } catch (e: RuntimeException) {
            ResponseEntity.badRequest().build()
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build()
        }
    }
}
