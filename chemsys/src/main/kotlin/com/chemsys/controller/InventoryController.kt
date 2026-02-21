package com.chemsys.controller

import com.chemsys.dto.*
import com.chemsys.service.InventoryService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

/**
 * REST controller for inventory management operations.
 * Provides endpoints for stock operations, transfers, adjustments, and alerts.
 */
@RestController
@RequestMapping("/api/inventory")
class InventoryController(
    private val inventoryService: InventoryService
) {

    /**
     * Creates new inventory for a product at a specific branch.
     * 
     * @param request Inventory creation request
     * @return Created inventory details
     */
    @PostMapping
    fun createInventory(@RequestBody request: CreateInventoryRequest): ResponseEntity<InventoryDto> {
        val inventory = inventoryService.createInventory(request)
        return ResponseEntity.ok(inventory)
    }

    /**
     * Retrieves inventory for the current tenant, optionally filtered by branch.
     * 
     * @param branchId Optional branch ID to filter by (null = all branches)
     * @return List of inventory items with summary information
     */
    @GetMapping
    fun getAllInventory(
        @RequestParam(required = false) branchId: UUID?
    ): ResponseEntity<InventoryListResponse> {
        val inventory = inventoryService.getAllInventory(branchId)
        return ResponseEntity.ok(inventory)
    }

    /**
     * Retrieves inventory for a specific branch.
     * 
     * @param branchId Branch ID
     * @return List of inventory items for the branch
     */
    @GetMapping("/branch/{branchId}")
    fun getInventoryByBranch(@PathVariable branchId: UUID): ResponseEntity<List<InventoryDto>> {
        val inventory = inventoryService.getInventoryByBranch(branchId)
        return ResponseEntity.ok(inventory)
    }

    /**
     * Updates existing inventory.
     * 
     * @param id Inventory ID
     * @param request Inventory update request
     * @return Updated inventory details
     */
    @PutMapping("/{id}")
    fun updateInventory(
        @PathVariable id: UUID,
        @RequestBody request: UpdateInventoryRequest
    ): ResponseEntity<InventoryDto> {
        val inventory = inventoryService.updateInventory(id, request)
        return ResponseEntity.ok(inventory)
    }

    /**
     * Deletes inventory (soft delete).
     *
     * @param id Inventory ID
     */
    @DeleteMapping("/{id}")
    fun deleteInventory(@PathVariable id: UUID): ResponseEntity<Void> {
        inventoryService.deleteInventory(id)
        return ResponseEntity.noContent().build()
    }

    /**
     * Adjusts inventory quantity (adds or removes stock).
     * 
     * @param request Inventory adjustment request
     * @return Updated inventory details
     */
    @PostMapping("/adjust")
    fun adjustInventory(@RequestBody request: InventoryAdjustmentRequest): ResponseEntity<InventoryDto> {
        val inventory = inventoryService.adjustInventory(request)
        return ResponseEntity.ok(inventory)
    }

    /**
     * Transfers inventory between branches.
     * 
     * @param request Inventory transfer request
     * @return Destination inventory details
     */
    @PostMapping("/transfer")
    fun transferInventory(@RequestBody request: InventoryTransferRequest): ResponseEntity<InventoryDto> {
        val inventory = inventoryService.transferInventory(request)
        return ResponseEntity.ok(inventory)
    }

    /**
     * Retrieves low stock inventory items.
     * 
     * @return List of low stock inventory items
     */
    @GetMapping("/low-stock")
    fun getLowStockInventory(): ResponseEntity<List<InventoryDto>> {
        val inventory = inventoryService.getLowStockInventory()
        return ResponseEntity.ok(inventory)
    }

    /**
     * Retrieves expiring inventory items.
     * 
     * @param days Number of days (default: 30)
     * @return List of expiring inventory items
     */
    @GetMapping("/expiring")
    fun getExpiringInventory(@RequestParam(defaultValue = "30") days: Int): ResponseEntity<List<InventoryDto>> {
        val inventory = inventoryService.getExpiringInventory(days)
        return ResponseEntity.ok(inventory)
    }

    /**
     * Generates inventory alerts for the current tenant.
     * 
     * @return List of inventory alerts
     */
    @GetMapping("/alerts")
    fun getInventoryAlerts(): ResponseEntity<List<InventoryAlertDto>> {
        val alerts = inventoryService.getInventoryAlerts()
        return ResponseEntity.ok(alerts)
    }

    /**
     * Retrieves inventory by product ID across all branches.
     * 
     * @param productId Product ID
     * @return List of inventory items for the product
     */
    @GetMapping("/product/{productId}")
    fun getInventoryByProduct(@PathVariable productId: UUID): ResponseEntity<List<InventoryDto>> {
        // TODO: Implement product-specific inventory lookup
        return ResponseEntity.notFound().build()
    }

    /**
     * Retrieves inventory by batch number.
     * 
     * @param batchNumber Batch number
     * @return List of inventory items with the batch number
     */
    @GetMapping("/batch/{batchNumber}")
    fun getInventoryByBatch(@PathVariable batchNumber: String): ResponseEntity<List<InventoryDto>> {
        // TODO: Implement batch number lookup
        return ResponseEntity.notFound().build()
    }

    /**
     * Retrieves inventory statistics for the current tenant.
     * 
     * @return Inventory statistics
     */
    @GetMapping("/stats")
    fun getInventoryStats(): ResponseEntity<Map<String, Any>> {
        val allInventory = inventoryService.getAllInventory()
        
        val stats = mapOf(
            "totalItems" to allInventory.totalCount,
            "totalValue" to allInventory.totalValue,
            "lowStockCount" to allInventory.lowStockCount,
            "expiringCount" to allInventory.expiringCount
        )
        
        return ResponseEntity.ok(stats)
    }

    /**
     * Retrieves inventory statistics for a specific branch.
     * 
     * @param branchId Branch ID
     * @return Branch-specific inventory statistics
     */
    @GetMapping("/stats/branch/{branchId}")
    fun getBranchInventoryStats(@PathVariable branchId: UUID): ResponseEntity<Map<String, Any>> {
        val branchInventory = inventoryService.getInventoryByBranch(branchId)
        
        val totalValue = branchInventory.sumOf { 
            (it.unitCost ?: java.math.BigDecimal.ZERO) * java.math.BigDecimal(it.quantity) 
        }
        val lowStockCount = branchInventory.count { it.lowStockAlert }
        val expiringCount = branchInventory.count { it.expiringAlert }
        
        val stats = mapOf(
            "totalItems" to branchInventory.size,
            "totalValue" to totalValue,
            "lowStockCount" to lowStockCount,
            "expiringCount" to expiringCount
        )
        
        return ResponseEntity.ok(stats)
    }

    /**
     * Retrieves inventory transfer history for admin review.
     * Shows all transfers with details about who performed them.
     * 
     * @param branchId Optional branch ID to filter transfers
     * @param startDate Optional start date for filtering
     * @param endDate Optional end date for filtering
     * @param performedBy Optional user ID to filter by performer
     * @return List of transfer history records
     */
    @GetMapping("/transfers/history")
    fun getTransferHistory(
        @RequestParam(required = false) branchId: UUID?,
        @RequestParam(required = false) startDate: java.time.OffsetDateTime?,
        @RequestParam(required = false) endDate: java.time.OffsetDateTime?,
        @RequestParam(required = false) performedBy: UUID?
    ): ResponseEntity<InventoryTransferHistoryResponse> {
        val history = inventoryService.getTransferHistory(branchId, startDate, endDate, performedBy)
        return ResponseEntity.ok(history)
    }
}
