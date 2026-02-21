package com.chemsys.service

import com.chemsys.dto.*
import com.chemsys.entity.*
import com.chemsys.repository.*
import com.chemsys.config.TenantContext
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate
import java.time.OffsetDateTime
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
    private val userBranchRepository: UserBranchRepository,
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
            unitCost = request.unitCost ?: product.unitCost,
            sellingPrice = request.sellingPrice ?: product.sellingPrice,
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
            unitCost = request.unitCost ?: inventory.unitCost ?: inventory.product.unitCost,
            sellingPrice = request.sellingPrice ?: inventory.sellingPrice ?: inventory.product.sellingPrice,
            locationInBranch = request.locationInBranch ?: inventory.locationInBranch,
            isActive = request.isActive ?: inventory.isActive,
            updatedAt = java.time.OffsetDateTime.now()
        )

        val savedInventory = inventoryRepository.save(updatedInventory)
        return mapToDto(savedInventory, savedInventory.product, savedInventory.branch)
    }

    /**
     * Deletes inventory (soft delete by setting isActive to false).
     * The record is preserved for audit but excluded from active inventory lists.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER')")
    @Transactional
    fun deleteInventory(id: UUID): Unit {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val inventory = inventoryRepository.findById(id)
            .orElseThrow { RuntimeException("Inventory not found with id: $id") }

        if (inventory.product.tenant.id != currentTenantId) {
            throw RuntimeException("Inventory not found with id: $id")
        }

        val deactivated = inventory.copy(
            isActive = false,
            updatedAt = java.time.OffsetDateTime.now()
        )
        inventoryRepository.save(deactivated)
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
     * CASHIER role is allowed to transfer items, but all transfers are logged for admin review.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER','CASHIER')")
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

        // Generate a unique transfer reference number to link TRANSFER_OUT and TRANSFER_IN
        val transferReference = "TRF-${System.currentTimeMillis()}-${UUID.randomUUID().toString().substring(0, 8).uppercase()}"

        // Create transaction records with linked reference number
        createTransaction(
            product = product,
            branch = fromBranch,
            transactionType = TransactionType.TRANSFER_OUT,
            quantity = -request.quantity,
            unitCost = sourceInventory.unitCost,
            batchNumber = request.batchNumber,
            expiryDate = sourceInventory.expiryDate,
            notes = "Transfer to branch: ${toBranch.name}${if (request.notes != null) " - ${request.notes}" else ""}",
            referenceNumber = transferReference
        )

        createTransaction(
            product = product,
            branch = toBranch,
            transactionType = TransactionType.TRANSFER_IN,
            quantity = request.quantity,
            unitCost = sourceInventory.unitCost,
            batchNumber = request.batchNumber,
            expiryDate = sourceInventory.expiryDate,
            notes = "Transfer from branch: ${fromBranch.name}${if (request.notes != null) " - ${request.notes}" else ""}",
            referenceNumber = transferReference
        )

        return mapToDto(savedDestinationInventory, product, toBranch)
    }

    /**
     * Retrieves inventory for the current tenant.
     * - All users (ADMIN, MANAGER, CASHIER) can view inventory across all branches.
     * - branchId = null returns all tenant inventory; branchId set returns that branch's inventory.
     * - Operation-level checks (Adjust, Transfer, Sell) restrict what users can perform on non-assigned branches.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER','CASHIER')")
    fun getAllInventory(branchId: UUID? = null): InventoryListResponse {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        // All roles can view inventory for any branch - no branch filtering for read access
        val effectiveBranchId = branchId

        val allInventory = if (effectiveBranchId != null) {
            // Specific branch requested
            inventoryRepository.findByBranchId(effectiveBranchId)
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
     * Gets inventory transfer history for admin review.
     * Returns all transfers with details about who performed them.
     * Only accessible by ADMIN and PLATFORM_ADMIN roles.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional(readOnly = true)
    fun getTransferHistory(
        branchId: UUID? = null,
        startDate: OffsetDateTime? = null,
        endDate: OffsetDateTime? = null,
        performedBy: UUID? = null
    ): InventoryTransferHistoryResponse {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        // Get all TRANSFER_OUT transactions (these represent the source of transfers)
        val transferOutTransactions = when {
            branchId != null && startDate != null && endDate != null -> {
                inventoryTransactionRepository.findByBranchIdAndTenantId(branchId, currentTenantId)
                    .filter { 
                        it.transactionType == TransactionType.TRANSFER_OUT &&
                        it.createdAt.isAfter(startDate) &&
                        it.createdAt.isBefore(endDate) &&
                        (performedBy == null || it.performedBy?.id == performedBy)
                    }
            }
            branchId != null -> {
                inventoryTransactionRepository.findByBranchIdAndTenantId(branchId, currentTenantId)
                    .filter { 
                        it.transactionType == TransactionType.TRANSFER_OUT &&
                        (performedBy == null || it.performedBy?.id == performedBy)
                    }
            }
            performedBy != null -> {
                inventoryTransactionRepository.findByPerformedByAndTenantId(performedBy, currentTenantId)
                    .filter { it.transactionType == TransactionType.TRANSFER_OUT }
            }
            startDate != null && endDate != null -> {
                inventoryTransactionRepository.findByDateRangeAndTenantId(startDate, endDate, currentTenantId)
                    .filter { it.transactionType == TransactionType.TRANSFER_OUT }
            }
            else -> {
                inventoryTransactionRepository.findByTransactionTypeAndTenantId(TransactionType.TRANSFER_OUT, currentTenantId)
            }
        }

        // For each TRANSFER_OUT, find the corresponding TRANSFER_IN using reference number
        val transferHistory = transferOutTransactions.mapNotNull { transferOut ->
            // Find the corresponding TRANSFER_IN transaction by reference number
            val transferIn = if (transferOut.referenceNumber != null) {
                inventoryTransactionRepository
                    .findByTransactionTypeAndTenantId(TransactionType.TRANSFER_IN, currentTenantId)
                    .firstOrNull { it.referenceNumber == transferOut.referenceNumber }
            } else {
                // Fallback: match by product, quantity, and timing (for older transfers without reference)
                inventoryTransactionRepository
                    .findByTransactionTypeAndTenantId(TransactionType.TRANSFER_IN, currentTenantId)
                    .firstOrNull { 
                        it.product.id == transferOut.product.id &&
                        it.quantity == -transferOut.quantity &&
                        it.createdAt.isAfter(transferOut.createdAt.minusSeconds(5)) &&
                        it.createdAt.isBefore(transferOut.createdAt.plusSeconds(5))
                    }
            }

            val toBranch = transferIn?.branch

            if (toBranch != null) {
                InventoryTransferHistoryDto(
                    id = transferOut.id!!,
                    productId = transferOut.product.id!!,
                    productName = transferOut.product.name,
                    fromBranchId = transferOut.branch.id!!,
                    fromBranchName = transferOut.branch.name,
                    toBranchId = toBranch.id!!,
                    toBranchName = toBranch.name,
                    quantity = -transferOut.quantity, // Make positive
                    batchNumber = transferOut.batchNumber,
                    expiryDate = transferOut.expiryDate,
                    unitCost = transferOut.unitCost,
                    notes = transferOut.notes,
                    performedBy = transferOut.performedBy?.id,
                    performedByUsername = transferOut.performedBy?.username,
                    performedByEmail = transferOut.performedBy?.email,
                    createdAt = transferOut.createdAt
                )
            } else {
                null
            }
        }

        return InventoryTransferHistoryResponse(
            transfers = transferHistory.sortedByDescending { it.createdAt },
            totalCount = transferHistory.size.toLong()
        )
    }

    /**
     * Creates an inventory transaction record.
     * Captures the current authenticated user who performed the transaction.
     */
    private fun createTransaction(
        product: Product,
        branch: Branch,
        transactionType: TransactionType,
        quantity: Int,
        unitCost: BigDecimal?,
        batchNumber: String?,
        expiryDate: LocalDate?,
        notes: String?,
        referenceNumber: String? = null
    ) {
        // Get current authenticated user
        val currentUsername = org.springframework.security.core.context.SecurityContextHolder.getContext()?.authentication?.name
        val user = if (currentUsername != null) {
            userRepository.findByUsername(currentUsername)
        } else {
            null
        }

        val transaction = InventoryTransaction(
            product = product,
            branch = branch,
            transactionType = transactionType,
            quantity = quantity,
            unitCost = unitCost,
            totalCost = unitCost?.multiply(BigDecimal(quantity)),
            batchNumber = batchNumber,
            expiryDate = expiryDate,
            referenceNumber = referenceNumber,
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
            unitCost = product.unitCost ?: inventory.unitCost,
            sellingPrice = product.sellingPrice ?: inventory.sellingPrice,
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
