package com.chemsys.service

import com.chemsys.dto.*
import com.chemsys.entity.*
import com.chemsys.repository.*
import com.chemsys.config.TenantContext
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.*

/**
 * InventoryService handles all business logic for inventory management.
 * Provides stock operations, transfers, adjustments, and alert generation.
 */
@Service
class InventoryService(
    private val inventoryRepository: InventoryRepository,
    private val productRepository: ProductRepository,
    private val branchRepository: BranchRepository,
    private val userRepository: UserRepository,
    private val inventoryTransactionRepository: InventoryTransactionRepository
) {

    /**
     * Creates new inventory for a product at a specific branch.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER')")
    @Transactional
    fun createInventory(request: CreateInventoryRequest): InventoryDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        // Verify product belongs to current tenant
        val product = productRepository.findById(request.productId)
            .orElseThrow { RuntimeException("Product not found with id: ${request.productId}") }
        
        if (product.tenant.id != currentTenantId) {
            throw RuntimeException("Product not found with id: ${request.productId}")
        }

        // Verify branch belongs to current tenant
        val branch = branchRepository.findByIdAndTenantId(request.branchId, currentTenantId)
            .orElseThrow { RuntimeException("Branch not found with id: ${request.branchId}") }

        val inventory = Inventory(
            product = product,
            branch = branch,
            batchNumber = request.batchNumber,
            expiryDate = request.expiryDate,
            manufacturingDate = request.manufacturingDate,
            quantity = request.quantity,
            unitCost = request.unitCost,
            sellingPrice = request.sellingPrice,
            locationInBranch = request.locationInBranch,
            lastRestocked = java.time.OffsetDateTime.now()
        )

        val savedInventory = inventoryRepository.save(inventory)

        // Create transaction record
        createTransaction(
            product = product,
            branch = branch,
            transactionType = TransactionType.INITIAL_STOCK,
            quantity = request.quantity,
            unitCost = request.unitCost,
            batchNumber = request.batchNumber,
            expiryDate = request.expiryDate,
            notes = "Initial stock creation"
        )

        return mapToDto(savedInventory, product, branch)
    }

    /**
     * Updates existing inventory.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER')")
    @Transactional
    fun updateInventory(id: UUID, request: UpdateInventoryRequest): InventoryDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val inventory = inventoryRepository.findById(id)
            .orElseThrow { RuntimeException("Inventory not found with id: $id") }

        // Verify inventory belongs to current tenant
        if (inventory.product.tenant.id != currentTenantId) {
            throw RuntimeException("Inventory not found with id: $id")
        }

        val updatedInventory = inventory.copy(
            quantity = request.quantity ?: inventory.quantity,
            unitCost = request.unitCost ?: inventory.unitCost,
            sellingPrice = request.sellingPrice ?: inventory.sellingPrice,
            locationInBranch = request.locationInBranch ?: inventory.locationInBranch,
            isActive = request.isActive ?: inventory.isActive,
            updatedAt = java.time.OffsetDateTime.now()
        )

        val savedInventory = inventoryRepository.save(updatedInventory)
        return mapToDto(savedInventory, savedInventory.product, savedInventory.branch)
    }

    /**
     * Adjusts inventory quantity (adds or removes stock).
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER')")
    @Transactional
    fun adjustInventory(request: InventoryAdjustmentRequest): InventoryDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        // Verify product belongs to current tenant
        val product = productRepository.findById(request.productId)
            .orElseThrow { RuntimeException("Product not found with id: ${request.productId}") }
        
        if (product.tenant.id != currentTenantId) {
            throw RuntimeException("Product not found with id: ${request.productId}")
        }

        // Verify branch belongs to current tenant
        val branch = branchRepository.findByIdAndTenantId(request.branchId, currentTenantId)
            .orElseThrow { RuntimeException("Branch not found with id: ${request.branchId}") }

        // Find existing inventory for this product and branch
        val existingInventory = inventoryRepository.findByProductIdAndBranchId(request.productId, request.branchId)
            .firstOrNull()

        if (existingInventory == null) {
            throw RuntimeException("No inventory found for product ${request.productId} at branch ${request.branchId}")
        }

        // Calculate new quantity
        val newQuantity = existingInventory.quantity + request.quantity
        if (newQuantity < 0) {
            throw RuntimeException("Cannot reduce inventory below 0. Current quantity: ${existingInventory.quantity}, Adjustment: ${request.quantity}")
        }

        val updatedInventory = existingInventory.copy(
            quantity = newQuantity,
            updatedAt = java.time.OffsetDateTime.now()
        )

        val savedInventory = inventoryRepository.save(updatedInventory)

        // Create transaction record
        val transactionType = if (request.quantity > 0) TransactionType.ADJUSTMENT else TransactionType.ADJUSTMENT
        createTransaction(
            product = product,
            branch = branch,
            transactionType = transactionType,
            quantity = request.quantity,
            unitCost = existingInventory.unitCost,
            batchNumber = request.batchNumber,
            expiryDate = request.expiryDate,
            notes = request.notes ?: "Stock adjustment: ${request.reason}"
        )

        return mapToDto(savedInventory, product, branch)
    }

    /**
     * Transfers inventory between branches.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER')")
    @Transactional
    fun transferInventory(request: InventoryTransferRequest): InventoryDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        // Verify product belongs to current tenant
        val product = productRepository.findById(request.productId)
            .orElseThrow { RuntimeException("Product not found with id: ${request.productId}") }
        
        if (product.tenant.id != currentTenantId) {
            throw RuntimeException("Product not found with id: ${request.productId}")
        }

        // Verify both branches belong to current tenant
        val fromBranch = branchRepository.findByIdAndTenantId(request.fromBranchId, currentTenantId)
            .orElseThrow { RuntimeException("Source branch not found with id: ${request.fromBranchId}") }
        
        val toBranch = branchRepository.findByIdAndTenantId(request.toBranchId, currentTenantId)
            .orElseThrow { RuntimeException("Destination branch not found with id: ${request.toBranchId}") }

        // Find source inventory
        val sourceInventory = inventoryRepository.findByProductIdAndBranchId(request.productId, request.fromBranchId)
            .firstOrNull() ?: throw RuntimeException("No inventory found for product ${request.productId} at source branch ${request.fromBranchId}")

        if (sourceInventory.quantity < request.quantity) {
            throw RuntimeException("Insufficient stock for transfer. Available: ${sourceInventory.quantity}, Requested: ${request.quantity}")
        }

        // Reduce source inventory
        val updatedSourceInventory = sourceInventory.copy(
            quantity = sourceInventory.quantity - request.quantity,
            updatedAt = java.time.OffsetDateTime.now()
        )
        inventoryRepository.save(updatedSourceInventory)

        // Find or create destination inventory
        val destinationInventory = inventoryRepository.findByProductIdAndBranchId(request.productId, request.toBranchId)
            .firstOrNull()

        val finalDestinationInventory = if (destinationInventory != null) {
            // Update existing inventory
            destinationInventory.copy(
                quantity = destinationInventory.quantity + request.quantity,
                updatedAt = java.time.OffsetDateTime.now()
            )
        } else {
            // Create new inventory record
            Inventory(
                product = product,
                branch = toBranch,
                batchNumber = request.batchNumber,
                expiryDate = sourceInventory.expiryDate,
                manufacturingDate = sourceInventory.manufacturingDate,
                quantity = request.quantity,
                unitCost = sourceInventory.unitCost,
                sellingPrice = sourceInventory.sellingPrice,
                locationInBranch = request.notes,
                lastRestocked = java.time.OffsetDateTime.now()
            )
        }

        val savedDestinationInventory = inventoryRepository.save(finalDestinationInventory)

        // Create transaction records
        createTransaction(
            product = product,
            branch = fromBranch,
            transactionType = TransactionType.TRANSFER_OUT,
            quantity = -request.quantity,
            unitCost = sourceInventory.unitCost,
            batchNumber = request.batchNumber,
            expiryDate = sourceInventory.expiryDate,
            notes = "Transfer to branch: ${toBranch.name}"
        )

        createTransaction(
            product = product,
            branch = toBranch,
            transactionType = TransactionType.TRANSFER_IN,
            quantity = request.quantity,
            unitCost = sourceInventory.unitCost,
            batchNumber = request.batchNumber,
            expiryDate = sourceInventory.expiryDate,
            notes = "Transfer from branch: ${fromBranch.name}"
        )

        return mapToDto(savedDestinationInventory, product, toBranch)
    }

    /**
     * Retrieves inventory for the current tenant, respecting branch context.
     * - ADMIN users can see all branches or filter by specific branch
     * - MANAGER/CASHIER users see only their current branch
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER','CASHIER')")
    fun getAllInventory(branchId: UUID? = null): InventoryListResponse {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val allInventory = if (branchId != null) {
            // Specific branch requested (for ADMIN users or explicit filtering)
            inventoryRepository.findByBranchId(branchId)
                .filter { it.product.tenant.id == currentTenantId }
        } else {
            // No specific branch - get all inventory for tenant
            inventoryRepository.findByTenantId(currentTenantId)
        }

        val inventoryDtos = allInventory.map { inventory ->
            mapToDto(inventory, inventory.product, inventory.branch)
        }

        val totalValue = inventoryDtos.sumOf { 
            (it.unitCost ?: BigDecimal.ZERO) * BigDecimal(it.quantity) 
        }
        val lowStockCount = inventoryDtos.count { it.lowStockAlert }
        val expiringCount = inventoryDtos.count { it.expiringAlert }

        return InventoryListResponse(
            inventory = inventoryDtos,
            totalCount = inventoryDtos.size.toLong(),
            totalValue = totalValue,
            lowStockCount = lowStockCount.toLong(),
            expiringCount = expiringCount.toLong()
        )
    }

    /**
     * Retrieves inventory for the current user's branch context.
     * This method automatically determines the user's current branch.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER','CASHIER')")
    fun getCurrentBranchInventory(): InventoryListResponse {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        // TODO: Get current branch from user's branch context
        // For now, this will return all inventory for the tenant
        // In the future, this should integrate with UserBranchPreferenceService
        
        return getAllInventory()
    }

    /**
     * Retrieves inventory for a specific branch.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER','CASHIER')")
    fun getInventoryByBranch(branchId: UUID): List<InventoryDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        // Verify branch belongs to current tenant
        val branch = branchRepository.findByIdAndTenantId(branchId, currentTenantId)
            .orElseThrow { RuntimeException("Branch not found with id: $branchId") }

        val inventory = inventoryRepository.findByBranchId(branchId)
        return inventory.map { mapToDto(it, it.product, it.branch) }
    }

    /**
     * Retrieves low stock inventory items, respecting branch context.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER')")
    fun getLowStockInventory(branchId: UUID? = null): List<InventoryDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val lowStockItems = if (branchId != null) {
            // Specific branch requested
            inventoryRepository.findItemsNeedingRestockByBranchId(branchId)
                .filter { it.product.tenant.id == currentTenantId }
        } else {
            // All branches for tenant
            inventoryRepository.findItemsNeedingRestockByTenantId(currentTenantId)
        }
        
        return lowStockItems.map { mapToDto(it, it.product, it.branch) }
    }

    /**
     * Retrieves expiring inventory items, respecting branch context.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER')")
    fun getExpiringInventory(days: Int = 30, branchId: UUID? = null): List<InventoryDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val expiryDate = LocalDate.now().plusDays(days.toLong())
        val expiringItems = if (branchId != null) {
            // Specific branch requested
            inventoryRepository.findExpiringItemsByBranchId(branchId, expiryDate)
                .filter { it.product.tenant.id == currentTenantId }
        } else {
            // All branches for tenant
            inventoryRepository.findExpiringItemsByTenantId(currentTenantId, expiryDate)
        }
        
        return expiringItems.map { mapToDto(it, it.product, it.branch) }
    }

    /**
     * Generates inventory alerts for the current tenant, respecting branch context.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER')")
    fun getInventoryAlerts(branchId: UUID? = null): List<InventoryAlertDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val alerts = mutableListOf<InventoryAlertDto>()

        // Low stock alerts
        val lowStockItems = if (branchId != null) {
            inventoryRepository.findItemsNeedingRestockByBranchId(branchId)
                .filter { it.product.tenant.id == currentTenantId }
        } else {
            inventoryRepository.findItemsNeedingRestockByTenantId(currentTenantId)
        }
        
        lowStockItems.forEach { inventory ->
            val severity = when {
                inventory.quantity == 0 -> AlertSeverity.CRITICAL
                inventory.quantity <= inventory.product.minStockLevel / 2 -> AlertSeverity.HIGH
                else -> AlertSeverity.MEDIUM
            }

            alerts.add(
                InventoryAlertDto(
                    type = AlertType.LOW_STOCK,
                    productId = inventory.product.id!!,
                    productName = inventory.product.name,
                    branchId = inventory.branch.id!!,
                    branchName = inventory.branch.name,
                    currentQuantity = inventory.quantity,
                    threshold = inventory.product.minStockLevel,
                    expiryDate = inventory.expiryDate,
                    daysUntilExpiry = inventory.expiryDate?.let { ChronoUnit.DAYS.between(LocalDate.now(), it) },
                    severity = severity
                )
            )
        }

        // Expiring alerts
        val expiringItems = if (branchId != null) {
            inventoryRepository.findExpiringItemsByBranchId(branchId, LocalDate.now().plusDays(30))
                .filter { it.product.tenant.id == currentTenantId }
        } else {
            inventoryRepository.findExpiringItemsByTenantId(currentTenantId, LocalDate.now().plusDays(30))
        }
        
        expiringItems.forEach { inventory ->
            val daysUntilExpiry = inventory.expiryDate?.let { ChronoUnit.DAYS.between(LocalDate.now(), it) }
            val severity = when {
                daysUntilExpiry != null && daysUntilExpiry <= 7 -> AlertSeverity.CRITICAL
                daysUntilExpiry != null && daysUntilExpiry <= 14 -> AlertSeverity.HIGH
                daysUntilExpiry != null && daysUntilExpiry <= 30 -> AlertSeverity.MEDIUM
                else -> AlertSeverity.LOW
            }

            alerts.add(
                InventoryAlertDto(
                    type = AlertType.EXPIRING_SOON,
                    productId = inventory.product.id!!,
                    productName = inventory.product.name,
                    branchId = inventory.branch.id!!,
                    branchName = inventory.branch.name,
                    currentQuantity = inventory.quantity,
                    threshold = null,
                    expiryDate = inventory.expiryDate,
                    daysUntilExpiry = daysUntilExpiry,
                    severity = severity
                )
            )
        }

        return alerts.sortedBy { it.severity.ordinal }
    }

    /**
     * Creates an inventory transaction record.
     */
    private fun createTransaction(
        product: Product,
        branch: Branch,
        transactionType: TransactionType,
        quantity: Int,
        unitCost: BigDecimal?,
        batchNumber: String?,
        expiryDate: LocalDate?,
        notes: String?
    ) {
        val currentUserId = TenantContext.getCurrentTenant() // Using tenant context for now
        val user = null // TODO: Implement user context

        val transaction = InventoryTransaction(
            product = product,
            branch = branch,
            transactionType = transactionType,
            quantity = quantity,
            unitCost = unitCost,
            totalCost = unitCost?.multiply(BigDecimal(quantity)),
            batchNumber = batchNumber,
            expiryDate = expiryDate,
            referenceNumber = null, // TODO: Generate reference number
            notes = notes,
            performedBy = user,
        )

        inventoryTransactionRepository.save(transaction)
    }

    /**
     * Maps Inventory entity to InventoryDto.
     */
    private fun mapToDto(inventory: Inventory, product: Product, branch: Branch): InventoryDto {
        val daysUntilExpiry = inventory.expiryDate?.let { 
            ChronoUnit.DAYS.between(LocalDate.now(), it) 
        }
        val lowStockAlert = inventory.quantity <= product.minStockLevel
        val expiringAlert = daysUntilExpiry != null && daysUntilExpiry <= 30

        return InventoryDto(
            id = inventory.id!!,
            productId = product.id!!,
            productName = product.name,
            productGenericName = product.genericName,
            branchId = branch.id!!,
            branchName = branch.name,
            batchNumber = inventory.batchNumber,
            expiryDate = inventory.expiryDate,
            manufacturingDate = inventory.manufacturingDate,
            quantity = inventory.quantity,
            unitCost = inventory.unitCost,
            sellingPrice = inventory.sellingPrice,
            locationInBranch = inventory.locationInBranch,
            isActive = inventory.isActive,
            lastRestocked = inventory.lastRestocked,
            daysUntilExpiry = daysUntilExpiry,
            lowStockAlert = lowStockAlert,
            expiringAlert = expiringAlert,
            createdAt = inventory.createdAt,
            updatedAt = inventory.updatedAt
        )
    }

    /**
     * Updates inventory stock levels when goods are received from purchase orders.
     * This method is called automatically when a GRN (Goods Received Note) is processed.
     *
     * @param productId Product ID
     * @param branchId Branch ID where goods are received
     * @param quantity Quantity received
     * @param unitCost Unit cost from purchase order
     * @param batchNumber Optional batch number
     * @param expiryDate Optional expiry date
     * @param purchaseOrderId Purchase order ID for audit trail
     * @param receivedBy User who received the goods
     * @return Updated inventory DTO
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER','USER')")
    @Transactional
    fun updateStockFromPurchaseOrder(
        productId: UUID,
        branchId: UUID,
        quantity: Int,
        unitCost: BigDecimal,
        batchNumber: String? = null,
        expiryDate: LocalDate? = null,
        purchaseOrderId: UUID,
        receivedBy: String
    ): InventoryDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        // Verify product belongs to current tenant
        val product = productRepository.findById(productId)
            .orElseThrow { RuntimeException("Product not found with id: $productId") }
        
        if (product.tenant.id != currentTenantId) {
            throw RuntimeException("Product not found with id: $productId")
        }

        // Verify branch belongs to current tenant
        val branch = branchRepository.findByIdAndTenantId(branchId, currentTenantId)
            .orElseThrow { RuntimeException("Branch not found with id: $branchId") }

        // Find existing inventory for this product and branch
        val existingInventory = inventoryRepository.findByProductIdAndBranchId(productId, branchId)
            .firstOrNull()

        val finalInventory = if (existingInventory != null) {
            // Update existing inventory - add received quantity
            val updatedInventory = existingInventory.copy(
                quantity = existingInventory.quantity + quantity,
                // Update unit cost to weighted average if different
                unitCost = if (existingInventory.unitCost != unitCost) {
                    val existingUnitCost = existingInventory.unitCost ?: BigDecimal.ZERO
                    val totalValue = (BigDecimal(existingInventory.quantity) * existingUnitCost) + (BigDecimal(quantity) * unitCost)
                    val totalQuantity = existingInventory.quantity + quantity
                    totalValue.divide(BigDecimal(totalQuantity), 2, java.math.RoundingMode.HALF_UP)
                } else {
                    existingInventory.unitCost
                },
                lastRestocked = java.time.OffsetDateTime.now(),
                updatedAt = java.time.OffsetDateTime.now()
            )
            inventoryRepository.save(updatedInventory)
        } else {
            // Create new inventory record
            val newInventory = Inventory(
                product = product,
                branch = branch,
                batchNumber = batchNumber,
                expiryDate = expiryDate,
                manufacturingDate = null, // Will be set if provided
                quantity = quantity,
                unitCost = unitCost,
                sellingPrice = unitCost, // Default selling price to unit cost
                locationInBranch = "Received from PO: $purchaseOrderId",
                lastRestocked = java.time.OffsetDateTime.now()
            )
            inventoryRepository.save(newInventory)
        }

        // Create transaction record for audit trail
        createTransaction(
            product = product,
            branch = branch,
            transactionType = TransactionType.PURCHASE,
            quantity = quantity,
            unitCost = unitCost,
            batchNumber = batchNumber,
            expiryDate = expiryDate,
            notes = "Stock received from Purchase Order: $purchaseOrderId by $receivedBy"
        )

        return mapToDto(finalInventory, product, branch)
    }
}
