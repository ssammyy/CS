package com.chemsys.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Size
import java.time.OffsetDateTime
import java.util.*

data class CreateTenantRequest(
    @field:NotBlank(message = "Tenant name is required")
    @field:Size(min = 2, max = 255, message = "Tenant name must be between 2 and 255 characters")
    val name: String,
    
    @field:NotBlank(message = "Admin username is required")
    @field:Size(min = 3, max = 50, message = "Admin username must be between 3 and 50 characters")
    val adminUsername: String,
    
    @field:NotBlank(message = "Admin password is required")
    @field:Size(min = 6, message = "Admin password must be at least 6 characters")
    val adminPassword: String,
    
    @field:NotBlank(message = "Admin email is required")
    @field:Email(message = "Admin email must be valid")
    val adminEmail: String
)

data class TenantDto(
    val id: UUID,
    val name: String,
    val createdAt: OffsetDateTime
)

data class TenantListResponse(
    val tenants: List<TenantDto>,
    val totalCount: Long
)
