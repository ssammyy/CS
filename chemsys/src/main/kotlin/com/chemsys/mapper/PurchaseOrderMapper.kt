package com.chemsys.mapper

import com.chemsys.dto.*
import com.chemsys.entity.PurchaseOrder
import com.chemsys.entity.PurchaseOrderLineItem
import com.chemsys.entity.PurchaseOrderHistory
import org.springframework.stereotype.Component
import java.util.*

/**
 * Mapper class for converting between PurchaseOrder entities and DTOs.
 * Provides methods for mapping purchase order data for API responses and requests.
 */
@Component
class PurchaseOrderMapper {

    /**
     * Converts a PurchaseOrder entity to PurchaseOrderDto.
     * Maps all entity fields to the corresponding DTO fields including line items.
     *
     * @param purchaseOrder The purchase order entity to convert
     * @return PurchaseOrderDto with mapped data
     */
    fun toDto(purchaseOrder: PurchaseOrder): PurchaseOrderDto {
        return PurchaseOrderDto(
            id = purchaseOrder.id!!,
            poNumber = purchaseOrder.poNumber,
            title = purchaseOrder.title,
            description = purchaseOrder.description,
            supplierId = purchaseOrder.supplier.id!!,
            supplierName = purchaseOrder.supplier.name,
            tenantId = purchaseOrder.tenant.id!!,
            tenantName = purchaseOrder.tenant.name,
            branchId = purchaseOrder.branch.id!!,
            branchName = purchaseOrder.branch.name,
            status = purchaseOrder.status,
            totalAmount = purchaseOrder.totalAmount,
            taxAmount = purchaseOrder.taxAmount,
            discountAmount = purchaseOrder.discountAmount,
            grandTotal = purchaseOrder.grandTotal,
            paymentTerms = purchaseOrder.paymentTerms,
            expectedDeliveryDate = purchaseOrder.expectedDeliveryDate,
            actualDeliveryDate = purchaseOrder.actualDeliveryDate,
            notes = purchaseOrder.notes,
            approvedBy = purchaseOrder.approvedBy,
            approvedAt = purchaseOrder.approvedAt,
            createdBy = purchaseOrder.createdBy,
            createdAt = purchaseOrder.createdAt,
            updatedAt = purchaseOrder.updatedAt,
            lineItems = emptyList() // Line items will be mapped separately if needed
        )
    }

    /**
     * Converts a PurchaseOrder entity to PurchaseOrderDto with line items.
     * Maps the purchase order and all its line items.
     *
     * @param purchaseOrder The purchase order entity to convert
     * @param lineItems The list of line items for this purchase order
     * @return PurchaseOrderDto with mapped data and line items
     */
    fun toDtoWithLineItems(purchaseOrder: PurchaseOrder, lineItems: List<PurchaseOrderLineItem>): PurchaseOrderDto {
        return toDto(purchaseOrder).copy(
            lineItems = lineItems.map { lineItem -> toLineItemDto(lineItem) }
        )
    }

    /**
     * Converts a PurchaseOrderLineItem entity to PurchaseOrderLineItemDto.
     *
     * @param lineItem The line item entity to convert
     * @return PurchaseOrderLineItemDto with mapped data
     */
    fun toLineItemDto(lineItem: PurchaseOrderLineItem): PurchaseOrderLineItemDto {
        return PurchaseOrderLineItemDto(
            id = lineItem.id!!,
            productId = lineItem.product.id!!,
            productName = lineItem.product.name,
            productBarcode = lineItem.product.barcode,
            quantity = lineItem.quantity,
            unitPrice = lineItem.unitPrice,
            totalPrice = lineItem.totalPrice,
            receivedQuantity = lineItem.receivedQuantity,
            expectedDeliveryDate = lineItem.expectedDeliveryDate,
            notes = lineItem.notes
        )
    }

    /**
     * Converts a list of PurchaseOrder entities to a list of PurchaseOrderDto.
     * Maps each entity in the list to its corresponding DTO.
     *
     * @param purchaseOrders The list of purchase order entities to convert
     * @return List of PurchaseOrderDto with mapped data
     */
    fun toDtoList(purchaseOrders: List<PurchaseOrder>): List<PurchaseOrderDto> {
        return purchaseOrders.map { purchaseOrder ->
            toDto(purchaseOrder)
        }
    }

    /**
     * Converts a list of PurchaseOrderLineItem entities to a list of PurchaseOrderLineItemDto.
     *
     * @param lineItems The list of line item entities to convert
     * @return List of PurchaseOrderLineItemDto with mapped data
     */
    fun toLineItemDtoList(lineItems: List<PurchaseOrderLineItem>): List<PurchaseOrderLineItemDto> {
        return lineItems.map { lineItem ->
            toLineItemDto(lineItem)
        }
    }

    /**
     * Converts a PurchaseOrderHistory entity to a summary DTO.
     * This can be used for audit trail and history display.
     *
     * @param history The history entity to convert
     * @return Map containing history information
     */
    fun toHistorySummary(history: PurchaseOrderHistory): Map<String, Any?> {
        return mapOf(
            "id" to history.id,
            "action" to history.action,
            "previousStatus" to history.previousStatus,
            "newStatus" to history.newStatus,
            "description" to history.description,
            "performedBy" to history.performedBy,
            "performedAt" to history.performedAt
        )
    }

    /**
     * Converts a list of PurchaseOrderHistory entities to a list of summary DTOs.
     *
     * @param historyList The list of history entities to convert
     * @return List of history summary maps
     */
    fun toHistorySummaryList(historyList: List<PurchaseOrderHistory>): List<Map<String, Any?>> {
        return historyList.map { history ->
            toHistorySummary(history)
        }
    }

    /**
     * Converts a PurchaseOrder entity to PurchaseOrderDto with additional context.
     * This method can be extended to include additional calculated fields or relationships.
     *
     * @param purchaseOrder The purchase order entity to convert
     * @param additionalContext Additional context data (can be extended as needed)
     * @return PurchaseOrderDto with mapped data and additional context
     */
    fun toDtoWithContext(purchaseOrder: PurchaseOrder, additionalContext: Map<String, Any?> = emptyMap()): PurchaseOrderDto {
        return toDto(purchaseOrder).also {
            // Additional context can be added here if needed in the future
            // For example, supplier performance metrics, delivery history, etc.
        }
    }

    /**
     * Creates a PurchaseOrder entity from CreatePurchaseOrderRequest.
     * This is a helper method for creating new purchase orders.
     *
     * @param request The creation request
     * @param supplier The supplier entity
     * @param tenant The tenant entity
     * @param branch The branch entity
     * @param createdBy The user creating the purchase order
     * @return PurchaseOrder entity
     */
    fun fromCreateRequest(
        request: CreatePurchaseOrderRequest,
        supplier: com.chemsys.entity.Supplier,
        tenant: com.chemsys.entity.Tenant,
        branch: com.chemsys.entity.Branch,
        createdBy: String
    ): PurchaseOrder {
        return PurchaseOrder(
            poNumber = generatePoNumber(), // This should be implemented based on your numbering strategy
            title = request.title,
            description = request.description,
            supplier = supplier,
            tenant = tenant,
            branch = branch,
            paymentTerms = request.paymentTerms,
            expectedDeliveryDate = request.expectedDeliveryDate,
            notes = request.notes,
            createdBy = createdBy,
            taxAmount = null,
            discountAmount = null,
            actualDeliveryDate = null,
            approvedBy = null,
            approvedAt = null
        )
    }

    /**
     * Creates PurchaseOrderLineItem entities from CreatePurchaseOrderLineItemRequest.
     *
     * @param requests The list of line item creation requests
     * @param purchaseOrder The purchase order entity
     * @param products The map of product entities by ID
     * @return List of PurchaseOrderLineItem entities
     */
    fun fromCreateLineItemRequests(
        requests: List<CreatePurchaseOrderLineItemRequest>,
        purchaseOrder: PurchaseOrder,
        products: Map<UUID, com.chemsys.entity.Product>
    ): List<PurchaseOrderLineItem> {
        return requests.mapNotNull { request ->
            val product = products[request.productId] ?: return@mapNotNull null
            
            PurchaseOrderLineItem(
                purchaseOrder = purchaseOrder,
                product = product,
                quantity = request.quantity,
                unitPrice = request.unitPrice,
                totalPrice = request.unitPrice.multiply(java.math.BigDecimal.valueOf(request.quantity.toLong())),
                expectedDeliveryDate = request.expectedDeliveryDate,
                notes = request.notes
            )
        }
    }

    /**
     * Generates a unique PO number.
     * This should be implemented based on your business rules for PO numbering.
     *
     * @return Generated PO number
     */
    private fun generatePoNumber(): String {
        // Implementation should follow your business rules
        // Example: PO-YYYY-MM-XXXX format
        val timestamp = System.currentTimeMillis()
        return "PO-${timestamp}"
    }
}
