package com.chemsys.service

import com.chemsys.dto.*
import com.chemsys.entity.*
import com.chemsys.repository.*
import com.chemsys.config.TenantContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.*

/**
 * SalesValidationService handles validation logic for sales operations.
 * Provides comprehensive validation for prescription requirements, stock availability,
 * and business rules before processing sales transactions.
 * 
 * This service follows the Backend Data Consistency Rule by ensuring:
 * - All validation operations are properly isolated
 * - Comprehensive error handling and validation messages
 * - Support for complex business rule validation
 * - Proper tenant isolation for multi-tenant architecture
 */
@Service
class SalesValidationService(
    private val productRepository: ProductRepository,
    private val inventoryRepository: InventoryRepository,
    private val customerRepository: CustomerRepository,
    private val branchRepository: BranchRepository
) {

    /**
     * Validates a complete sale request before processing.
     * 
     * @param request The sale creation request to validate
     * @return ValidationResult with detailed validation information
     */
    @Transactional(readOnly = true)
    fun validateSaleRequest(request: CreateSaleRequest): ValidationResult {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw IllegalStateException("No tenant context found")

        val validationErrors = mutableListOf<String>()
        val validationWarnings = mutableListOf<String>()

        // Validate branch
        validateBranch(request.branchId, tenantId, validationErrors)

        // Validate customer if provided
        if (request.customerId != null) {
            validateCustomer(request.customerId, tenantId, validationErrors)
        }

        // Validate line items
        validateLineItems(request.lineItems, request.branchId, tenantId, validationErrors, validationWarnings)

        // Validate payments (considering credit sale flag)
        validatePayments(request.payments, request.isCreditSale ?: false, validationErrors)

        // Validate totals (considering credit sale flag)
        validateTotals(request, validationErrors)

        // Validate business rules
        validateBusinessRules(request, validationErrors, validationWarnings)

        return ValidationResult(
            isValid = validationErrors.isEmpty(),
            errors = validationErrors,
            warnings = validationWarnings
        )
    }

    /**
     * Validates stock availability for a specific product and quantity.
     *
     * @param productId The product ID to check
     * @param branchId The branch ID to check
     * @param requestedQuantity The quantity requested
     * @param tenantId The tenant ID for isolation
     * @return StockValidationResult with availability information
     */
    @Transactional(readOnly = true)
    fun validateStockAvailability(
        productId: UUID,
        branchId: UUID,
        requestedQuantity: Int,
        tenantId: UUID
    ): StockValidationResult {
        val product = productRepository.findById(productId)
            .orElseThrow { IllegalArgumentException("Product not found: $productId") }

        if (product.tenant.id != tenantId) {
            throw IllegalArgumentException("Product does not belong to current tenant")
        }

        val availableInventory = inventoryRepository.findByProductIdAndBranchId(
            productId, branchId
        ).filter { it.quantity > 0 && it.isActive }
        
        val totalAvailable = availableInventory.sumOf { it.quantity }
        
        return StockValidationResult(
            productId = productId,
            productName = product.name,
            requestedQuantity = requestedQuantity,
            availableQuantity = totalAvailable,
            isAvailable = totalAvailable >= requestedQuantity,
            inventoryItems = availableInventory.map { inventory ->
                InventoryAvailability(
                    inventoryId = inventory.id!!,
                    batchNumber = inventory.batchNumber,
                    expiryDate = inventory.expiryDate,
                    availableQuantity = inventory.quantity,
                    unitCost = inventory.product.unitCost ?: inventory.unitCost,
                    sellingPrice = inventory.product.sellingPrice ?: inventory.sellingPrice,
                    isExpired = inventory.expiryDate?.isBefore(java.time.LocalDate.now()) ?: false,
                    isExpiringSoon = inventory.expiryDate?.isBefore(java.time.LocalDate.now().plusDays(30)) ?: false
                )
            }
        )
    }

    /**
     * Validates prescription requirements for a product.
     * 
     * @param productId The product ID to check
     * @param customerId The customer ID (optional)
     * @param tenantId The tenant ID for isolation
     * @return PrescriptionValidationResult with prescription information
     */
    @Transactional(readOnly = true)
    fun validatePrescriptionRequirements(
        productId: UUID,
        customerId: UUID?,
        tenantId: UUID
    ): PrescriptionValidationResult {
        val product = productRepository.findById(productId)
            .orElseThrow { IllegalArgumentException("Product not found: $productId") }
        
        if (product.tenant.id != tenantId) {
            throw IllegalArgumentException("Product does not belong to current tenant")
        }
        
        if (!product.requiresPrescription) {
            return PrescriptionValidationResult(
                productId = productId,
                productName = product.name,
                requiresPrescription = false,
                isValid = true,
                message = "Product does not require prescription"
            )
        }
        
        // TODO: Implement prescription validation logic
        // This would typically involve:
        // 1. Checking if customer has a valid prescription for this product
        // 2. Verifying prescription is not expired
        // 3. Checking prescription quantity limits
        // 4. Validating prescription against product strength/dosage
        
        return PrescriptionValidationResult(
            productId = productId,
            productName = product.name,
            requiresPrescription = true,
            isValid = false, // TODO: Implement actual prescription validation
            message = "Prescription validation not yet implemented"
        )
    }

    /**
     * Validates customer information for a sale.
     * 
     * @param customerId The customer ID to validate
     * @param tenantId The tenant ID for isolation
     * @return CustomerValidationResult with customer information
     */
    @Transactional(readOnly = true)
    fun validateCustomer(customerId: UUID, tenantId: UUID): CustomerValidationResult {
        val customer = customerRepository.findById(customerId)
            .orElseThrow { IllegalArgumentException("Customer not found: $customerId") }
        
        if (customer.tenant.id != tenantId) {
            throw IllegalArgumentException("Customer does not belong to current tenant")
        }
        
        return CustomerValidationResult(
            customerId = customerId,
            customerName = "${customer.firstName} ${customer.lastName}",
            isActive = customer.isActive,
            isValid = customer.isActive,
            message = if (customer.isActive) "Customer is valid" else "Customer account is inactive"
        )
    }

    // ==================== Private Validation Methods ====================

    /**
     * Validates branch information.
     */
    private fun validateBranch(branchId: UUID, tenantId: UUID, errors: MutableList<String>) {
        val branch = branchRepository.findById(branchId)
            .orElse(null)
        
        if (branch == null) {
            errors.add("Branch not found: $branchId")
            return
        }
        
        if (branch.tenant.id != tenantId) {
            errors.add("Branch does not belong to current tenant")
        }
    }

    /**
     * Validates customer information.
     */
    private fun validateCustomer(customerId: UUID, tenantId: UUID, errors: MutableList<String>) {
        val customer = customerRepository.findById(customerId)
            .orElse(null)
        
        if (customer == null) {
            errors.add("Customer not found: $customerId")
            return
        }
        
        if (customer.tenant.id != tenantId) {
            errors.add("Customer does not belong to current tenant")
        }
        
        if (!customer.isActive) {
            errors.add("Customer account is inactive: ${customer.firstName} ${customer.lastName}")
        }
    }

    /**
     * Validates line items for stock availability and business rules.
     */
    private fun validateLineItems(
        lineItems: List<CreateSaleLineItemRequest>,
        branchId: UUID,
        tenantId: UUID,
        errors: MutableList<String>,
        warnings: MutableList<String>
    ) {
        if (lineItems.isEmpty()) {
            errors.add("Sale must have at least one line item")
            return
        }
        
        lineItems.forEachIndexed { index, lineItem ->
            // Validate product exists
            val product = productRepository.findById(lineItem.productId)
                .orElse(null)
            
            if (product == null) {
                errors.add("Line item ${index + 1}: Product not found: ${lineItem.productId}")
                return@forEachIndexed
            }
            
            if (product.tenant.id != tenantId) {
                errors.add("Line item ${index + 1}: Product does not belong to current tenant")
                return@forEachIndexed
            }
            
            // Validate inventory exists
            val inventory = inventoryRepository.findById(lineItem.inventoryId)
                .orElse(null)
            
            if (inventory == null) {
                errors.add("Line item ${index + 1}: Inventory not found: ${lineItem.inventoryId}")
                return@forEachIndexed
            }
            
            if (inventory.branch.id != branchId) {
                errors.add("Line item ${index + 1}: Inventory does not belong to specified branch")
                return@forEachIndexed
            }
            
            if (inventory.product.id != product.id) {
                errors.add("Line item ${index + 1}: Inventory does not match product")
                return@forEachIndexed
            }
            
            // Validate stock availability
            if (inventory.quantity < lineItem.quantity) {
                errors.add("Line item ${index + 1}: Insufficient stock for ${product.name}. Available: ${inventory.quantity}, Requested: ${lineItem.quantity}")
            }
            
            // Check for expired products
            if (inventory.expiryDate?.isBefore(java.time.LocalDate.now()) == true) {
                errors.add("Line item ${index + 1}: Product ${product.name} has expired (${inventory.expiryDate})")
            }
            
            // Check for products expiring soon
            if (inventory.expiryDate?.isBefore(java.time.LocalDate.now().plusDays(30)) == true) {
                warnings.add("Line item ${index + 1}: Product ${product.name} is expiring soon (${inventory.expiryDate})")
            }
            
            // Validate pricing
            if (lineItem.unitPrice <= BigDecimal.ZERO) {
                errors.add("Line item ${index + 1}: Unit price must be greater than zero")
            }
            
            // Validate discounts
            if (lineItem.discountPercentage != null) {
                if (lineItem.discountPercentage < BigDecimal.ZERO || lineItem.discountPercentage > BigDecimal(100)) {
                    errors.add("Line item ${index + 1}: Discount percentage must be between 0 and 100")
                }
            }
            
            if (lineItem.discountAmount != null) {
                if (lineItem.discountAmount < BigDecimal.ZERO) {
                    errors.add("Line item ${index + 1}: Discount amount cannot be negative")
                } else {
                    // Validate sell price cannot go below buying price (unit cost)
                    val unitCost = inventory.product.unitCost ?: inventory.unitCost ?: BigDecimal.ZERO
                    val itemSubtotal = lineItem.unitPrice.multiply(BigDecimal(lineItem.quantity))
                    val effectiveTotal = itemSubtotal.subtract(lineItem.discountAmount)
                    val minAllowedTotal = unitCost.multiply(BigDecimal(lineItem.quantity))
                    if (effectiveTotal < minAllowedTotal) {
                        val maxAllowedDiscount = itemSubtotal.subtract(minAllowedTotal).max(BigDecimal.ZERO)
                        errors.add("Line item ${index + 1}: Selling price cannot go below buying price. Max discount allowed: ${maxAllowedDiscount}")
                    }
                }
            }
            
            // Validate taxes
            if (lineItem.taxPercentage != null) {
                if (lineItem.taxPercentage < BigDecimal.ZERO || lineItem.taxPercentage > BigDecimal(100)) {
                    errors.add("Line item ${index + 1}: Tax percentage must be between 0 and 100")
                }
            }
            
            if (lineItem.taxAmount != null && lineItem.taxAmount < BigDecimal.ZERO) {
                errors.add("Line item ${index + 1}: Tax amount cannot be negative")
            }
        }
    }

    /**
     * Validates payment information.
     * For credit sales, payments can be empty (no upfront payment).
     * For regular sales, at least one payment is required.
     */
    private fun validatePayments(
        payments: List<CreateSalePaymentRequest>, 
        isCreditSale: Boolean,
        errors: MutableList<String>
    ) {
        // Credit sales allow empty payments (no upfront payment)
        // Regular sales must have at least one payment
        if (payments.isEmpty() && !isCreditSale) {
            errors.add("Sale must have at least one payment")
            return
        }
        
        // If payments are provided, validate them
        payments.forEachIndexed { index, payment ->
            if (payment.amount <= BigDecimal.ZERO) {
                errors.add("Payment ${index + 1}: Amount must be greater than zero")
            }
            
            // Validate payment method specific rules
            when (payment.paymentMethod) {
                PaymentMethod.TILL, PaymentMethod.FAMILY_BANK, PaymentMethod.WATU_SIMU, PaymentMethod.MOGO,
                PaymentMethod.ONFON_N1, PaymentMethod.ONFON_N2, PaymentMethod.ONFON_GLEX -> {
                    if (payment.referenceNumber.isNullOrBlank()) {
                        errors.add("Payment ${index + 1}: Reference number is required for ${payment.paymentMethod}")
                    }
                }
                else -> {
                    // Cash and Credit payments don't require reference numbers
                }
            }
        }
    }

    /**
     * Validates totals and calculations.
     * Note: Exact total calculation (with tax and discounts) is complex and done in SalesService.
     * This validation only checks basic sanity - precise validation happens during sale creation.
     * For credit sales, payment total can be less than or equal to calculated total.
     * For regular sales, payment total must match calculated total (validated precisely in SalesService).
     */
    private fun validateTotals(request: CreateSaleRequest, errors: MutableList<String>) {
        // Calculate basic subtotal (before tax and discounts)
        val basicSubtotal = request.lineItems.sumOf { 
            it.unitPrice.multiply(BigDecimal(it.quantity)) 
        }
        
        // Calculate total discounts at line item level
        val totalLineItemDiscounts = request.lineItems.sumOf {
            it.discountAmount ?: BigDecimal.ZERO
        }
        
        // For validation, we'll do a rough check
        // Actual precise calculation (with tax and discounts) happens in SalesService
        // This is just a sanity check to catch obvious errors
        val estimatedTotal = basicSubtotal
            .subtract(totalLineItemDiscounts) // Discounts applied at line item level
            .max(BigDecimal.ZERO) // Ensure non-negative
        
        val totalPayments = request.payments.sumOf { it.amount }
        val isCreditSale = request.isCreditSale ?: false
        
        if (isCreditSale) {
            // Credit sales: payment can be 0 to total amount (exact validation in SalesService)
            if (totalPayments < BigDecimal.ZERO) {
                errors.add("Payment total cannot be negative")
            }
            // Rough check - exact validation happens in SalesService
            if (totalPayments > estimatedTotal.multiply(BigDecimal("1.5"))) { // Allow 50% buffer for tax
                errors.add("Payment total ($totalPayments) seems too high relative to item subtotal")
            }
        } else {
            // Regular sales: payment should be close to estimated total
            // Exact match validation happens in SalesService where tax is properly calculated
            if (totalPayments < BigDecimal.ZERO) {
                errors.add("Payment total cannot be negative")
            }
            // Very rough check - allow some variance for tax calculations
            if (totalPayments > estimatedTotal.multiply(BigDecimal("2.0"))) {
                errors.add("Payment total ($totalPayments) seems too high relative to item subtotal")
            }
        }
    }

    /**
     * Validates business rules and policies.
     */
    private fun validateBusinessRules(
        request: CreateSaleRequest,
        errors: MutableList<String>,
        warnings: MutableList<String>
    ) {
        // Check for minimum sale amount
        // For credit sales, total amount is based on line items, not payments
        val isCreditSale = request.isCreditSale ?: false
        val totalAmount = if (isCreditSale) {
            request.lineItems.sumOf { it.unitPrice.multiply(BigDecimal(it.quantity)) }
                .add(request.taxAmount ?: BigDecimal.ZERO)
                .subtract(request.discountAmount ?: BigDecimal.ZERO)
        } else {
            request.payments.sumOf { it.amount }
        }
        
        if (totalAmount < BigDecimal("0.01")) {
            errors.add("Sale amount must be at least $0.01")
        }
        
        // Check for maximum sale amount (if configured)
        // TODO: Add configuration for maximum sale amount
        
        // Check for duplicate products in line items
        val productIds = request.lineItems.map { it.productId }
        val duplicateProducts = productIds.groupingBy { it }.eachCount().filter { it.value > 1 }
        if (duplicateProducts.isNotEmpty()) {
            warnings.add("Duplicate products found in line items: ${duplicateProducts.keys}")
        }
        
        // Check for mixed payment methods
        val paymentMethods = request.payments.map { it.paymentMethod }.distinct()
        if (paymentMethods.size > 1) {
            warnings.add("Multiple payment methods detected: ${paymentMethods.joinToString(", ")}")
        }
    }
}

// ==================== Validation Result Classes ====================

/**
 * Result of sale request validation.
 */
data class ValidationResult(
    val isValid: Boolean,
    val errors: List<String>,
    val warnings: List<String>
)

/**
 * Result of stock availability validation.
 */
data class StockValidationResult(
    val productId: UUID,
    val productName: String,
    val requestedQuantity: Int,
    val availableQuantity: Int,
    val isAvailable: Boolean,
    val inventoryItems: List<InventoryAvailability>
)

/**
 * Information about available inventory items.
 */
data class InventoryAvailability(
    val inventoryId: UUID,
    val batchNumber: String?,
    val expiryDate: java.time.LocalDate?,
    val availableQuantity: Int,
    val unitCost: BigDecimal?,
    val sellingPrice: BigDecimal?,
    val isExpired: Boolean,
    val isExpiringSoon: Boolean
)

/**
 * Result of prescription validation.
 */
data class PrescriptionValidationResult(
    val productId: UUID,
    val productName: String,
    val requiresPrescription: Boolean,
    val isValid: Boolean,
    val message: String
)

/**
 * Result of customer validation.
 */
data class CustomerValidationResult(
    val customerId: UUID,
    val customerName: String,
    val isActive: Boolean,
    val isValid: Boolean,
    val message: String
)

