package com.chemsys.controller

import com.chemsys.dto.*
import com.chemsys.service.ExpenseService
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDate
import java.util.*
import jakarta.validation.Valid

/**
 * REST controller for expense management.
 * Supports CRUD and listing with filters by branch, expense type, and date range.
 */
@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = ["*"])
class ExpenseController(
    private val expenseService: ExpenseService
) {
    companion object {
        private val logger = LoggerFactory.getLogger(ExpenseController::class.java)
    }

    @PostMapping
    fun create(@Valid @RequestBody request: CreateExpenseRequest): ResponseEntity<ExpenseDto> {
        return try {
            val dto = expenseService.create(request)
            ResponseEntity.status(HttpStatus.CREATED).body(dto)
        } catch (e: RuntimeException) {
            logger.warn("Create expense failed: ${e.message}")
            ResponseEntity.badRequest().build()
        }
    }

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateExpenseRequest
    ): ResponseEntity<ExpenseDto> {
        return try {
            val dto = expenseService.update(id, request)
            ResponseEntity.ok(dto)
        } catch (e: RuntimeException) {
            logger.warn("Update expense failed: ${e.message}")
            ResponseEntity.badRequest().build()
        }
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Void> {
        return try {
            expenseService.delete(id)
            ResponseEntity.noContent().build()
        } catch (e: RuntimeException) {
            logger.warn("Delete expense failed: ${e.message}")
            ResponseEntity.notFound().build()
        }
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<ExpenseDto> {
        return try {
            val dto = expenseService.getById(id)
            ResponseEntity.ok(dto)
        } catch (e: RuntimeException) {
            ResponseEntity.notFound().build()
        }
    }

    /**
     * List expenses with optional filters.
     * @param branchId Optional branch filter
     * @param expenseType Optional type: DELIVERY, ADVERTISEMENTS, RENT, WIFI, COMMISSIONS_PAID, MISCELLANEOUS
     * @param startDate Start of date range (default: first day of current month)
     * @param endDate End of date range (default: today)
     */
    @GetMapping
    fun list(
        @RequestParam(required = false) branchId: UUID?,
        @RequestParam(required = false) expenseType: String?,
        @RequestParam(required = false) startDate: LocalDate?,
        @RequestParam(required = false) endDate: LocalDate?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<ExpenseListResponse> {
        return try {
            val end = endDate ?: LocalDate.now()
            val start = startDate ?: end.withDayOfMonth(1)
            val response = expenseService.list(branchId, expenseType, start, end, page, size)
            ResponseEntity.ok(response)
        } catch (e: Exception) {
            logger.error("List expenses failed: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }

    /** List expenses pending admin approval (for notification center). */
    @GetMapping("/pending")
    fun listPending(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int
    ): ResponseEntity<PendingExpenseListResponse> {
        return try {
            val response = expenseService.listPending(page, size)
            ResponseEntity.ok(response)
        } catch (e: Exception) {
            logger.error("List pending expenses failed: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }

    @GetMapping("/pending/count")
    fun getPendingCount(): ResponseEntity<Map<String, Long>> {
        return try {
            val count = expenseService.getPendingCount()
            ResponseEntity.ok(mapOf("count" to count))
        } catch (e: Exception) {
            ResponseEntity.internalServerError().build()
        }
    }

    /** Admin approves a pending expense. */
    @PostMapping("/{id}/approve")
    fun approve(@PathVariable id: UUID): ResponseEntity<ExpenseDto> {
        return try {
            val dto = expenseService.approve(id)
            ResponseEntity.ok(dto)
        } catch (e: RuntimeException) {
            logger.warn("Approve expense failed: ${e.message}")
            ResponseEntity.badRequest().build()
        }
    }

    /** Admin rejects a pending expense. */
    @PostMapping("/{id}/reject")
    fun reject(
        @PathVariable id: UUID,
        @RequestBody(required = false) body: ApproveRejectExpenseRequest?
    ): ResponseEntity<ExpenseDto> {
        return try {
            val dto = expenseService.reject(id, body?.rejectionReason)
            ResponseEntity.ok(dto)
        } catch (e: RuntimeException) {
            logger.warn("Reject expense failed: ${e.message}")
            ResponseEntity.badRequest().build()
        }
    }
}
