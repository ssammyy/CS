package com.chemsys.mapper

import com.chemsys.dto.*
import com.chemsys.entity.*
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

/**
 * Mapper component for converting between Sales entities and DTOs.
 * Provides bidirectional mapping between domain entities and data transfer objects.
 * 
 * This mapper follows the Backend Data Consistency Rule by ensuring:
 * - Proper data transformation without data loss
 * - Consistent mapping patterns across all sales-related entities
 * - Support for complex entity relationships and nested objects
 * - Proper handling of optional fields and null values
 */
@Component
class SalesMapper {

    // ==================== Sale Mappings ====================

    /**
     * Converts a Sale entity to SaleDto.
     * 
     * @param sale The sale entity to convert
     * @return SaleDto representation of the sale
     */
    fun toSaleDto(sale: Sale): SaleDto {
        return SaleDto(
            id = sale.id!!,
            saleNumber = sale.saleNumber,
            branchId = sale.branch.id!!,
            branchName = sale.branch.name,
            customerId = sale.customer?.id,
            customerName = sale.customerName ?: sale.customer?.let { "${it.firstName} ${it.lastName}" },
            customerPhone = sale.customerPhone ?: sale.customer?.phone,
            subtotal = sale.subtotal,
            taxAmount = sale.taxAmount,
            discountAmount = sale.discountAmount,
            totalAmount = sale.totalAmount,
            status = sale.status,
            notes = sale.notes,
            cashierId = sale.cashier.id!!,
            cashierName = "${sale.cashier.username}", // Assuming username is the display name
            saleDate = sale.saleDate,
            createdAt = sale.createdAt,
            returnStatus = sale.returnStatus,
            isCreditSale = sale.isCreditSale,
            lineItems = sale.lineItems.map { toSaleLineItemDto(it) },
            payments = sale.payments.map { toSalePaymentDto(it) },
            commission = null
        )
    }

    /**
     * Converts a list of Sale entities to a list of SaleDto objects.
     * 
     * @param sales The list of sale entities to convert
     * @return List of SaleDto objects
     */
    fun toSaleDtoList(sales: List<Sale>): List<SaleDto> {
        return sales.map { toSaleDto(it) }
    }

    /**
     * Converts a SaleLineItem entity to SaleLineItemDto.
     * 
     * @param lineItem The sale line item entity to convert
     * @return SaleLineItemDto representation of the line item
     */
    fun toSaleLineItemDto(lineItem: SaleLineItem): SaleLineItemDto {
        return SaleLineItemDto(
            id = lineItem.id!!,
            productId = lineItem.product.id!!,
            productName = lineItem.product.name,
            productBarcode = lineItem.product.barcode,
            inventoryId = lineItem.inventory.id!!,
            quantity = lineItem.quantity,
            returnedQuantity = lineItem.returnedQuantity,
            unitPrice = lineItem.unitPrice,
            discountPercentage = lineItem.discountPercentage,
            discountAmount = lineItem.discountAmount,
            taxPercentage = lineItem.taxPercentage,
            taxAmount = lineItem.taxAmount,
            lineTotal = lineItem.lineTotal,
            batchNumber = lineItem.batchNumber,
            expiryDate = lineItem.expiryDate,
            notes = lineItem.notes
        )
    }

    /**
     * Converts a SalePayment entity to SalePaymentDto.
     * 
     * @param payment The sale payment entity to convert
     * @return SalePaymentDto representation of the payment
     */
    fun toSalePaymentDto(payment: SalePayment): SalePaymentDto {
        return SalePaymentDto(
            id = payment.id!!,
            paymentMethod = payment.paymentMethod,
            amount = payment.amount,
            referenceNumber = payment.referenceNumber,
            notes = payment.notes,
            createdAt = payment.createdAt
        )
    }

    // ==================== Customer Mappings ====================

    /**
     * Converts a Customer entity to CustomerDto.
     * 
     * @param customer The customer entity to convert
     * @return CustomerDto representation of the customer
     */
    fun toCustomerDto(customer: Customer): CustomerDto {
        return CustomerDto(
            id = customer.id!!,
            customerNumber = customer.customerNumber,
            firstName = customer.firstName,
            lastName = customer.lastName,
            phone = customer.phone,
            email = customer.email,
            dateOfBirth = customer.dateOfBirth,
            address = customer.address,
            insuranceProvider = customer.insuranceProvider,
            insuranceNumber = customer.insuranceNumber,
            isActive = customer.isActive,
            createdAt = customer.createdAt,
            updatedAt = customer.updatedAt
        )
    }

    /**
     * Converts a list of Customer entities to a list of CustomerDto objects.
     * 
     * @param customers The list of customer entities to convert
     * @return List of CustomerDto objects
     */
    fun toCustomerDtoList(customers: List<Customer>): List<CustomerDto> {
        return customers.map { toCustomerDto(it) }
    }

    /**
     * Converts CreateCustomerRequest to Customer entity.
     * Note: This method creates a new entity that needs to be saved to the database.
     * 
     * @param request The create customer request
     * @param tenant The tenant entity
     * @param customerNumber The generated customer number
     * @return Customer entity
     */
    fun toCustomerEntity(request: CreateCustomerRequest, tenant: Tenant, customerNumber: String): Customer {
        return Customer(
            customerNumber = customerNumber,
            firstName = request.firstName,
            lastName = request.lastName?.trim()?.takeIf { it.isNotBlank() } ?: "",
            phone = request.phone,
            email = null,
            dateOfBirth = null,
            address = null,
            insuranceProvider = null,
            insuranceNumber = null,
            tenant = tenant
        )
    }

    /**
     * Updates an existing Customer entity with data from UpdateCustomerRequest.
     * 
     * @param customer The existing customer entity to update
     * @param request The update customer request
     * @return Updated Customer entity
     */
    fun updateCustomerEntity(customer: Customer, request: UpdateCustomerRequest): Customer {
        return customer.copy(
            firstName = request.firstName,
            lastName = request.lastName,
            phone = request.phone,
            isActive = request.isActive,
            updatedAt = OffsetDateTime.now()
        )
    }

    // ==================== Sale Return Mappings ====================

    /**
     * Converts a SaleReturn entity to SaleReturnDto.
     * 
     * @param saleReturn The sale return entity to convert
     * @return SaleReturnDto representation of the sale return
     */
    fun toSaleReturnDto(saleReturn: SaleReturn): SaleReturnDto {
        return SaleReturnDto(
            id = saleReturn.id!!,
            returnNumber = saleReturn.returnNumber,
            originalSaleId = saleReturn.originalSale.id!!,
            originalSaleNumber = saleReturn.originalSale.saleNumber,
            branchId = saleReturn.branch.id!!,
            branchName = saleReturn.branch.name,
            returnReason = saleReturn.returnReason,
            totalRefundAmount = saleReturn.totalRefundAmount,
            status = saleReturn.status,
            notes = saleReturn.notes,
            processedById = saleReturn.processedBy.id!!,
            processedByName = saleReturn.processedBy.username,
            returnDate = saleReturn.returnDate,
            createdAt = saleReturn.createdAt,
            returnLineItems = saleReturn.returnLineItems.map { toSaleReturnLineItemDto(it) }
        )
    }

    /**
     * Converts a list of SaleReturn entities to a list of SaleReturnDto objects.
     * 
     * @param saleReturns The list of sale return entities to convert
     * @return List of SaleReturnDto objects
     */
    fun toSaleReturnDtoList(saleReturns: List<SaleReturn>): List<SaleReturnDto> {
        return saleReturns.map { toSaleReturnDto(it) }
    }

    /**
     * Converts a SaleReturnLineItem entity to SaleReturnLineItemDto.
     * 
     * @param returnLineItem The sale return line item entity to convert
     * @return SaleReturnLineItemDto representation of the return line item
     */
    fun toSaleReturnLineItemDto(returnLineItem: SaleReturnLineItem): SaleReturnLineItemDto {
        return SaleReturnLineItemDto(
            id = returnLineItem.id!!,
            originalSaleLineItemId = returnLineItem.originalSaleLineItem.id!!,
            productId = returnLineItem.product.id!!,
            productName = returnLineItem.product.name,
            quantityReturned = returnLineItem.quantityReturned,
            unitPrice = returnLineItem.unitPrice,
            refundAmount = returnLineItem.refundAmount,
            restoreToInventory = returnLineItem.restoreToInventory,
            notes = returnLineItem.notes
        )
    }

    // ==================== List Response Mappings ====================

    /**
     * Converts a Page of Sale entities to SalesListResponse.
     * 
     * @param salesPage The page of sale entities
     * @param totalFilteredAmount Optional sum of totalAmount for all sales matching the filter (across all pages)
     * @return SalesListResponse with pagination information
     */
    fun toSalesListResponse(salesPage: org.springframework.data.domain.Page<Sale>, totalFilteredAmount: java.math.BigDecimal? = null): SalesListResponse {
        return SalesListResponse(
            sales = toSaleDtoList(salesPage.content),
            totalElements = salesPage.totalElements,
            totalPages = salesPage.totalPages,
            currentPage = salesPage.number,
            pageSize = salesPage.size,
            hasNext = salesPage.hasNext(),
            hasPrevious = salesPage.hasPrevious(),
            totalFilteredAmount = totalFilteredAmount
        )
    }

    /**
     * Converts a Page of Customer entities to CustomersListResponse.
     * 
     * @param customersPage The page of customer entities
     * @return CustomersListResponse with pagination information
     */
    fun toCustomersListResponse(customersPage: org.springframework.data.domain.Page<Customer>): CustomersListResponse {
        return CustomersListResponse(
            customers = toCustomerDtoList(customersPage.content),
            totalElements = customersPage.totalElements,
            totalPages = customersPage.totalPages,
            currentPage = customersPage.number,
            pageSize = customersPage.size,
            hasNext = customersPage.hasNext(),
            hasPrevious = customersPage.hasPrevious()
        )
    }

    // ==================== POS Operation Mappings ====================

    /**
     * Converts barcode scan result to BarcodeScanResponse.
     * 
     * @param product The product entity
     * @param availableInventory The list of available inventory items
     * @return BarcodeScanResponse
     */
    fun toBarcodeScanResponse(product: Product, availableInventory: List<Inventory>): BarcodeScanResponse {
        return BarcodeScanResponse(
            productId = product.id!!,
            productName = product.name,
            barcode = product.barcode ?: "",
            availableInventory = availableInventory.map { toInventoryItemDto(it) },
            sellingPrice = product.sellingPrice ?: availableInventory.firstOrNull()?.sellingPrice,
            requiresPrescription = product.requiresPrescription
        )
    }

    /**
     * Converts an Inventory entity to InventoryItemDto.
     * 
     * @param inventory The inventory entity to convert
     * @return InventoryItemDto representation of the inventory item
     */
    fun toInventoryItemDto(inventory: Inventory): InventoryItemDto {
        val product = inventory.product
        return InventoryItemDto(
            inventoryId = inventory.id!!,
            batchNumber = inventory.batchNumber,
            expiryDate = inventory.expiryDate,
            quantity = inventory.quantity,
            unitCost = product.unitCost ?: inventory.unitCost,
            sellingPrice = product.sellingPrice ?: inventory.sellingPrice
        )
    }

    /**
     * Converts a list of Inventory entities to a list of InventoryItemDto objects.
     * 
     * @param inventoryList The list of inventory entities to convert
     * @return List of InventoryItemDto objects
     */
    fun toInventoryItemDtoList(inventoryList: List<Inventory>): List<InventoryItemDto> {
        return inventoryList.map { toInventoryItemDto(it) }
    }

    // ==================== Summary and Report Mappings ====================

    /**
     * Converts sales summary data to SaleSummaryDto.
     * 
     * @param totalSales Total number of sales
     * @param totalAmount Total sales amount
     * @param totalTax Total tax amount
     * @param totalDiscount Total discount amount
     * @param topSellingProducts List of top selling products
     * @param salesByPaymentMethod Map of sales by payment method
     * @param salesByHour Map of sales by hour
     * @return SaleSummaryDto
     */
    fun toSaleSummaryDto(
        totalSales: Int,
        totalAmount: BigDecimal,
        totalTax: BigDecimal,
        totalDiscount: BigDecimal,
        topSellingProducts: List<ProductSalesSummaryDto>,
        salesByPaymentMethod: Map<PaymentMethod, BigDecimal>,
        salesByHour: Map<Int, Int>
    ): SaleSummaryDto {
        return SaleSummaryDto(
            totalSales = totalSales,
            totalAmount = totalAmount,
            totalTax = totalTax,
            totalDiscount = totalDiscount,
            averageSaleAmount = if (totalSales > 0) totalAmount.divide(BigDecimal(totalSales), 2, java.math.RoundingMode.HALF_UP) else BigDecimal.ZERO,
            topSellingProducts = topSellingProducts,
            salesByPaymentMethod = salesByPaymentMethod,
            salesByHour = salesByHour
        )
    }

    /**
     * Converts product sales summary data to ProductSalesSummaryDto.
     * 
     * @param productId The product ID
     * @param productName The product name
     * @param totalQuantitySold Total quantity sold
     * @param totalRevenue Total revenue from the product
     * @param averagePrice Average selling price
     * @return ProductSalesSummaryDto
     */
    fun toProductSalesSummaryDto(
        productId: UUID,
        productName: String,
        totalQuantitySold: Int,
        totalRevenue: BigDecimal,
        averagePrice: BigDecimal
    ): ProductSalesSummaryDto {
        return ProductSalesSummaryDto(
            productId = productId,
            productName = productName,
            totalQuantitySold = totalQuantitySold,
            totalRevenue = totalRevenue,
            averagePrice = averagePrice
        )
    }

    // ==================== Helper Methods ====================

    /**
     * Calculates the total amount for a sale from line items.
     * 
     * @param lineItems The list of sale line items
     * @return Total amount
     */
    fun calculateTotalAmount(lineItems: List<CreateSaleLineItemRequest>): BigDecimal {
        return lineItems.sumOf { it.unitPrice.multiply(BigDecimal(it.quantity)) }
    }

    /**
     * Calculates the total amount for a sale from line items with tax and discount.
     * 
     * @param lineItems The list of sale line items
     * @param taxAmount The tax amount
     * @param discountAmount The discount amount
     * @return Total amount including tax and discount
     */
    fun calculateTotalAmountWithTaxAndDiscount(
        lineItems: List<CreateSaleLineItemRequest>,
        taxAmount: BigDecimal?,
        discountAmount: BigDecimal?
    ): BigDecimal {
        val subtotal = calculateTotalAmount(lineItems)
        val tax = taxAmount ?: BigDecimal.ZERO
        val discount = discountAmount ?: BigDecimal.ZERO
        return subtotal.add(tax).subtract(discount)
    }

    /**
     * Validates that the total payment amount matches the sale total.
     * 
     * @param payments The list of payments
     * @param totalAmount The total sale amount
     * @return True if payments match total, false otherwise
     */
    fun validatePaymentTotal(payments: List<CreateSalePaymentRequest>, totalAmount: BigDecimal): Boolean {
        val totalPaid = payments.sumOf { it.amount }
        return totalPaid.compareTo(totalAmount) == 0
    }

    /**
     * Generates a sale number for a specific tenant.
     * 
     * @param tenantId The tenant ID
     * @param sequenceNumber The sequence number
     * @return Generated sale number
     */
    fun generateSaleNumber(tenantId: UUID, sequenceNumber: Long): String {
        return "SAL${sequenceNumber.toString().padStart(8, '0')}"
    }

    /**
     * Generates a customer number for a specific tenant.
     * 
     * @param tenantId The tenant ID
     * @param sequenceNumber The sequence number
     * @return Generated customer number
     */
    fun generateCustomerNumber(tenantId: UUID, sequenceNumber: Long): String {
        return "CUS${sequenceNumber.toString().padStart(8, '0')}"
    }

    /**
     * Generates a return number for a specific tenant.
     * 
     * @param tenantId The tenant ID
     * @param sequenceNumber The sequence number
     * @return Generated return number
     */
    fun generateReturnNumber(tenantId: UUID, sequenceNumber: Long): String {
        return "RET${sequenceNumber.toString().padStart(8, '0')}"
    }


}
