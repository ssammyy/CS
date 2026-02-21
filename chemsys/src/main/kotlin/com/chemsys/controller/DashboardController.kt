package com.chemsys.controller

import com.chemsys.dto.DashboardStatsDto
import com.chemsys.service.DashboardService
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

/**
 * DashboardController provides REST API endpoints for dashboard statistics and analytics
 */
@RestController
@RequestMapping("/dashboard")
@CrossOrigin(origins = ["*"])
class DashboardController(
    private val dashboardService: DashboardService
) {

    companion object {
        private val logger = LoggerFactory.getLogger(DashboardController::class.java)
    }

    /**
     * Get comprehensive dashboard statistics
     * @param branchId Optional branch ID filter
     */
    @GetMapping("/stats")
    fun getDashboardStats(
        @RequestParam(required = false) branchId: String?
    ): ResponseEntity<DashboardStatsDto> {
        return try {
            val branchUuid = branchId?.let { UUID.fromString(it) }
            val stats = dashboardService.getDashboardStats(branchUuid)
            ResponseEntity.ok(stats)
        } catch (e: Exception) {
            logger.error("Error fetching dashboard stats: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Get onboarding status for guided setup flow
     */
    @GetMapping("/onboarding")
    fun getOnboardingStatus(): ResponseEntity<com.chemsys.dto.OnboardingStatusDto> {
        return try {
            val status = dashboardService.getOnboardingStatus()
            ResponseEntity.ok(status)
        } catch (e: Exception) {
            logger.error("Error fetching onboarding status: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }
}









