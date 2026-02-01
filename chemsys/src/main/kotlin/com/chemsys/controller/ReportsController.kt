package com.chemsys.controller

import com.chemsys.dto.FinancialReportDto
import com.chemsys.dto.InventoryReportDto
import com.chemsys.dto.VarianceReportDto
import com.chemsys.dto.VatReportDto
import com.chemsys.service.ReportService
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDate
import java.util.*

/**
 * ReportsController provides REST API endpoints for comprehensive reporting
 */
@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = ["*"])
class ReportsController(
    private val reportService: ReportService
) {

    companion object {
        private val logger = LoggerFactory.getLogger(ReportsController::class.java)
    }

    /**
     * Get financial report for a date range
     * @param startDate Report start date (YYYY-MM-DD format)
     * @param endDate Report end date (YYYY-MM-DD format)
     * @param branchId Optional branch ID filter
     */
    @GetMapping("/financial")
    fun getFinancialReport(
        @RequestParam startDate: String,
        @RequestParam endDate: String,
        @RequestParam(required = false) branchId: String?
    ): ResponseEntity<FinancialReportDto> {
        return try {
            val start = LocalDate.parse(startDate)
            val end = LocalDate.parse(endDate)
            val branchUuid = branchId?.let { UUID.fromString(it) }

            val report = reportService.getFinancialReport(start, end, branchUuid)
            ResponseEntity.ok(report)
        } catch (e: Exception) {
            logger.error("Error fetching financial report: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Get inventory report
     * @param branchId Optional branch ID filter
     */
    @GetMapping("/inventory")
    fun getInventoryReport(
        @RequestParam(required = false) branchId: String?
    ): ResponseEntity<InventoryReportDto> {
        return try {
            val branchUuid = branchId?.let { UUID.fromString(it) }
            val report = reportService.getInventoryReport(branchUuid)
            ResponseEntity.ok(report)
        } catch (e: Exception) {
            logger.error("Error fetching inventory report: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Get variance report comparing expected vs actual inventory
     * @param startDate Report start date (YYYY-MM-DD format)
     * @param endDate Report end date (YYYY-MM-DD format)
     * @param branchId Optional branch ID filter
     */
    @GetMapping("/variance")
    fun getVarianceReport(
        @RequestParam startDate: String,
        @RequestParam endDate: String,
        @RequestParam(required = false) branchId: String?
    ): ResponseEntity<VarianceReportDto> {
        return try {
            val start = LocalDate.parse(startDate)
            val end = LocalDate.parse(endDate)
            val branchUuid = branchId?.let { UUID.fromString(it) }

            val report = reportService.getVarianceReport(start, end, branchUuid)
            ResponseEntity.ok(report)
        } catch (e: Exception) {
            logger.error("Error fetching variance report: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Get VAT report with input VAT, output VAT, and net VAT payable
     * @param startDate Report start date (YYYY-MM-DD format)
     * @param endDate Report end date (YYYY-MM-DD format)
     * @param branchId Optional branch ID filter
     */
    @GetMapping("/vat")
    fun getVatReport(
        @RequestParam startDate: String,
        @RequestParam endDate: String,
        @RequestParam(required = false) branchId: String?
    ): ResponseEntity<VatReportDto> {
        return try {
            val start = LocalDate.parse(startDate)
            val end = LocalDate.parse(endDate)
            val branchUuid = branchId?.let { UUID.fromString(it) }

            val report = reportService.getVatReport(start, end, branchUuid)
            ResponseEntity.ok(report)
        } catch (e: Exception) {
            logger.error("Error fetching VAT report: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }
}
