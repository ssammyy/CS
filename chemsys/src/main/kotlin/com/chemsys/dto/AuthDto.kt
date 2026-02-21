package com.chemsys.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.util.*

data class LoginRequest(
    @field:NotBlank(message = "Username is required")
    val username: String,
    
    @field:NotBlank(message = "Password is required")
    val password: String
)

data class LoginResponse(
    val token: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long,
    val user: UserDto,
    val requiresPasswordChange: Boolean = false
)

data class ChangePasswordRequest(
    @field:NotBlank(message = "Current password is required")
    val currentPassword: String,

    @field:NotBlank(message = "New password is required")
    @field:Size(min = 6, message = "New password must be at least 6 characters")
    val newPassword: String
)

/**
 * Public signup request used to self-register a new tenant and its admin user.
 * - All fields are validated to ensure basic integrity.
 */
data class SignupRequest(
    @field:NotBlank(message = "Tenant name is required")
    @field:Size(min = 2, max = 255, message = "Tenant name must be between 2 and 255 characters")
    val tenantName: String,

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

/**
 * Response returned upon successful signup.
 * It intentionally excludes sensitive data and tokens to encourage explicit login afterwards.
 */
data class SignupResponse(
    val tenantId: UUID,
    val tenantName: String,
    val adminUsername: String,
    val adminEmail: String
)
data class UserDto(
    val id: UUID,
    val username: String,
    val email: String,
    val role: String,
    val tenantId: UUID,
    val tenantName: String,
    val isActive: Boolean
)
