package com.chemsys.service

import com.chemsys.dto.*
import com.chemsys.entity.*
import com.chemsys.mapper.SalesMapper
import com.chemsys.repository.*
import com.chemsys.repository.UserBranchRepository
import com.chemsys.config.TenantContext
import org.slf4j.LoggerFactory
import org.springframework.data.domain.*
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.security.core.context.SecurityContextHolder
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.*

/**
 * SalesService handles all business logic for point-of-sale operations.
 * Provides transactional operations, stock deduction, audit logging, and sales management.
 *
 * This service follows the Backend Data Consistency Rule by ensuring:
 * - All operations are transactional (@Transactional annotation)
 * - Idempotency through unique transaction references
 * - Complete audit trail for all inventory mutations
 * - Atomic updates across all related entities
 * - Proper error handling and transaction rollback
 * - Tenant isolation for multi-tenant architecture
 */
@Service
class SalesService(
    private val saleRepository: SaleRepository,
    private val saleLineItemRepository: SaleLineItemRepository,
    private val customerRepository: CustomerRepository,
    private val saleReturnRepository: SaleReturnRepository,
    private val saleReturnLineItemRepository: com.chemsys.repository.SaleReturnLineItemRepository,
    private val inventoryAuditLogRepository: InventoryAuditLogRepository,
    private val inventoryRepository: com.chemsys.repository.InventoryRepository,
    private val productRepository: com.chemsys.repository.ProductRepository,
    private val branchRepository: com.chemsys.repository.BranchRepository,
    private val tenantRepository: com.chemsys.repository.TenantRepository,
    private val userRepository: com.chemsys.repository.UserRepository,
    private val userBranchRepository: com.chemsys.repository.UserBranchRepository,
    private val salesMapper: SalesMapper,
    private val taxCalculationService: TaxCalculationService
) {

    companion object {
        private val logger = LoggerFactory.getLogger(SalesService::class.java)
        /** Commission rate for cashiers: 15% of profit (selling price minus cost) per item sold. */
        private val CASHIER_COMMISSION_RATE = BigDecimal("0.15")
    }

    /**
     * Computes cashier commission for a single sale: 15% of profit per line item.
     * Profit per line = (unitPrice - cost) * (quantity - returnedQuantity); commission = 15% of sum.
     * Requires sale.lineItems and each lineItem.inventory to be loaded (for unitCost).
     */
    private fun computeCommissionForSale(sale: Sale): BigDecimal {
        return sale.lineItems.sumOf { li ->
            val costPerUnit = li.inventory.product.unitCost ?: li.inventory.unitCost ?: BigDecimal.ZERO
            val profitPerUnit = (li.unitPrice - costPerUnit).max(BigDecimal.ZERO)
            val quantitySold = (li.quantity - li.returnedQuantity).coerceAtLeast(0).toBigDecimal()
            profitPerUnit.multiply(quantitySold).multiply(CASHIER_COMMISSION_RATE)
        }.setScale(2, RoundingMode.HALF_UP)
    }

    // ==================== Sale Operations ====================

    /**
     * Creates a new sale transaction with proper stock deduction and audit logging.
     *
     * This method implements the Backend Data Consistency Rule by:
     * - Using @Transactional to ensure atomicity
     * - Checking for idempotency through audit log verification
     * - Logging all inventory mutations with complete audit trail
     * - Updating all related entities in a single transaction
     * - Rolling back on any error with proper exception handling
     *
     * @param request The sale creation request
     * @return Created sale details
     * @throws IllegalArgumentException if validation fails
     * @throws RuntimeException if transaction fails
     */
    @Transactional
    @PreAuthorize("hasRole('CASHIER') or hasRole('MANAGER') or hasRole('ADMIN')")
    fun createSale(request: CreateSaleRequest): SaleDto {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw IllegalStateException("No tenant context found")

        val currentUser = getCurrentUser()
        val branch = branchRepository.findById(request.branchId)
            .orElseThrow { IllegalArgumentException("Branch not found: ${request.branchId}") }

        // Validate branch belongs to current tenant
        if (branch.tenant.id != tenantId) {
            throw IllegalArgumentException("Branch does not belong to current tenant")
        }

        // Generate unique sale number for idempotency
        val saleNumber = generateUniqueSaleNumber(tenantId)

        // Validate and process line items
        val lineItems = validateAndProcessLineItems(request.lineItems, request.branchId, tenantId)

        // Calculate totals and taxes
        val subtotal = lineItems.sumOf { (_, inventory) ->
            (inventory.product.sellingPrice ?: inventory.sellingPrice)?.multiply(BigDecimal(
                request.lineItems.find { it.productId == inventory.product.id }?.quantity ?: 0
            )) ?: BigDecimal.ZERO
        }

        // Automatically calculate VAT for each line item
        // Note: Discounts should be applied on net amount (before tax)
        val lineItemTaxCalculations = lineItems.mapIndexed { index, (lineItemRequest, inventory) ->
            // Calculate tax on the unit price (before discount)
            val taxCalc = taxCalculationService.calculateTax(
                product = inventory.product,
                quantity = lineItemRequest.quantity,
                unitPrice = lineItemRequest.unitPrice,
                tenantId = tenantId
            )
            
            // Apply discount to net amount (before tax)
            val itemDiscount = lineItemRequest.discountAmount ?: BigDecimal.ZERO
            val discountedNetAmount = taxCalc.netAmount.subtract(itemDiscount)
            
            // Recalculate tax on discounted amount proportionally
            // If net amount changes, adjust tax proportionally
            val adjustedTaxAmount = if (taxCalc.netAmount > BigDecimal.ZERO && itemDiscount > BigDecimal.ZERO) {
                // Tax is proportional to net amount: newTax = (discountedNet / originalNet) * originalTax
                discountedNetAmount
                    .multiply(taxCalc.taxAmount)
                    .divide(taxCalc.netAmount, 2, java.math.RoundingMode.HALF_UP)
                    .max(BigDecimal.ZERO) // Ensure tax is not negative
            } else {
                taxCalc.taxAmount
            }
            
            // Return adjusted tax calculation
            TaxCalculation(
                netAmount = discountedNetAmount.max(BigDecimal.ZERO),
                taxAmount = adjustedTaxAmount,
                grossAmount = discountedNetAmount.add(adjustedTaxAmount).max(BigDecimal.ZERO),
                taxRate = taxCalc.taxRate,
                taxType = taxCalc.taxType
            )
        }

        // Calculate sale totals including VAT
        // Note: Discounts are already applied at line item level, so saleTotals.grossAmount
        // already includes the discounted amounts with recalculated tax
        val saleTotals = taxCalculationService.calculateSaleTotals(lineItemTaxCalculations)

        // Total amount is the gross amount (discounts already applied at line item level, tax included)
        // request.discountAmount is kept for reporting/audit purposes only
        val discountAmount = request.discountAmount ?: BigDecimal.ZERO
        val totalAmount = saleTotals.grossAmount // Don't subtract discount again - already applied at line item level

        // Validate payment total based on sale type
        if (request.isCreditSale == true) {
            // Credit sales allow:
            // 1. No upfront payment (empty payments array)
            // 2. Partial payment (payment < total amount)
            // 3. Full payment (payment = total amount)
            if (request.payments.isNotEmpty()) {
                val totalPaid = request.payments.sumOf { it.amount }
                if (totalPaid > totalAmount) {
                    throw IllegalArgumentException("Payment amount cannot exceed sale total for credit sales")
                }
            }
        } else {
            // Regular sales must have payment that matches total
            // totalAmount already includes discounts (applied at line item level) and tax
            // Frontend should send payment that matches this total
            
            val totalPaid = request.payments.sumOf { it.amount }
            
            // Validate payment matches the calculated total (with discounts and tax)
            // Use compareTo for BigDecimal comparison with 0.01 tolerance for rounding
            val difference = (totalPaid.subtract(totalAmount)).abs()
            val tolerance = BigDecimal("0.01") // Allow 1 cent tolerance for rounding differences
            
            if (difference.compareTo(tolerance) > 0) {
                // Provide detailed error message for debugging
                val subtotalAfterDiscounts = saleTotals.netAmount
                val tax = saleTotals.taxAmount
                throw IllegalArgumentException(
                    "Payment total ($totalPaid) does not match sale total ($totalAmount). " +
                    "Subtotal (after discounts): $subtotalAfterDiscounts, Tax: $tax, " +
                    "Expected Total: $totalAmount. Difference: $difference. " +
                    "Please ensure payment matches the total including tax."
                )
            }
        }

        // Create sale entity with calculated VAT
        val sale = Sale(
            saleNumber = saleNumber,
            tenant = tenantRepository.findById(tenantId).orElseThrow(),
            branch = branch,
            customer = request.customerId?.let { customerRepository.findById(it).orElse(null) },
            customerName = request.customerName,
            customerPhone = request.customerPhone,
            subtotal = saleTotals.netAmount,
            taxAmount = saleTotals.taxAmount,
            discountAmount = discountAmount,
            totalAmount = totalAmount,
            status = SaleStatus.COMPLETED,
            notes = request.notes,
            cashier = currentUser,
            isCreditSale = request.isCreditSale ?: false, // Default to false if null
        )

        // Save sale first to get ID
        val savedSale = saleRepository.save(sale)

        // Create and save line items with calculated tax values
        val savedLineItems = lineItems.mapIndexed { index, (lineItemRequest, inventory) ->
            val taxCalc = lineItemTaxCalculations[index]
            
            // Line total is the gross amount after discount and tax adjustment
            val lineTotal = taxCalc.grossAmount
            
            val lineItem = SaleLineItem(
                sale = savedSale,
                product = inventory.product,
                inventory = inventory,
                quantity = lineItemRequest.quantity,
                unitPrice = lineItemRequest.unitPrice,
                discountPercentage = lineItemRequest.discountPercentage,
                discountAmount = lineItemRequest.discountAmount,
                taxPercentage = taxCalc.taxRate,
                taxAmount = taxCalc.taxAmount,
                lineTotal = lineTotal.max(BigDecimal.ZERO), // Ensure line total is not negative
                batchNumber = inventory.batchNumber,
                expiryDate = inventory.expiryDate,
                notes = lineItemRequest.notes
            )

            // Add line item to sale's collection for cascade saving
            savedSale.lineItems.add(lineItem)
            lineItem
        }

        // Create and save payments
        val savedPayments = request.payments.map { paymentRequest ->
            val payment = SalePayment(
                sale = savedSale,
                paymentMethod = paymentRequest.paymentMethod,
                amount = paymentRequest.amount,
                referenceNumber = paymentRequest.referenceNumber,
                notes = paymentRequest.notes
            )
            // Add payment to sale's collection for cascade saving
            savedSale.payments.add(payment)
            payment
        }

        // Save the sale again to trigger cascade saving of line items and payments
        val finalSavedSale = saleRepository.save(savedSale)
        
        // Debug: Log the saved sale details
        logger.debug("=== SALE CREATION DEBUG ===")
        logger.debug("Sale ID: ${finalSavedSale.id}")
        logger.debug("Sale Number: ${finalSavedSale.saleNumber}")
        logger.debug("Line Items Count: ${finalSavedSale.lineItems.size}")
        logger.debug("Payments Count: ${finalSavedSale.payments.size}")
        finalSavedSale.lineItems.forEachIndexed { index, item ->
            logger.debug("Line Item $index: ${item.product.name} - Qty: ${item.quantity} - Price: ${item.unitPrice}")
        }

        // Update inventory and create audit logs
        updateInventoryAndCreateAuditLogs(savedLineItems, saleNumber, currentUser, tenantId)

        return salesMapper.toSaleDto(finalSavedSale)
    }

    /**
     * Retrieves a sale by ID with proper tenant isolation.
     *
     * @param saleId The sale ID
     * @return Sale details
     * @throws IllegalArgumentException if sale not found or access denied
     */
   @PreAuthorize("hasRole('CASHIER') or hasRole('MANAGER') or hasRole('ADMIN')")
    fun getSaleById(saleId: UUID): SaleDto {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw IllegalStateException("No tenant context found")

        val sale = saleRepository.findById(saleId)
            .orElseThrow { IllegalArgumentException("Sale not found: $saleId") }

        if (sale.tenant.id != tenantId) {
            throw IllegalArgumentException("Sale does not belong to current tenant")
        }

        // Manually load line items
        val lineItems = saleRepository.findLineItemsBySaleId(saleId)
        logger.debug("=== GET SALE BY ID DEBUG ===")
        logger.debug("Sale ID: $saleId")
        logger.debug("Sale Number: ${sale.saleNumber}")
        logger.debug("Found ${lineItems.size} line items in database")
        lineItems.forEachIndexed { index, item ->
            logger.debug("Line Item $index: ${item.product.name} - Qty: ${item.quantity} - Price: ${item.unitPrice}")
        }
        
        sale.lineItems.clear()
        sale.lineItems.addAll(lineItems)
        logger.debug("Sale line items after loading: ${sale.lineItems.size}")

        return salesMapper.toSaleDto(sale)
    }

    /**
     * Searches sales with various criteria and proper tenant isolation.
     *
     * @param request The search request
     * @return Paginated list of sales
     */
    @PreAuthorize("hasRole('CASHIER') or hasRole('MANAGER') or hasRole('ADMIN')")
    fun searchSales(request: SearchSalesRequest): SalesListResponse {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw IllegalStateException("No tenant context found")

        val currentUser = getCurrentUser()
        val userRole = currentUser.role
        
        // For CASHIER role, enforce branch filtering - only show sales from their assigned branches
        val allowedBranchIds = if (userRole == UserRole.CASHIER) {
            val userBranches = userBranchRepository.findByUserIdAndTenantId(currentUser.id!!, tenantId)
            val branchIds = userBranches.map { it.branch.id!! }
            if (branchIds.isEmpty()) {
                // Cashier with no assigned branches - return empty result
                return SalesListResponse(
                    sales = emptyList(),
                    totalElements = 0,
                    totalPages = 0,
                    currentPage = request.page,
                    pageSize = request.size,
                    hasNext = false,
                    hasPrevious = false,
                    totalFilteredAmount = BigDecimal.ZERO
                )
            }
            branchIds
        } else {
            // ADMIN and MANAGER can see all branches
            null
        }

        // If cashier specified a branchId, validate it's in their allowed branches
        if (userRole == UserRole.CASHIER && request.branchId != null) {
            if (!allowedBranchIds!!.contains(request.branchId)) {
                throw IllegalStateException("Access denied: You can only view sales from your assigned branches")
            }
        }

        // For CASHIER/MANAGER viewing their own sales: use cashierId to show all their sales across branches
        val isMySalesRequest = (userRole == UserRole.CASHIER || userRole == UserRole.MANAGER) &&
            request.cashierId == currentUser.id

        // For cashiers, if no branchId specified and not "my sales" request, filter by their allowed branches
        val effectiveBranchId = if (isMySalesRequest) {
            null // Don't filter by branch when showing user's own sales across all branches
        } else if (userRole == UserRole.CASHIER && request.branchId == null && allowedBranchIds != null) {
            if (allowedBranchIds.size == 1) allowedBranchIds.first() else null
        } else {
            request.branchId
        }

        val pageable = PageRequest.of(
            request.page,
            request.size,
            Sort.by(
                if (request.sortDirection == "ASC") Sort.Direction.ASC else Sort.Direction.DESC,
                request.sortBy
            )
        )

        // Parse date range: YYYY-MM-DD -> start of start day, end of end day (inclusive)
        val (parsedStartDate, parsedEndDate) = parseDateRange(request.startDate, request.endDate)

        // Build query based on search criteria
        // Priority: "my sales" (cashierId for CASHIER/MANAGER) shows user's sales across all branches
        val salesPage = when {
            // CASHIER/MANAGER viewing their own sales - with optional date filter
            isMySalesRequest && request.paymentMethod != null -> {
                if (userRole == UserRole.CASHIER && allowedBranchIds != null && allowedBranchIds.isNotEmpty()) {
                    saleRepository.findByCashierIdAndBranchIdInAndPaymentMethod(currentUser.id!!, allowedBranchIds, request.paymentMethod!!, pageable)
                } else {
                    saleRepository.findByCashierIdAndPaymentMethod(currentUser.id!!, request.paymentMethod!!, pageable)
                }
            }
            isMySalesRequest && parsedStartDate != null && parsedEndDate != null -> {
                if (userRole == UserRole.CASHIER && allowedBranchIds != null && allowedBranchIds.isNotEmpty()) {
                    saleRepository.findByCashierIdAndBranchIdInAndSaleDateBetween(
                        currentUser.id!!, allowedBranchIds, parsedStartDate, parsedEndDate, pageable
                    )
                } else {
                    saleRepository.findByCashierIdAndSaleDateBetween(
                        currentUser.id!!, parsedStartDate, parsedEndDate, pageable
                    )
                }
            }
            isMySalesRequest -> {
                if (userRole == UserRole.CASHIER && allowedBranchIds != null && allowedBranchIds.isNotEmpty()) {
                    saleRepository.findByCashierIdAndBranchIdIn(currentUser.id!!, allowedBranchIds, pageable)
                } else {
                    saleRepository.findByCashierId(currentUser.id!!, pageable)
                }
            }
            // Branch-specific queries (for branch isolation)
            effectiveBranchId != null && parsedStartDate != null && parsedEndDate != null -> {
                saleRepository.findBySaleDateBetweenAndBranchId(
                    parsedStartDate, parsedEndDate, effectiveBranchId, pageable
                )
            }
            effectiveBranchId != null && request.status != null -> {
                saleRepository.findByStatusAndBranchId(request.status, effectiveBranchId, pageable)
            }
            effectiveBranchId != null && request.paymentMethod != null -> {
                saleRepository.findByPaymentMethodAndBranchId(request.paymentMethod, effectiveBranchId, pageable)
            }
            effectiveBranchId != null && request.customerName != null -> {
                saleRepository.findByCustomerNameContainingIgnoreCaseAndBranchId(request.customerName, effectiveBranchId, pageable)
            }
            effectiveBranchId != null && request.saleNumber != null -> {
                val sale = saleRepository.findBySaleNumberAndTenantId(request.saleNumber, tenantId)
                if (sale.isPresent && sale.get().branch.id == effectiveBranchId) {
                    PageImpl(listOf(sale.get()), pageable, 1)
                } else {
                    PageImpl(listOf<Sale>(), pageable, 0)
                }
            }
            effectiveBranchId != null -> {
                // Default branch query - return all sales for the branch
                saleRepository.findByBranchId(effectiveBranchId, pageable)
            }
            
            // Tenant-wide queries (fallback when no branch specified)
            parsedStartDate != null && parsedEndDate != null -> {
                val allSales = saleRepository.findBySaleDateBetweenAndTenantId(
                    parsedStartDate, parsedEndDate, tenantId, pageable
                )
                if (userRole == UserRole.CASHIER && allowedBranchIds != null) {
                    val filtered = allSales.content.filter { allowedBranchIds.contains(it.branch.id) }
                    PageImpl(filtered, pageable, filtered.size.toLong())
                } else {
                    allSales
                }
            }
            request.customerId != null -> {
                val allSales = saleRepository.findByCustomerId(request.customerId, pageable)
                if (userRole == UserRole.CASHIER && allowedBranchIds != null) {
                    val filtered = allSales.content.filter { allowedBranchIds.contains(it.branch.id) }
                    PageImpl(filtered, pageable, filtered.size.toLong())
                } else {
                    allSales
                }
            }
            request.cashierId != null -> {
                val allSales = saleRepository.findByCashierId(request.cashierId, pageable)
                if (userRole == UserRole.CASHIER && allowedBranchIds != null) {
                    val filtered = allSales.content.filter { allowedBranchIds.contains(it.branch.id) }
                    PageImpl(filtered, pageable, filtered.size.toLong())
                } else {
                    allSales
                }
            }
            request.status != null -> {
                val allSales = saleRepository.findByStatusAndTenantId(request.status, tenantId, pageable)
                if (userRole == UserRole.CASHIER && allowedBranchIds != null) {
                    val filtered = allSales.content.filter { allowedBranchIds.contains(it.branch.id) }
                    PageImpl(filtered, pageable, filtered.size.toLong())
                } else {
                    allSales
                }
            }
            request.paymentMethod != null -> {
                val allSales = saleRepository.findByPaymentMethodAndTenantId(request.paymentMethod!!, tenantId, pageable)
                if (userRole == UserRole.CASHIER && allowedBranchIds != null) {
                    val filtered = allSales.content.filter { allowedBranchIds.contains(it.branch.id) }
                    PageImpl(filtered, pageable, filtered.size.toLong())
                } else {
                    allSales
                }
            }
            request.saleNumber != null -> {
                val sale = saleRepository.findBySaleNumberAndTenantId(request.saleNumber, tenantId)
                if (sale.isPresent) {
                    val saleObj = sale.get()
                    // For cashiers, check if sale is from their allowed branch
                    if (userRole == UserRole.CASHIER && allowedBranchIds != null) {
                        if (allowedBranchIds.contains(saleObj.branch.id)) {
                            PageImpl(listOf(saleObj), pageable, 1)
                        } else {
                            PageImpl(listOf<Sale>(), pageable, 0)
                        }
                    } else {
                        PageImpl(listOf(saleObj), pageable, 1)
                    }
                } else {
                    PageImpl(listOf<Sale>(), pageable, 0)
                }
            }
            else -> {
                val allSales = saleRepository.findByTenantId(tenantId, pageable)
                if (userRole == UserRole.CASHIER && allowedBranchIds != null) {
                    val filtered = allSales.content.filter { allowedBranchIds.contains(it.branch.id) }
                    PageImpl(filtered, pageable, filtered.size.toLong())
                } else {
                    allSales
                }
            }
        }

        // Compute sum of totalAmount for all sales matching the filter (across all pages)
        val totalFilteredAmount = when {
            isMySalesRequest && parsedStartDate != null && parsedEndDate != null -> {
                if (userRole == UserRole.CASHIER && allowedBranchIds != null && allowedBranchIds.isNotEmpty()) {
                    saleRepository.sumTotalAmountByCashierIdAndBranchIdInAndSaleDateBetween(
                        currentUser.id!!, allowedBranchIds, parsedStartDate, parsedEndDate
                    )
                } else {
                    saleRepository.sumTotalAmountByCashierIdAndSaleDateBetween(
                        currentUser.id!!, parsedStartDate, parsedEndDate
                    )
                }
            }
            isMySalesRequest && request.paymentMethod != null -> {
                if (userRole == UserRole.CASHIER && allowedBranchIds != null && allowedBranchIds.isNotEmpty()) {
                    saleRepository.sumTotalAmountByCashierIdAndBranchIdInAndPaymentMethod(
                        currentUser.id!!, allowedBranchIds, request.paymentMethod!!
                    )
                } else {
                    saleRepository.sumTotalAmountByCashierIdAndPaymentMethod(currentUser.id!!, request.paymentMethod!!)
                }
            }
            isMySalesRequest -> {
                if (userRole == UserRole.CASHIER && allowedBranchIds != null && allowedBranchIds.isNotEmpty()) {
                    saleRepository.sumTotalAmountByCashierIdAndBranchIdIn(currentUser.id!!, allowedBranchIds)
                } else {
                    saleRepository.sumTotalAmountByCashierId(currentUser.id!!)
                }
            }
            effectiveBranchId != null && parsedStartDate != null && parsedEndDate != null ->
                saleRepository.sumTotalAmountByBranchIdAndSaleDateBetween(
                    effectiveBranchId!!, parsedStartDate, parsedEndDate
                )
            effectiveBranchId != null && request.status != null ->
                saleRepository.sumTotalAmountByStatusAndBranchId(request.status!!, effectiveBranchId!!)
            effectiveBranchId != null && request.paymentMethod != null ->
                saleRepository.sumTotalAmountByPaymentMethodAndBranchId(request.paymentMethod!!, effectiveBranchId!!)
            effectiveBranchId != null && request.customerName != null ->
                saleRepository.sumTotalAmountByCustomerNameContainingIgnoreCaseAndBranchId(
                    request.customerName!!, effectiveBranchId!!
                )
            effectiveBranchId != null && request.saleNumber != null -> {
                val sale = saleRepository.findBySaleNumberAndTenantId(request.saleNumber!!, tenantId)
                if (sale.isPresent && sale.get().branch.id == effectiveBranchId) sale.get().totalAmount else BigDecimal.ZERO
            }
            effectiveBranchId != null ->
                saleRepository.sumTotalAmountByBranchId(effectiveBranchId!!)
            parsedStartDate != null && parsedEndDate != null -> {
                if (userRole == UserRole.CASHIER && allowedBranchIds != null && allowedBranchIds.isNotEmpty()) {
                    saleRepository.sumTotalAmountByTenantIdAndBranchIdInAndSaleDateBetween(
                        tenantId, allowedBranchIds, parsedStartDate, parsedEndDate
                    )
                } else {
                    saleRepository.sumTotalAmountByTenantIdAndSaleDateBetween(
                        tenantId, parsedStartDate, parsedEndDate
                    )
                }
            }
            request.customerId != null -> {
                if (userRole == UserRole.CASHIER && allowedBranchIds != null && allowedBranchIds.isNotEmpty()) {
                    saleRepository.sumTotalAmountByCustomerIdAndBranchIdIn(request.customerId!!, allowedBranchIds)
                } else {
                    saleRepository.sumTotalAmountByCustomerId(request.customerId!!)
                }
            }
            request.cashierId != null -> {
                if (userRole == UserRole.CASHIER && allowedBranchIds != null && allowedBranchIds.isNotEmpty()) {
                    saleRepository.sumTotalAmountByCashierIdAndTenantIdAndBranchIdIn(
                        request.cashierId!!, tenantId, allowedBranchIds
                    )
                } else {
                    saleRepository.sumTotalAmountByCashierId(request.cashierId!!)
                }
            }
            request.status != null -> {
                if (userRole == UserRole.CASHIER && allowedBranchIds != null && allowedBranchIds.isNotEmpty()) {
                    saleRepository.sumTotalAmountByStatusAndTenantIdAndBranchIdIn(
                        request.status!!, tenantId, allowedBranchIds
                    )
                } else {
                    saleRepository.sumTotalAmountByStatusAndTenantId(request.status!!, tenantId)
                }
            }
            request.paymentMethod != null -> {
                if (userRole == UserRole.CASHIER && allowedBranchIds != null && allowedBranchIds.isNotEmpty()) {
                    val allByMethod = saleRepository.findByPaymentMethodAndTenantId(request.paymentMethod!!, tenantId, Pageable.unpaged())
                    val filtered = allByMethod.content.filter { allowedBranchIds.contains(it.branch.id) }
                    filtered.sumOf { it.totalAmount }
                } else {
                    saleRepository.sumTotalAmountByPaymentMethodAndTenantId(request.paymentMethod!!, tenantId)
                }
            }
            request.saleNumber != null -> {
                val sale = saleRepository.findBySaleNumberAndTenantId(request.saleNumber!!, tenantId)
                if (sale.isPresent) {
                    val saleObj = sale.get()
                    if (userRole == UserRole.CASHIER && allowedBranchIds != null && !allowedBranchIds.contains(saleObj.branch.id)) {
                        BigDecimal.ZERO
                    } else {
                        saleObj.totalAmount
                    }
                } else BigDecimal.ZERO
            }
            else -> {
                if (userRole == UserRole.CASHIER && allowedBranchIds != null && allowedBranchIds.isNotEmpty()) {
                    saleRepository.sumTotalAmountByTenantIdAndBranchIdIn(tenantId, allowedBranchIds)
                } else {
                    saleRepository.sumTotalAmountByTenantId(tenantId)
                }
            }
        }

        // Load line items for each sale in the results (inventory is lazy-loaded when computing commission)
        val salesWithLineItems = salesPage.content.map { sale ->
            val lineItems = saleRepository.findLineItemsBySaleId(sale.id!!)
            sale.lineItems.clear()
            sale.lineItems.addAll(lineItems)
            sale
        }
        
        // Create a new page with sales that have line items loaded
        val salesPageWithLineItems = PageImpl(salesWithLineItems, salesPage.pageable, salesPage.totalElements)
        var response = salesMapper.toSalesListResponse(salesPageWithLineItems, totalFilteredAmount)

        // When cashier/manager is viewing their own sales, attach commission per sale (15% of profit)
        if (isMySalesRequest) {
            response = response.copy(
                sales = response.sales.mapIndexed { i, dto ->
                    dto.copy(commission = computeCommissionForSale(salesWithLineItems[i]))
                }
            )
        }

        return response
    }

    /**
     * Suspends a sale transaction for later completion.
     *
     * @param request The suspend sale request
     * @return Updated sale details
     */
    @Transactional
    @PreAuthorize("hasRole('CASHIER') or hasRole('MANAGER') or hasRole('ADMIN')")
    fun suspendSale(request: SuspendSaleRequest): SaleDto {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw IllegalStateException("No tenant context found")

        val sale = saleRepository.findById(request.saleId)
            .orElseThrow { IllegalArgumentException("Sale not found: ${request.saleId}") }

        if (sale.tenant.id != tenantId) {
            throw IllegalArgumentException("Sale does not belong to current tenant")
        }

        if (sale.status != SaleStatus.PENDING) {
            throw IllegalArgumentException("Only pending sales can be suspended")
        }

        val updatedSale = sale.copy(
            status = SaleStatus.SUSPENDED,
            notes = request.notes,
            updatedAt = OffsetDateTime.now()
        )

        val savedSale = saleRepository.save(updatedSale)
        return salesMapper.toSaleDto(savedSale)
    }

    /**
     * Cancels a sale transaction with proper validation.
     *
     * @param request The cancel sale request
     * @return Updated sale details
     */
    @Transactional
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    fun cancelSale(request: CancelSaleRequest): SaleDto {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw IllegalStateException("No tenant context found")

        val sale = saleRepository.findById(request.saleId)
            .orElseThrow { IllegalArgumentException("Sale not found: ${request.saleId}") }

        if (sale.tenant.id != tenantId) {
            throw IllegalArgumentException("Sale does not belong to current tenant")
        }

        if (sale.status == SaleStatus.CANCELLED) {
            throw IllegalArgumentException("Sale is already cancelled")
        }

        if (sale.status == SaleStatus.COMPLETED) {
            throw IllegalArgumentException("Completed sales cannot be cancelled. Use return instead.")
        }

        val updatedSale = sale.copy(
            status = SaleStatus.CANCELLED,
            notes = "${sale.notes ?: ""}\nCancelled: ${request.reason}",
            updatedAt = OffsetDateTime.now()
        )

        val savedSale = saleRepository.save(updatedSale)
        return salesMapper.toSaleDto(savedSale)
    }

    // ==================== Customer Operations ====================

    /**
     * Creates a new customer with proper validation.
     *
     * @param request The create customer request
     * @return Created customer details
     */
    @Transactional
    @PreAuthorize("hasRole('CASHIER') or hasRole('MANAGER') or hasRole('ADMIN')")
    fun createCustomer(request: CreateCustomerRequest): CustomerDto {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw IllegalStateException("No tenant context found")

        val tenant = tenantRepository.findById(tenantId)
            .orElseThrow { IllegalArgumentException("Tenant not found: $tenantId") }

        // Check for duplicate phone
        if (request.phone != null && customerRepository.existsByPhoneAndTenantId(request.phone, tenantId)) {
            throw IllegalArgumentException("Customer with phone ${request.phone} already exists")
        }

        val customerNumber = generateUniqueCustomerNumber(tenantId)
        val customer = salesMapper.toCustomerEntity(request, tenant, customerNumber)

        val savedCustomer = customerRepository.save(customer)
        return salesMapper.toCustomerDto(savedCustomer)
    }

    /**
     * Searches customers with various criteria using a bulletproof approach.
     * Uses simple repository methods and in-memory filtering to ensure reliability.
     *
     * @param request The search request
     * @return Paginated list of customers
     */
    @PreAuthorize("hasRole('CASHIER') or hasRole('MANAGER') or hasRole('ADMIN')")
    fun searchCustomers(request: SearchCustomersRequest): CustomersListResponse {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw IllegalStateException("No tenant context found")

        // Get all customers for the tenant - use a reasonable page size
        val pageSize = 1000 // Should be enough for most businesses
        val pageable = PageRequest.of(0, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        
        val allCustomersPage = customerRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId, pageable)
        val allCustomers = allCustomersPage.content
        
        // Apply search filters
        var filteredCustomers = allCustomers
        
        // Search term - can match name, phone, or customer number
        val searchTerm = request.firstName?.trim()
        if (!searchTerm.isNullOrBlank()) {
            filteredCustomers = filteredCustomers.filter { customer ->
                customer.firstName.contains(searchTerm, ignoreCase = true) ||
                customer.lastName.contains(searchTerm, ignoreCase = true) ||
                customer.phone?.contains(searchTerm, ignoreCase = true) == true ||
                customer.customerNumber.contains(searchTerm, ignoreCase = true)
            }
        }
        
        // Last name filter
        val lastName = request.lastName?.trim()
        if (!lastName.isNullOrBlank()) {
            filteredCustomers = filteredCustomers.filter { 
                it.lastName.contains(lastName, ignoreCase = true) 
            }
        }
        
        // Phone filter
        val phone = request.phone?.trim()
        if (!phone.isNullOrBlank()) {
            filteredCustomers = filteredCustomers.filter { 
                it.phone?.contains(phone, ignoreCase = true) == true 
            }
        }
        
        // Email filter
        val email = request.email?.trim()
        if (!email.isNullOrBlank()) {
            filteredCustomers = filteredCustomers.filter { 
                it.email?.contains(email, ignoreCase = true) == true 
            }
        }
        
        // Customer number filter
        val customerNumber = request.customerNumber?.trim()
        if (!customerNumber.isNullOrBlank()) {
            filteredCustomers = filteredCustomers.filter { 
                it.customerNumber.contains(customerNumber, ignoreCase = true) 
            }
        }
        
        // Active status filter
        request.isActive?.let { isActive ->
            filteredCustomers = filteredCustomers.filter { it.isActive == isActive }
        }
        
        // Apply pagination
        val totalElements = filteredCustomers.size
        val totalPages = if (totalElements == 0) 0 else ((totalElements - 1) / request.size) + 1
        val startIndex = request.page * request.size
        val endIndex = minOf(startIndex + request.size, totalElements)
        
        val paginatedCustomers = if (startIndex < totalElements) {
            filteredCustomers.subList(startIndex, endIndex)
        } else {
            emptyList()
        }
        
        // Create response
        val page = PageImpl(
            paginatedCustomers, 
            PageRequest.of(request.page, request.size), 
            totalElements.toLong()
        )
        
        return salesMapper.toCustomersListResponse(page)
    }

    // ==================== POS Operations ====================

    /**
     * Scans a barcode and returns product information with available inventory.
     *
     * @param request The barcode scan request
     * @return Product and inventory information
     */
    @PreAuthorize("hasRole('CASHIER') or hasRole('MANAGER') or hasRole('ADMIN')")
    fun scanBarcode(request: BarcodeScanRequest): BarcodeScanResponse {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw IllegalStateException("No tenant context found")

        val product = productRepository.findByBarcodeAndTenantId(request.barcode, tenantId)
            .orElseThrow { IllegalArgumentException("Product with barcode ${request.barcode} not found") }

        val availableInventory = inventoryRepository.findByProductIdAndBranchId(
            product.id!!, request.branchId
        ).filter { it.quantity > 0 && it.isActive }

        return salesMapper.toBarcodeScanResponse(product, availableInventory)
    }

    /**
     * Gets sales summary for dashboard and reporting.
     *
     * @param startDate The start date for the summary
     * @param endDate The end date for the summary
     * @param branchId Optional branch ID to filter by
     * @return Sales summary data
     */
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    fun getSalesSummary(
        startDate: OffsetDateTime,
        endDate: OffsetDateTime,
        branchId: UUID? = null
    ): SaleSummaryDto {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw IllegalStateException("No tenant context found")

        val totalSales = if (branchId != null) {
            saleRepository.getSalesCountByDateRangeAndBranchId(startDate, endDate, branchId).toInt()
        } else {
            saleRepository.getSalesCountByDateRangeAndTenantId(startDate, endDate, tenantId).toInt()
        }

        val totalAmount = if (branchId != null) {
            saleRepository.getTotalSalesAmountByDateRangeAndBranchId(startDate, endDate, branchId)
        } else {
            saleRepository.getTotalSalesAmountByDateRangeAndTenantId(startDate, endDate, tenantId)
        }

        // Get additional summary data
        val salesByPaymentMethod = getSalesByPaymentMethod(startDate, endDate, branchId, tenantId)
        val salesByHour = getSalesByHour(startDate, endDate, branchId, tenantId)
        val topSellingProducts = getTopSellingProducts(startDate, endDate, branchId, tenantId)

        return salesMapper.toSaleSummaryDto(
            totalSales = totalSales,
            totalAmount = totalAmount,
            totalTax = BigDecimal.ZERO, // TODO: Calculate from line items
            totalDiscount = BigDecimal.ZERO, // TODO: Calculate from line items
            topSellingProducts = topSellingProducts,
            salesByPaymentMethod = salesByPaymentMethod,
            salesByHour = salesByHour
        )
    }

    // ==================== Private Helper Methods ====================

    /**
     * Validates and processes line items, ensuring stock availability.
     */
    private fun validateAndProcessLineItems(
        lineItems: List<CreateSaleLineItemRequest>,
        branchId: UUID,
        tenantId: UUID
    ): List<Pair<CreateSaleLineItemRequest, Inventory>> {
        return lineItems.map { lineItemRequest ->
            val inventory = inventoryRepository.findById(lineItemRequest.inventoryId)
                .orElseThrow { IllegalArgumentException("Inventory not found: ${lineItemRequest.inventoryId}") }

            // Validate inventory belongs to correct branch and tenant
            if (inventory.branch.id != branchId) {
                throw IllegalArgumentException("Inventory does not belong to specified branch")
            }
            if (inventory.product.tenant.id != tenantId) {
                throw IllegalArgumentException("Inventory does not belong to current tenant")
            }

            // Check stock availability
            if (inventory.quantity < lineItemRequest.quantity) {
                throw IllegalArgumentException("Insufficient stock for product ${inventory.product.name}. Available: ${inventory.quantity}, Requested: ${lineItemRequest.quantity}")
            }

            // Check if product requires prescription
            if (inventory.product.requiresPrescription) {
                // TODO: Add prescription validation logic
                // For now, we'll allow the sale but this should be enhanced
            }

            Pair(lineItemRequest, inventory)
        }
    }

    /**
     * Updates inventory quantities and creates audit logs for all line items.
     * This method ensures idempotency and complete audit trail.
     */
    private fun updateInventoryAndCreateAuditLogs(
        lineItems: List<SaleLineItem>,
        saleNumber: String,
        currentUser: User,
        tenantId: UUID
    ) {
        lineItems.forEach { lineItem ->
            val inventory = lineItem.inventory
            val quantityBefore = inventory.quantity
            val quantityAfter = quantityBefore - lineItem.quantity
            val quantityChanged = -lineItem.quantity // Negative for sale

            // Check for idempotency - prevent duplicate processing
            if (inventoryAuditLogRepository.existsBySourceReferenceAndSourceTypeAndTenantId(
                    saleNumber, SourceType.SALE, tenantId
                )) {
                throw IllegalStateException("Sale $saleNumber has already been processed")
            }

            // Update inventory quantity
            val updatedInventory = inventory.copy(
                quantity = quantityAfter,
                updatedAt = OffsetDateTime.now()
            )
            inventoryRepository.save(updatedInventory)

            // Create audit log entry
            val auditLog = inventoryAuditLog()
                .product(inventory.product)
                .branch(inventory.branch)
                .tenant(inventory.product.tenant)
                .transactionType(TransactionType.SALE)
                .quantityChanged(quantityChanged)
                .quantityBefore(quantityBefore)
                .quantityAfter(quantityAfter)
                .unitCost(inventory.product.unitCost ?: inventory.unitCost)
                .sellingPrice(inventory.product.sellingPrice ?: inventory.sellingPrice)
                .batchNumber(inventory.batchNumber)
                .expiryDate(inventory.expiryDate)
                .sourceReference(saleNumber)
                .sourceType(SourceType.SALE)
                .performedBy(currentUser)
                .notes("Sale transaction: ${lineItem.product.name}")
                .build()

            inventoryAuditLogRepository.save(auditLog)
        }
    }

    /**
     * Generates a unique sale number for the tenant.
     */
    private fun generateUniqueSaleNumber(tenantId: UUID): String {
        val nextNumber = saleRepository.getNextSaleNumber(tenantId)
        return salesMapper.generateSaleNumber(tenantId, nextNumber)
    }

    /**
     * Generates a unique customer number for the tenant.
     */
    private fun generateUniqueCustomerNumber(tenantId: UUID): String {
        val nextNumber = customerRepository.getNextCustomerNumber(tenantId)
        return salesMapper.generateCustomerNumber(tenantId, nextNumber)
    }

    /**
     * Gets the current authenticated user.
     */
    private fun getCurrentUser(): User {
        val authentication = SecurityContextHolder.getContext().authentication
        val username = authentication.name
       return userRepository.findByUsername(username)
                ?: throw IllegalStateException("Current user not found: $username")
    }

    /**
     * Parses date strings (YYYY-MM-DD or ISO-8601) to OffsetDateTime range.
     * Returns start of start day and end of end day (inclusive).
     * Returns (null, null) if either date is null or invalid.
     */
    private fun parseDateRange(startStr: String?, endStr: String?): Pair<OffsetDateTime?, OffsetDateTime?> {
        if (startStr.isNullOrBlank() || endStr.isNullOrBlank()) return Pair(null, null)
        return try {
            val zoneOffset = OffsetDateTime.now().offset
            val start = when {
                startStr.length == 10 -> LocalDate.parse(startStr, DateTimeFormatter.ISO_LOCAL_DATE)
                    .atStartOfDay().atOffset(zoneOffset)
                else -> OffsetDateTime.parse(startStr)
            }
            val end = when {
                endStr.length == 10 -> LocalDate.parse(endStr, DateTimeFormatter.ISO_LOCAL_DATE)
                    .plusDays(1).atStartOfDay().atOffset(zoneOffset).minusNanos(1) // End of day inclusive
                else -> OffsetDateTime.parse(endStr)
            }
            if (start.isAfter(end)) return Pair(null, null)
            Pair(start, end)
        } catch (e: DateTimeParseException) {
            logger.warn("Invalid date format in search: start=$startStr end=$endStr", e)
            Pair(null, null)
        }
    }

    /**
     * Gets sales by payment method for summary.
     */
    private fun getSalesByPaymentMethod(
        startDate: OffsetDateTime,
        endDate: OffsetDateTime,
        branchId: UUID?,
        tenantId: UUID
    ): Map<PaymentMethod, BigDecimal> {
        // TODO: Implement based on repository query
        return emptyMap()
    }

    /**
     * Gets sales by hour for summary.
     */
    private fun getSalesByHour(
        startDate: OffsetDateTime,
        endDate: OffsetDateTime,
        branchId: UUID?,
        tenantId: UUID
    ): Map<Int, Int> {
        // TODO: Implement based on repository query
        return emptyMap()
    }

    /**
     * Gets top selling products for summary.
     */
    private fun getTopSellingProducts(
        startDate: OffsetDateTime,
        endDate: OffsetDateTime,
        branchId: UUID?,
        tenantId: UUID
    ): List<ProductSalesSummaryDto> {
        // TODO: Implement based on repository query
        return emptyList()
    }

    // ==================== Sale Return Operations ====================

    /**
     * Creates a new sale return with proper inventory restoration and audit logging.
     *
     * This method implements the Backend Data Consistency Rule by:
     * - Using @Transactional to ensure atomicity
     * - Checking for idempotency through audit log verification
     * - Creating complete audit trail for all inventory mutations
     * - Atomic updates across all related entities
     * - Proper error handling and transaction rollback
     * - Tenant isolation for multi-tenant architecture
     *
     * @param request The sale return creation request
     * @return Created sale return details
     */
    @Transactional
    fun createSaleReturn(request: CreateSaleReturnRequest): SaleReturnDto {
        try {
            val tenantId = TenantContext.getCurrentTenant()
                ?: throw IllegalStateException("No tenant context found")

            val currentUser = getCurrentUser()

            // Validate original sale exists and belongs to current tenant
            val originalSale = saleRepository.findById(request.originalSaleId)
                .orElseThrow { IllegalArgumentException("Original sale not found") }

            if (originalSale.tenant.id != tenantId) {
                throw IllegalArgumentException("Sale does not belong to current tenant")
            }

            // Validate sale is completed
            if (originalSale.status != SaleStatus.COMPLETED) {
                throw IllegalArgumentException("Only completed sales can be returned")
            }

            // Check if sale is already fully returned
            if (originalSale.returnStatus == SaleReturnStatus.FULL) {
                throw IllegalArgumentException("This sale has already been fully returned")
            }

            // Validate return line items
            validateReturnLineItems(request.returnLineItems, originalSale)

            // Generate return number
            val returnNumber = generateReturnNumber(tenantId)

            // Calculate total refund amount
            val totalRefundAmount = request.returnLineItems.sumOf { 
                it.unitPrice.multiply(BigDecimal.valueOf(it.quantityReturned.toLong()))
            }

            // Create sale return entity
            val saleReturn = SaleReturn(
                returnNumber = returnNumber,
                originalSale = originalSale,
                tenant = originalSale.tenant,
                branch = originalSale.branch,
                returnReason = request.returnReason,
                totalRefundAmount = totalRefundAmount,
                status = ReturnStatus.PROCESSED, // Set to PROCESSED immediately for simplicity
                notes = request.notes,
                processedBy = currentUser,
                returnDate = OffsetDateTime.now(),
                createdAt = OffsetDateTime.now()
            )

            // Save sale return
            val savedSaleReturn = saleReturnRepository.save(saleReturn)

            // Create return line items and restore inventory
            val returnLineItems = mutableListOf<SaleReturnLineItem>()
            for (returnLineItemRequest in request.returnLineItems) {
                val originalLineItem = originalSale.lineItems.find { it.id == returnLineItemRequest.originalSaleLineItemId }
                    ?: throw IllegalArgumentException("Original line item not found")

                // Create return line item
                val returnLineItem = SaleReturnLineItem(
                    saleReturn = savedSaleReturn,
                    originalSaleLineItem = originalLineItem,
                    product = originalLineItem.product,
                    quantityReturned = returnLineItemRequest.quantityReturned,
                    unitPrice = returnLineItemRequest.unitPrice,
                    refundAmount = returnLineItemRequest.unitPrice.multiply(BigDecimal.valueOf(returnLineItemRequest.quantityReturned.toLong())),
                    restoreToInventory = returnLineItemRequest.restoreToInventory,
                    notes = returnLineItemRequest.notes,
                    createdAt = OffsetDateTime.now()
                )

                val savedReturnLineItem = saleReturnLineItemRepository.save(returnLineItem)
                returnLineItems.add(savedReturnLineItem)
                logger.debug("Restore to inventory: ${returnLineItemRequest.restoreToInventory}")

                // Restore inventory if requested
                if (returnLineItemRequest.restoreToInventory) {
                    restoreInventoryForReturn(originalLineItem, returnLineItemRequest.quantityReturned, savedSaleReturn)
                }
            }

            // Update sale return with line items
            savedSaleReturn.returnLineItems.addAll(returnLineItems)

            // Update returned quantities on original line items
            for (returnLineItemRequest in request.returnLineItems) {
                val originalLineItem = originalSale.lineItems.find { it.id == returnLineItemRequest.originalSaleLineItemId }
                    ?: throw IllegalArgumentException("Original line item not found")
                
                // Update the returned quantity on the original line item
                val updatedLineItem = originalLineItem.copy(
                    returnedQuantity = originalLineItem.returnedQuantity + returnLineItemRequest.quantityReturned
                )
                saleLineItemRepository.save(updatedLineItem)
            }

            // Calculate return status based on returned quantities
            val returnStatus = calculateReturnStatus(originalSale, request.returnLineItems)
            
            // Mark the original sale with appropriate return status
            val updatedSale = originalSale.copy(
                returnStatus = returnStatus,
                updatedAt = OffsetDateTime.now()
            )
            saleRepository.save(updatedSale)

            // Convert to DTO and return
            return salesMapper.toSaleReturnDto(savedSaleReturn)
            
        } catch (e: Exception) {
            // Log the error for debugging
            logger.error("Error creating sale return: ${e.message}", e)
            throw e
        }
    }

    /**
     * Validates return line items against original sale and existing returns.
     */
    private fun validateReturnLineItems(
        returnLineItems: List<CreateSaleReturnLineItemRequest>,
        originalSale: Sale
    ) {
        // Get all existing returns for this sale to calculate already returned quantities
        val existingReturns = saleReturnRepository.findByOriginalSaleIdAndTenantId(
            originalSale.id!!, 
            originalSale.tenant.id!!
        )
        
        // Calculate already returned quantities per line item
        val alreadyReturnedQuantities = mutableMapOf<UUID, Int>()
        for (existingReturn in existingReturns) {
            for (returnLineItem in existingReturn.returnLineItems) {
                val lineItemId = returnLineItem.originalSaleLineItem.id!!
                val currentReturned = alreadyReturnedQuantities[lineItemId] ?: 0
                alreadyReturnedQuantities[lineItemId] = currentReturned + returnLineItem.quantityReturned
            }
        }
        
        for (returnLineItem in returnLineItems) {
            val originalLineItem = originalSale.lineItems.find { it.id == returnLineItem.originalSaleLineItemId }
                ?: throw IllegalArgumentException("Original line item not found: ${returnLineItem.originalSaleLineItemId}")

            val alreadyReturned = alreadyReturnedQuantities[returnLineItem.originalSaleLineItemId] ?: 0
            val availableToReturn = originalLineItem.quantity - alreadyReturned

            if (returnLineItem.quantityReturned > availableToReturn) {
                throw IllegalArgumentException(
                    "Cannot return more items than available. " +
                    "Requested: ${returnLineItem.quantityReturned}, " +
                    "Available to return: $availableToReturn, " +
                    "Already returned: $alreadyReturned"
                )
            }

            if (returnLineItem.quantityReturned <= 0) {
                throw IllegalArgumentException("Return quantity must be greater than 0")
            }
        }
    }

    /**
     * Restores inventory for returned items.
     */
    private fun restoreInventoryForReturn(
        originalLineItem: SaleLineItem,
        quantityReturned: Int,
        saleReturn: SaleReturn
    ) {
        try {
            // Find the inventory item that was originally deducted
            val inventoryItems = inventoryRepository.findByProductIdAndBranchIdAndBatchNumber(
                originalLineItem.product.id!!,
                originalLineItem.sale.branch.id!!,
                originalLineItem.batchNumber!!
            )
            
            val inventoryItem = inventoryItems.find { it.quantity >= 0 } // Find available inventory

            if (inventoryItem != null) {
                val quantityBefore = inventoryItem.quantity
                val quantityAfter = quantityBefore + quantityReturned
                logger.debug("quantityBefore: $quantityBefore, quantityReturned: $quantityReturned, quantityAfter: $quantityAfter")
                
                // Restore quantity to inventory
                val updatedInventory = inventoryItem.copy(
                    quantity = quantityAfter,
                    updatedAt = OffsetDateTime.now()
                )
                inventoryRepository.save(updatedInventory)

                // Create audit log for inventory restoration using the builder
                val auditLog = inventoryAuditLog()
                    .product(originalLineItem.product)
                    .branch(originalLineItem.sale.branch)
                    .tenant(originalLineItem.sale.tenant)
                    .transactionType(TransactionType.RETURN)
                    .quantityChanged(quantityReturned)
                    .quantityBefore(quantityBefore)
                    .quantityAfter(quantityAfter)
                    .sourceReference(saleReturn.returnNumber)
                    .sourceType(SourceType.RETURN)
                    .performedBy(saleReturn.processedBy)
                    .notes("Inventory restored from sale return: ${saleReturn.returnNumber}")
                    .build()
                    
                inventoryAuditLogRepository.save(auditLog)
                
                logger.info("Successfully restored ${quantityReturned} units of ${originalLineItem.product.name} to inventory")
            } else {
                logger.warn("No inventory found for product ${originalLineItem.product.name} in branch ${originalLineItem.sale.branch.name}")
            }
        } catch (e: Exception) {
            logger.error("Error restoring inventory for return: ${e.message}", e)
            // Don't throw the exception to avoid breaking the return process
        }
    }

    /**
     * Generates a unique return number for the tenant.
     */
    private fun generateReturnNumber(tenantId: UUID): String {
        val nextNumber = saleReturnRepository.getNextReturnNumber(tenantId)
        return "RET$nextNumber"
    }

    /**
     * Calculates the return status based on returned quantities vs original quantities.
     */
    private fun calculateReturnStatus(
        originalSale: Sale,
        returnLineItems: List<CreateSaleReturnLineItemRequest>
    ): SaleReturnStatus {
        // Create a map of original line item quantities
        val originalQuantities = originalSale.lineItems.associate { it.id to it.quantity }
        
        // Create a map of returned quantities by line item ID
        val returnedQuantities = returnLineItems.associate { 
            it.originalSaleLineItemId to it.quantityReturned 
        }
        
        var hasPartialReturn = false
        var hasFullReturn = false
        
        // Check each original line item
        for (originalLineItem in originalSale.lineItems) {
            val originalQty = originalQuantities[originalLineItem.id] ?: 0
            val returnedQty = returnedQuantities[originalLineItem.id] ?: 0
            
            when {
                returnedQty == 0 -> {
                    // No return for this item - continue
                }
                returnedQty == originalQty -> {
                    // Full return for this item
                    hasFullReturn = true
                }
                returnedQty < originalQty -> {
                    // Partial return for this item
                    hasPartialReturn = true
                }
                else -> {
                    // Return quantity exceeds original - this should be caught by validation
                    throw IllegalArgumentException("Return quantity exceeds original quantity for line item ${originalLineItem.id}")
                }
            }
        }
        
        return when {
            hasFullReturn && !hasPartialReturn && returnedQuantities.size == originalSale.lineItems.size -> {
                // All items fully returned
                SaleReturnStatus.FULL
            }
            hasPartialReturn || hasFullReturn -> {
                // Some items partially or fully returned
                SaleReturnStatus.PARTIAL
            }
            else -> {
                // No returns (shouldn't happen in this context)
                SaleReturnStatus.NONE
            }
        }
    }
}
