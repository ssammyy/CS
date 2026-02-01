package com.chemsys.controller

import com.chemsys.dto.TenantTaxSettingsDto
import com.chemsys.dto.UpdateTaxSettingsRequest
import com.chemsys.service.TaxSettingsService
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * TaxSettingsController provides REST API endpoints for managing tenant tax settings
 */
@RestController
@RequestMapping("/api/tax-settings")
@CrossOrigin(origins = ["*"])
class TaxSettingsController(
    private val taxSettingsService: TaxSettingsService
) {

    companion object {
        private val logger = LoggerFactory.getLogger(TaxSettingsController::class.java)
    }

    /**
     * Get tax settings for the current tenant
     */
    @GetMapping
    fun getTaxSettings(): ResponseEntity<TenantTaxSettingsDto> {
        return try {
            val settings = taxSettingsService.getTaxSettings()
            ResponseEntity.ok(settings)
        } catch (e: Exception) {
            logger.error("Error fetching tax settings: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Update tax settings for the current tenant
     */
    @PutMapping
    fun updateTaxSettings(
        @Valid @RequestBody request: UpdateTaxSettingsRequest
    ): ResponseEntity<TenantTaxSettingsDto> {
        return try {
            val settings = taxSettingsService.updateTaxSettings(request)
            ResponseEntity.ok(settings)
        } catch (e: IllegalArgumentException) {
            logger.error("Invalid tax settings request: ${e.message}", e)
            ResponseEntity.badRequest().build()
        } catch (e: Exception) {
            logger.error("Error updating tax settings: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }
}
