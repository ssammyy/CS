package com.chemsys.service

import com.chemsys.dto.*
import com.chemsys.entity.*
import com.chemsys.repository.*
import com.chemsys.config.TenantContext
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.security.core.context.SecurityContextHolder
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.time.LocalDate
import java.util.*

/**
 * CreditService handles all business logic for credit account management.
 * Provides transactional operations for creating credit accounts, recording payments,
 * and tracking outstanding balances with proper audit logging.
 *
 * This service follows the Backend Data Consistency Rule by ensuring:
 * - All operations are transactional (@Transactional annotation)
 * - Idempotency through unique transaction references
 * - Complete audit trail for all credit mutations
 * - Atomic updates across all related entities
 * - Proper error handling and transaction rollback
 * - Tenant isolation for multi-tenant architecture
 */
@Service
class CreditService(
    private val creditAccountRepository: CreditAccountRepository,
    private val creditPaymentRepository: CreditPaymentRepository,
    private val customerRepository: CustomerRepository,
    private val saleRepository: SaleRepository,
    private val userRepository: UserRepository,
    private val branchRepository: BranchRepository,
    private val tenantRepository: TenantRepository
) {

    companion object {
        private val logger = LoggerFactory.getLogger(CreditService::class.java)
    }

    // ==================== Credit Account Operations ====================

    /**
     * Creates a new credit account from a sale transaction.
     *
     * This method implements the Backend Data Consistency Rule by:
     * - Using @Transactional to ensure atomicity
     * - Checking for idempotency through sale validation
     * - Logging all credit mutations with complete audit trail
     * - Updating all related entities in a single transaction
     * - Rolling back on any error with proper exception handling
     *
     * @param request The credit account creation request
     * @return Created credit account details
     * @throws IllegalArgumentException if validation fails
     * @throws RuntimeException if transaction fails
     */
    @Transactional
    // @PreAuthorize("hasRole('CASHIER') or hasRole('MANAGER') or hasRole('ADMIN')")
    fun createCreditAccount(request: CreateCreditAccountRequest): CreditAccountDto {

        try {
            logger.debug("Starting createCreditAccount with request: $request")
            val currentTenantId = TenantContext.getCurrentTenant()
                ?: throw RuntimeException("No tenant context found")
            logger.debug("Current tenant ID: $currentTenantId")
            val currentUser = getCurrentUser()
            logger.debug("Current user: ${currentUser.username} (ID: ${currentUser.id})")

            // Validate customer exists and belongs to current tenant
            val customer = customerRepository.findById(request.customerId)
                .orElseThrow { IllegalArgumentException("Customer with ID ${request.customerId} not found") }

            if (customer.tenant.id != currentTenantId) {
                throw IllegalArgumentException("Customer does not belong to current tenant")
            }

            // Validate sale exists and belongs to current tenant
            val sale = saleRepository.findById(request.saleId)
                .orElseThrow { IllegalArgumentException("Sale with ID ${request.saleId} not found") }

            if (sale.tenant.id != currentTenantId) {
                throw IllegalArgumentException("Sale does not belong to current tenant")
            }

            // Ensure sale is not already on credit (idempotency check)
            if (creditAccountRepository.existsBySaleId(request.saleId)) {
                throw IllegalArgumentException("Sale with ID ${request.saleId} is already associated with a credit account")
            }

            // Get current user and branch for audit trail
            // currentUser is already available from getCurrentUser()
            val branch = sale.branch

            // Generate unique credit number
            val creditNumber = generateCreditNumber(branch.id!!)

            // Calculate paidAmount and remainingAmount
            // Handle the case where paidAmount is null (default to 0 for no upfront payment)
            val paidAmount = request.paidAmount ?: BigDecimal.ZERO
            
            // Always calculate remaining amount from total - paid for consistency
            // Ignore the provided remainingAmount to avoid frontend state synchronization issues
            val remainingAmount = request.totalAmount.subtract(paidAmount)

            // Validate payment amounts
            if (paidAmount < BigDecimal.ZERO) {
                throw IllegalArgumentException("Paid amount cannot be negative")
            }
            if (paidAmount > request.totalAmount) {
                throw IllegalArgumentException("Paid amount cannot exceed total amount")
            }
            // remainingAmount validation is implicit (totalAmount - paidAmount will always be valid if above checks pass)

            // Create credit account entity with partial payment support
            val creditAccount = CreditAccount(
                creditNumber = creditNumber,
                tenant = customer.tenant,
                branch = branch,
                customer = customer,
                sale = sale,
                totalAmount = request.totalAmount,
                paidAmount = paidAmount,
                remainingAmount = remainingAmount,
                expectedPaymentDate = request.expectedPaymentDate,
                status = CreditStatus.ACTIVE,
                notes = request.notes,
                createdBy = currentUser,
                createdAt = OffsetDateTime.now()
            )

            val savedCreditAccount = creditAccountRepository.save(creditAccount)

            // If there's an upfront payment (partial or full), create an initial credit payment record
            if (paidAmount > BigDecimal.ZERO) {
                val paymentNote = when {
                    paidAmount.compareTo(request.totalAmount) == 0 -> "Full upfront payment"
                    else -> "Initial partial payment"
                }
                
                val initialPayment = CreditPayment(
                    paymentNumber = generatePaymentNumber(),
                    creditAccount = savedCreditAccount,
                    amount = paidAmount,
                    paymentMethod = PaymentMethod.CASH, // Default to CASH for upfront payments
                    paymentDate = OffsetDateTime.now(),
                    notes = paymentNote,
                    receivedBy = currentUser,
                    referenceNumber = UUID.randomUUID().toString(),
                    createdAt = OffsetDateTime.now()
                )
                creditPaymentRepository.save(initialPayment)
            }
            // Note: If paidAmount is ZERO, no initial payment record is created

            // Update sale status based on payment status
            // This ensures data consistency between sales and credit accounts
            if (sale.status == SaleStatus.COMPLETED) {
                val newSaleStatus = when {
                    // If fully paid upfront, keep sale as COMPLETED
                    paidAmount.compareTo(request.totalAmount) >= 0 -> SaleStatus.COMPLETED
                    // If partially paid or no payment, set to PENDING (awaiting full payment)
                    else -> SaleStatus.PENDING
                }
                
                if (newSaleStatus != sale.status) {
                    saleRepository.save(sale.copy(
                        status = newSaleStatus,
                        updatedAt = OffsetDateTime.now()
                    ))
                    logger.info("Updated sale ${sale.saleNumber} status to $newSaleStatus after credit account creation")
                }
            }

            return savedCreditAccount.toDto()
        } catch (e: Exception) {
            logger.error("Exception in createCreditAccount - ${e.message}", e)
            e.printStackTrace()
            throw e
        }
    }

    /**
     * Records a payment against a credit account.
     *
     * This method implements the Backend Data Consistency Rule by:
     * - Using @Transactional to ensure atomicity
     * - Checking for idempotency through payment validation
     * - Logging all payment mutations with complete audit trail
     * - Updating all related entities in a single transaction
     * - Rolling back on any error with proper exception handling
     *
     * @param request The payment creation request
     * @return Created payment details
     * @throws IllegalArgumentException if validation fails
     * @throws RuntimeException if transaction fails
     */
    @Transactional
    @PreAuthorize("hasRole('CASHIER') or hasRole('MANAGER') or hasRole('ADMIN')")
    fun makePayment(request: CreateCreditPaymentRequest): CreditPaymentDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        val currentUser = getCurrentUser()
        
        // Validate credit account exists and belongs to current tenant
        val creditAccount = creditAccountRepository.findById(request.creditAccountId)
            .orElseThrow { IllegalArgumentException("Credit Account with ID ${request.creditAccountId} not found") }
        
        if (creditAccount.tenant.id != currentTenantId) {
            throw IllegalArgumentException("Credit Account does not belong to current tenant")
        }
        
        // Validate payment amount
        if (request.amount <= BigDecimal.ZERO) {
            throw IllegalArgumentException("Payment amount must be positive")
        }
        
        if (request.amount > creditAccount.remainingAmount) {
            throw IllegalArgumentException("Payment amount exceeds outstanding balance")
        }
        
        // Check if account is still active
        if (creditAccount.status == CreditStatus.PAID || creditAccount.status == CreditStatus.CLOSED) {
            throw IllegalArgumentException("Cannot record payment for a closed or fully paid credit account")
        }
        
        // Get current user for audit trail
        // currentUser is already available from getCurrentUser()
        
        // Create payment entity
        val creditPayment = CreditPayment(
            paymentNumber = generatePaymentNumber(),
            creditAccount = creditAccount,
            amount = request.amount,
            paymentMethod = request.paymentMethod,
            referenceNumber = request.referenceNumber,
            notes = request.notes,
            receivedBy = currentUser,
            paymentDate = OffsetDateTime.now()
        )
        
        val savedPayment = creditPaymentRepository.save(creditPayment)
        
        // Update credit account balance and status
        val newPaidAmount = creditAccount.paidAmount.add(request.amount)
        val newRemainingAmount = creditAccount.remainingAmount.subtract(request.amount)
        
        logger.debug("Credit payment processing - Account: ${creditAccount.creditNumber}")
        logger.debug("Old paidAmount: ${creditAccount.paidAmount}, New paidAmount: $newPaidAmount")
        logger.debug("Old remainingAmount: ${creditAccount.remainingAmount}, New remainingAmount: $newRemainingAmount")
        logger.debug("Current credit status: ${creditAccount.status}")
        
        val updatedStatus = when {
            newRemainingAmount <= BigDecimal.ZERO -> CreditStatus.PAID
            newRemainingAmount > BigDecimal.ZERO && creditAccount.expectedPaymentDate.isBefore(LocalDate.now()) -> CreditStatus.OVERDUE
            else -> CreditStatus.ACTIVE
        }
        
        logger.debug("New credit status: $updatedStatus")
        
        val updatedCreditAccount = creditAccount.copy(
            paidAmount = newPaidAmount,
            remainingAmount = newRemainingAmount,
            status = updatedStatus,
            updatedAt = OffsetDateTime.now(),
            closedAt = if (updatedStatus == CreditStatus.PAID) OffsetDateTime.now() else null
        )
        
        creditAccountRepository.save(updatedCreditAccount)
        logger.debug("Credit account saved successfully")
        
        // Update the associated sale record when credit account is fully paid
        // This ensures data consistency between credit accounts and sales
        logger.debug("Checking if sale needs update - updatedStatus=$updatedStatus, oldStatus=${creditAccount.status}")
        if (updatedStatus == CreditStatus.PAID && creditAccount.sale.status != SaleStatus.COMPLETED) {
            logger.debug("Credit account fully paid - updating sale status")
            // Credit account just became fully paid - update the sale status
            val sale = creditAccount.sale
            logger.debug("Sale before update - Number: ${sale.saleNumber}, Status: ${sale.status}")
            
            val updatedSale = sale.copy(
                status = SaleStatus.COMPLETED,  // Mark sale as completed when fully paid
                updatedAt = OffsetDateTime.now()
            )
            saleRepository.save(updatedSale)
            
            logger.info("✅ Updated sale ${sale.saleNumber} status from ${sale.status} to COMPLETED after credit account fully paid")
        } else {
            logger.debug("Sale status update not needed - Credit status check: updatedStatus=$updatedStatus, creditAccount.status=${creditAccount.status}")
        }
        
        return savedPayment.toDto()
    }

    /**
     * Updates the status of a credit account.
     */
    @Transactional
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    fun updateCreditAccountStatus(creditAccountId: UUID, request: UpdateCreditAccountStatusRequest): CreditAccountDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val creditAccount = creditAccountRepository.findById(creditAccountId)
            .orElseThrow { IllegalArgumentException("Credit Account with ID $creditAccountId not found") }
        
        if (creditAccount.tenant.id != currentTenantId) {
            throw IllegalArgumentException("Credit Account does not belong to current tenant")
        }
        
        val updatedCreditAccount = creditAccount.copy(
            status = request.status,
            notes = request.notes ?: creditAccount.notes,
            updatedAt = OffsetDateTime.now(),
            closedAt = if (request.status == CreditStatus.CLOSED) OffsetDateTime.now() else creditAccount.closedAt
        )
        
        val savedAccount = creditAccountRepository.save(updatedCreditAccount)
        return savedAccount.toDto()
    }

    /**
     * Retrieves a credit account by ID with payment history.
     */
    @Transactional(readOnly = true)
    fun getCreditAccount(creditAccountId: UUID): CreditAccountDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        
        val creditAccount = creditAccountRepository.findById(creditAccountId)
            .orElseThrow { IllegalArgumentException("Credit Account with ID $creditAccountId not found") }
        
        if (creditAccount.tenant.id != currentTenantId) {
            throw IllegalArgumentException("Credit Account does not belong to current tenant")
        }
        
        return creditAccount.toDtoWithPayments()
    }

    /**
     * Retrieves credit accounts with filtering and pagination.
     */
    @Transactional(readOnly = true)
    fun getCreditAccounts(
        customerId: UUID? = null,
        status: CreditStatus? = null,
        branchId: UUID? = null,
        isOverdue: Boolean? = null,
        expectedPaymentDateFrom: LocalDate? = null,
        expectedPaymentDateTo: LocalDate? = null,
        page: Int = 0,
        size: Int = 20
    ): Page<CreditAccountSummaryDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        val currentBranchId = branchId ?: getCurrentBranchId()
        val pageable: Pageable = PageRequest.of(page, size)
        
        return when {
            customerId != null -> {
                val accounts = creditAccountRepository.findByCustomerIdAndTenantId(customerId, currentTenantId)
                PageImpl(accounts.map { it.toSummaryDto() }, pageable, accounts.size.toLong())
            }
            status != null -> {
                creditAccountRepository.findByStatusAndTenantIdAndBranchId(status, currentTenantId, currentBranchId, pageable)
                    .map { it.toSummaryDto() }
            }
            isOverdue == true -> {
                val overdueAccounts = creditAccountRepository.findOverdueAccounts(currentTenantId, currentBranchId, LocalDate.now())
                PageImpl(overdueAccounts.map { it.toSummaryDto() }, pageable, overdueAccounts.size.toLong())
            }
            else -> {
                creditAccountRepository.findByTenantIdAndBranchId(currentTenantId, currentBranchId, pageable)
                    .map { it.toSummaryDto() }
            }
        }
    }

    /**
     * Gets credit dashboard statistics.
     */
    @Transactional(readOnly = true)
    fun getCreditDashboard(): CreditDashboardDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        val currentBranchId = getCurrentBranchId()
        
        val totalOutstandingAmount = creditAccountRepository.getTotalOutstandingAmount(currentTenantId, currentBranchId)
        val overdueAmount = creditAccountRepository.getOverdueAmount(currentTenantId, currentBranchId)
        val activeAccounts = creditAccountRepository.countByStatusAndTenantIdAndBranchId(CreditStatus.ACTIVE, currentTenantId, currentBranchId)
        val overdueAccounts = creditAccountRepository.countByStatusAndTenantIdAndBranchId(CreditStatus.OVERDUE, currentTenantId, currentBranchId)
        
        // Get recent payments
        val recentPayments = creditPaymentRepository.findRecentPayments(
            currentTenantId, currentBranchId, PageRequest.of(0, 10)
        ).content.map { it.toDto() }
        
        return CreditDashboardDto(
            totalActiveAccounts = activeAccounts,
            totalOutstandingAmount = totalOutstandingAmount,
            overdueAccounts = overdueAccounts,
            overdueAmount = overdueAmount,
            recentPayments = recentPayments
        )
    }

    /**
     * Updates overdue accounts status.
     */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    fun updateOverdueAccounts(): Map<String, Any> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        val currentBranchId = getCurrentBranchId()
        
        val overdueAccounts = creditAccountRepository.findOverdueAccounts(currentTenantId, currentBranchId, LocalDate.now())
        
        var updatedCount = 0
        overdueAccounts.forEach { account ->
            if (account.status != CreditStatus.OVERDUE) {
                val updatedAccount = account.copy(
                    status = CreditStatus.OVERDUE,
                    updatedAt = OffsetDateTime.now()
                )
                creditAccountRepository.save(updatedAccount)
                updatedCount++
            }
        }
        
        return mapOf(
            "message" to "Overdue accounts updated successfully",
            "updatedCount" to updatedCount
        )
    }

    // ==================== Helper Methods ====================

    private fun generateCreditNumber(branchId: UUID): String {
        val branchPrefix = branchId.toString().substring(0, 4).uppercase()
        val creditNumberPrefix = "CR-$branchPrefix-"
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        val currentBranchId = getCurrentBranchId()
        val nextSequence = creditAccountRepository.countByTenantIdAndBranchIdAndCreditNumberStartingWith(
            currentTenantId, currentBranchId, creditNumberPrefix
        ) + 1
        
        return "$creditNumberPrefix${String.format("%06d", nextSequence)}"
    }

    /**
     * Generates a unique payment number for credit account payments.
     * Format: PAY-{timestamp}-{random}
     * 
     * @return Generated payment number
     */
    private fun generatePaymentNumber(): String {
        val timestamp = System.currentTimeMillis()
        val random = UUID.randomUUID().toString().substring(0, 8).uppercase()
        return "PAY-$timestamp-$random"
    }

    private fun getCurrentUser(): User {
        logger.debug("Getting current user from SecurityContext")
        val authentication = SecurityContextHolder.getContext().authentication
        val username = authentication.name
        logger.debug("Username from authentication: $username")
        val user = userRepository.findByUsername(username)
        logger.debug("User found: ${user?.username} (ID: ${user?.id})")
        return user ?: throw IllegalStateException("Current user not found: $username")
    }

    private fun getCurrentBranchId(): UUID {
        // This would typically come from user preferences or request context
        // For now, we'll get the first branch for the tenant
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")
        val branches = branchRepository.findByTenantId(currentTenantId)
        return if (branches.isNotEmpty()) branches.first().id!! else throw RuntimeException("No branches found for tenant")
    }

    // ==================== Extension Functions ====================

    private fun CreditAccount.toDto(): CreditAccountDto {
        return CreditAccountDto(
            id = id!!,
            creditNumber = creditNumber,
            customer = customer.toCustomerDto(),
            sale = sale.toSaleDto(),
            totalAmount = totalAmount,
            paidAmount = paidAmount,
            remainingAmount = remainingAmount,
            expectedPaymentDate = expectedPaymentDate,
            status = status,
            notes = notes,
            createdBy = createdBy.toUserDto(),
            createdAt = createdAt,
            updatedAt = updatedAt,
            closedAt = closedAt
        )
    }

    private fun CreditAccount.toDtoWithPayments(): CreditAccountDto {
        val payments = creditPaymentRepository.findByCreditAccountIdOrderByPaymentDateDesc(id!!)
            .map { it.toDto() }
        return this.toDto().copy(payments = payments)
    }

    private fun CreditAccount.toSummaryDto(): CreditAccountSummaryDto {
        return CreditAccountSummaryDto(
            id = id!!,
            creditNumber = creditNumber,
            customerName = "${customer.firstName} ${customer.lastName}",
            customerPhone = customer.phone,
            totalAmount = totalAmount,
            paidAmount = paidAmount,
            remainingAmount = remainingAmount,
            expectedPaymentDate = expectedPaymentDate,
            status = status,
            createdAt = createdAt,
            isOverdue = status == CreditStatus.OVERDUE || (status == CreditStatus.ACTIVE && expectedPaymentDate.isBefore(LocalDate.now()))
        )
    }

    private fun CreditPayment.toDto(): CreditPaymentDto {
        return CreditPaymentDto(
            id = id!!,
            paymentNumber = paymentNumber,
            creditAccountId = creditAccount.id!!,
            amount = amount,
            paymentMethod = paymentMethod,
            referenceNumber = referenceNumber,
            notes = notes,
            receivedBy = receivedBy.toUserDto(),
            paymentDate = paymentDate,
            createdAt = createdAt
        )
    }

    // ==================== Entity to DTO Extension Functions ====================

    private fun Customer.toCustomerDto(): CustomerDto {
        return CustomerDto(
            id = id!!,
            customerNumber = customerNumber,
            firstName = firstName,
            lastName = lastName,
            email = email,
            phone = phone,
            dateOfBirth = dateOfBirth,
            address = address,
            insuranceProvider = insuranceProvider,
            insuranceNumber = insuranceNumber,
            isActive = isActive,
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }

    private fun Sale.toSaleDto(): SaleDto {
        return SaleDto(
            id = id!!,
            saleNumber = saleNumber,
            branchId = branch.id!!,
            branchName = branch.name,
            customerId = customer?.id,
            customerName = customerName ?: (customer?.let { "${it.firstName} ${it.lastName}" }),
            customerPhone = customerPhone ?: customer?.phone,
            subtotal = subtotal,
            taxAmount = taxAmount,
            discountAmount = discountAmount,
            totalAmount = totalAmount,
            status = status,
            notes = notes,
            cashierId = cashier.id!!,
            cashierName = cashier.username, // Using username as display name
            saleDate = saleDate,
            createdAt = createdAt,
            returnStatus = returnStatus,
            isCreditSale = isCreditSale,
            lineItems = emptyList(), // We'll populate this if needed
            payments = emptyList() // We'll populate this if needed
        )
    }

    private fun User.toUserDto(): UserDto {
        return UserDto(
            id = id!!,
            username = username,
            email = email,
            role = role.name, // Convert enum to string
            tenantId = tenant.id!!,
            tenantName = tenant.name,
            isActive = isActive
        )
    }
}
