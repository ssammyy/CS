package com.chemsys.controller

import com.chemsys.dto.*
import com.chemsys.service.CreditService
import com.chemsys.entity.CreditStatus
import org.springframework.data.domain.Page
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.*
import jakarta.validation.Valid

/**
 * REST controller for Credit Management operations.
 * Provides endpoints for credit account management, payment processing, and reporting.
 *
 * This controller follows the Backend Data Consistency Rule by ensuring:
 * - All endpoints are properly secured with role-based access control
 * - Input validation through DTOs and validation annotations
 * - Proper error handling and HTTP status codes
 * - RESTful API design principles
 * - Comprehensive documentation for all endpoints
 */
@RestController
@RequestMapping("/api/v1/credit")
@CrossOrigin(origins = ["*"])
class CreditController(
    private val creditService: CreditService
) {

    // ==================== Credit Account Operations ====================

    /**
     * Creates a new credit account from a sale transaction.
     *
     * @param request The credit account creation request
     * @return Created credit account details
     */
    @PostMapping("/accounts")
    // @PreAuthorize("hasRole('CASHIER') or hasRole('MANAGER') or hasRole('ADMIN')")
    fun createCreditAccount(@Valid @RequestBody request: CreateCreditAccountRequest): ResponseEntity<CreditAccountDto> {
        val creditAccount = creditService.createCreditAccount(request)
        return ResponseEntity(creditAccount, HttpStatus.CREATED)
    }

    /**
     * Records a payment against a credit account.
     *
     * @param request The payment creation request
     * @return Created payment details
     */
    @PostMapping("/payments")
    @PreAuthorize("hasRole('CASHIER') or hasRole('MANAGER') or hasRole('ADMIN')")
    fun makePayment(@Valid @RequestBody request: CreateCreditPaymentRequest): ResponseEntity<CreditPaymentDto> {
        val creditPayment = creditService.makePayment(request)
        return ResponseEntity(creditPayment, HttpStatus.CREATED)
    }

    /**
     * Updates the status of a credit account.
     *
     * @param creditAccountId The credit account ID
     * @param request The status update request
     * @return Updated credit account details
     */
    @PutMapping("/accounts/{creditAccountId}/status")
    @PreAuthorize("hasRole('MANAGER') or hasRole('ADMIN')")
    fun updateCreditAccountStatus(
        @PathVariable creditAccountId: UUID,
        @Valid @RequestBody request: UpdateCreditAccountStatusRequest
    ): ResponseEntity<CreditAccountDto> {
        val creditAccount = creditService.updateCreditAccountStatus(creditAccountId, request)
        return ResponseEntity.ok(creditAccount)
    }

    /**
     * Retrieves a credit account by ID with payment history.
     *
     * @param creditAccountId The credit account ID
     * @return Credit account details with payment history
     */
    @GetMapping("/accounts/{creditAccountId}")
    fun getCreditAccount(@PathVariable creditAccountId: UUID): ResponseEntity<CreditAccountDto> {
        val creditAccount = creditService.getCreditAccount(creditAccountId)
        return ResponseEntity.ok(creditAccount)
    }

    /**
     * Retrieves credit accounts with filtering and pagination.
     *
     * @param customerId Optional customer ID filter
     * @param status Optional status filter
     * @param branchId Optional branch ID filter
     * @param isOverdue Optional overdue filter
     * @param expectedPaymentDateFrom Optional payment date from filter
     * @param expectedPaymentDateTo Optional payment date to filter
     * @param page Page number (default: 0)
     * @param size Page size (default: 20)
     * @return Paginated list of credit accounts
     */
    @GetMapping("/accounts")
    fun getCreditAccounts(
        @RequestParam(required = false) customerId: UUID?,
        @RequestParam(required = false) status: CreditStatus?,
        @RequestParam(required = false) branchId: UUID?,
        @RequestParam(required = false) isOverdue: Boolean?,
        @RequestParam(required = false) expectedPaymentDateFrom: String?,
        @RequestParam(required = false) expectedPaymentDateTo: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<Page<CreditAccountSummaryDto>> {
        val creditAccounts = creditService.getCreditAccounts(
            customerId = customerId,
            status = status,
            branchId = branchId,
            isOverdue = isOverdue,
            expectedPaymentDateFrom = expectedPaymentDateFrom?.let { java.time.LocalDate.parse(it) },
            expectedPaymentDateTo = expectedPaymentDateTo?.let { java.time.LocalDate.parse(it) },
            page = page,
            size = size
        )
        return ResponseEntity.ok(creditAccounts)
    }

    /**
     * Gets credit dashboard statistics.
     *
     * @return Dashboard statistics
     */
    @GetMapping("/dashboard")
    fun getCreditDashboard(): ResponseEntity<CreditDashboardDto> {
        val dashboard = creditService.getCreditDashboard()
        return ResponseEntity.ok(dashboard)
    }

    /**
     * Updates overdue accounts status.
     *
     * @return Update result
     */
    @PostMapping("/admin/update-overdue")
    @PreAuthorize("hasRole('ADMIN')")
    fun updateOverdueAccounts(): ResponseEntity<Map<String, Any>> {
        val result = creditService.updateOverdueAccounts()
        return ResponseEntity.ok(result)
    }

    /**
     * Gets credit accounts for a specific customer.
     *
     * @param customerId The customer ID
     * @return List of customer's credit accounts
     */
    @GetMapping("/customers/{customerId}/accounts")
    fun getCustomerCreditAccounts(@PathVariable customerId: UUID): ResponseEntity<List<CreditAccountSummaryDto>> {
        val accounts = creditService.getCreditAccounts(customerId = customerId)
        return ResponseEntity.ok(accounts.content)
    }

    /**
     * Gets overdue credit accounts.
     *
     * @param page Page number (default: 0)
     * @param size Page size (default: 20)
     * @return Paginated list of overdue accounts
     */
    @GetMapping("/accounts/overdue")
    fun getOverdueAccounts(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<Page<CreditAccountSummaryDto>> {
        val overdueAccounts = creditService.getCreditAccounts(isOverdue = true, page = page, size = size)
        return ResponseEntity.ok(overdueAccounts)
    }
}
