package com.chemsys.controller

import com.chemsys.dto.CreateTenantRequest
import com.chemsys.dto.TenantDto
import com.chemsys.dto.TenantListResponse
import java.util.*
import com.chemsys.service.TenantService
import jakarta.validation.Valid
import org.springframework.data.domain.PageRequest
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/tenants")
class TenantController(
    private val tenantService: TenantService
) {
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    @PostMapping
    fun createTenant(@Valid @RequestBody request: CreateTenantRequest): ResponseEntity<TenantDto> {
        val tenant = tenantService.createTenant(request)
        return ResponseEntity.ok(tenant)
    }

    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    @GetMapping
    fun getAllTenants(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<TenantListResponse> {
        val pageable = PageRequest.of(page, size)
        val response = tenantService.getAllTenants(pageable)
        return ResponseEntity.ok(response)
    }

    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    @GetMapping("/{id}")
    fun getTenantById(@PathVariable id: String): ResponseEntity<TenantDto> {
        val tenant = tenantService.getTenantById(java.util.UUID.fromString(id))
        return ResponseEntity.ok(tenant)
    }
}
