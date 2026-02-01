package com.chemsys.controller

import com.chemsys.service.MpesaConfigurationService
import com.chemsys.dto.MpesaConfigurationDto
import com.chemsys.repository.TenantRepository
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.*

/**
 * Admin controller for platform-level operations
 * Only accessible to PLATFORM_ADMIN role
 */
@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
class AdminController(
    private val mpesaConfigService: MpesaConfigurationService,
    private val tenantRepository: TenantRepository
) {

    companion object {
        private val logger = LoggerFactory.getLogger(AdminController::class.java)
    }

    /**
     * Enable M-Pesa feature for a specific tenant
     */
    @PutMapping("/mpesa/enable-tier/{tenantId}")
    fun enableMpesaTierForTenant(
        @PathVariable tenantId: UUID
    ): ResponseEntity<Map<String, Any>> {
        return try {
            // Verify tenant exists
            val tenant = tenantRepository.findById(tenantId)
                .orElseThrow { RuntimeException("Tenant not found") }

            val config = mpesaConfigService.enableMpesaTierForTenant(tenantId)
            logger.info("M-Pesa tier enabled for tenant: ${tenant.name}")

            ResponseEntity.ok(mapOf(
                "success" to true,
                "message" to "M-Pesa tier enabled for tenant: ${tenant.name}",
                "tenantName" to tenant.name,
                "tierEnabled" to config.tierEnabled
            ))
        } catch (e: Exception) {
            logger.error("Error enabling M-Pesa tier for tenant $tenantId: ${e.message}")
            ResponseEntity.badRequest().body(mapOf(
                "success" to false,
                "message" to "Failed to enable M-Pesa tier: ${e.message}"
            ))
        }
    }

    /**
     * Disable M-Pesa feature for a specific tenant
     */
    @PutMapping("/mpesa/disable-tier/{tenantId}")
    fun disableMpesaTierForTenant(
        @PathVariable tenantId: UUID
    ): ResponseEntity<Map<String, Any>> {
        return try {
            // Verify tenant exists
            val tenant = tenantRepository.findById(tenantId)
                .orElseThrow { RuntimeException("Tenant not found") }

            val config = mpesaConfigService.disableMpesaTierForTenant(tenantId)
            logger.info("M-Pesa tier disabled for tenant: ${tenant.name}")

            ResponseEntity.ok(mapOf(
                "success" to true,
                "message" to "M-Pesa tier disabled for tenant: ${tenant.name}",
                "tenantName" to tenant.name,
                "tierEnabled" to config.tierEnabled
            ))
        } catch (e: Exception) {
            logger.error("Error disabling M-Pesa tier for tenant $tenantId: ${e.message}")
            ResponseEntity.badRequest().body(mapOf(
                "success" to false,
                "message" to "Failed to disable M-Pesa tier: ${e.message}"
            ))
        }
    }

    /**
     * Get M-Pesa configuration for a specific tenant
     */
    @GetMapping("/mpesa/config/{tenantId}")
    fun getMpesaConfiguration(
        @PathVariable tenantId: UUID
    ): ResponseEntity<Map<String, Any>> {
        return try {
            // Verify tenant exists
            val tenant = tenantRepository.findById(tenantId)
                .orElseThrow { RuntimeException("Tenant not found") }

            val config = mpesaConfigService.getMpesaConfigurationForTenant(tenantId)

            ResponseEntity.ok(mapOf(
                "success" to true,
                "tenantName" to tenant.name,
                "config" to config
            ))
        } catch (e: Exception) {
            logger.error("Error getting M-Pesa config for tenant $tenantId: ${e.message}")
            ResponseEntity.badRequest().body(mapOf(
                "success" to false,
                "message" to "Failed to get M-Pesa configuration: ${e.message}"
            ))
        }
    }

    /**
     * Get all tenants
     */
    @GetMapping("/tenants")
    fun getAllTenants(): ResponseEntity<Map<String, Any>> {
        return try {
            val tenants = tenantRepository.findAll().map { tenant ->
                mapOf(
                    "id" to tenant.id,
                    "name" to tenant.name,
                    "createdAt" to tenant.createdAt
                )
            }

            ResponseEntity.ok(mapOf(
                "success" to true,
                "count" to tenants.size,
                "tenants" to tenants
            ))
        } catch (e: Exception) {
            logger.error("Error fetching tenants: ${e.message}")
            ResponseEntity.badRequest().body(mapOf(
                "success" to false,
                "message" to "Failed to fetch tenants: ${e.message}"
            ))
        }
    }

    /**
     * Get tenant details
     */
    @GetMapping("/tenants/{tenantId}")
    fun getTenantDetails(
        @PathVariable tenantId: UUID
    ): ResponseEntity<Map<String, Any>> {
        return try {
            val tenant = tenantRepository.findById(tenantId)
                .orElseThrow { RuntimeException("Tenant not found") }

            ResponseEntity.ok(mapOf(
                "success" to true,
                "tenant" to mapOf(
                    "id" to tenant.id,
                    "name" to tenant.name,
                    "createdAt" to tenant.createdAt
                )
            ))
        } catch (e: Exception) {
            logger.error("Error fetching tenant $tenantId: ${e.message}")
            ResponseEntity.badRequest().body(mapOf(
                "success" to false,
                "message" to "Failed to fetch tenant: ${e.message}"
            ))
        }
    }
}
