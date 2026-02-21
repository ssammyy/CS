package com.chemsys.service

import com.chemsys.dto.ChangePasswordRequest
import com.chemsys.dto.LoginRequest
import com.chemsys.dto.LoginResponse
import com.chemsys.dto.SignupRequest
import com.chemsys.dto.SignupResponse
import com.chemsys.dto.UserDto
import com.chemsys.entity.Tenant
import com.chemsys.entity.User
import com.chemsys.entity.UserRole
import com.chemsys.repository.TenantRepository
import com.chemsys.repository.UserRepository
import com.chemsys.security.JwtService
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class AuthService(
    private val authenticationManager: AuthenticationManager,
    private val tenantRepository: TenantRepository,
    private val userRepository: UserRepository,
    private val jwtService: JwtService,
    private val passwordEncoder: PasswordEncoder
) {

    companion object {
        private val logger = LoggerFactory.getLogger(AuthService::class.java)
    }

    fun login(request: LoginRequest): LoginResponse {
        authenticationManager.authenticate(
            UsernamePasswordAuthenticationToken(request.username, request.password)
        )
        val user = userRepository.findByUsername(request.username)
            ?: throw RuntimeException("User not found after authentication")
        
        val token = jwtService.generateToken(
            username = user.username,
            tenantId = user.tenant.id!!,
            role = user.role.name
        )
        
        return LoginResponse(
            token = token,
            expiresIn = 86400000, // 24 hours
            user = UserDto(
                id = user.id!!,
                username = user.username,
                email = user.email,
                role = user.role.name,
                tenantId = user.tenant.id!!,
                tenantName = user.tenant.name,
                isActive = user.isActive
            ),
            requiresPasswordChange = user.mustChangePassword
        )
    }

    /**
     * Change password for the authenticated user. Used for force-reset-on-first-login.
     * Verifies current password, updates to new password, and clears mustChangePassword.
     */
    @Transactional
    fun changePassword(request: ChangePasswordRequest) {
        val username = SecurityContextHolder.getContext().authentication?.name
            ?: throw RuntimeException("Not authenticated")
        val user = userRepository.findByUsername(username)
            ?: throw RuntimeException("User not found")
        if (!passwordEncoder.matches(request.currentPassword, user.passwordHash)) {
            throw RuntimeException("Current password is incorrect")
        }
        userRepository.updatePasswordAndClearMustChange(
            user.id!!,
            passwordEncoder.encode(request.newPassword)
        )
    }

    /**
     * Public signup flow. Creates a new `Tenant` and its admin `User` in a single transaction.
     * Admin user gets role ADMIN and can proceed to login normally.
     */
    @Transactional
    fun signup(request: SignupRequest): SignupResponse {
        if (tenantRepository.existsByName(request.tenantName)) {
            throw RuntimeException("Tenant with name '${request.tenantName}' already exists")
        }
        if (userRepository.existsByUsername(request.adminUsername)) {
            throw RuntimeException("Username '${request.adminUsername}' already exists")
        }
        if (userRepository.existsByEmail(request.adminEmail)) {
            throw RuntimeException("Email '${request.adminEmail}' already exists")
        }

        val tenant = tenantRepository.save(Tenant(name = request.tenantName))

        val adminUser = User(
            username = request.adminUsername,
            passwordHash = passwordEncoder.encode(request.adminPassword),
            email = request.adminEmail,
            tenant = tenant,
            role = UserRole.ADMIN,
            isActive = true
        )

        try {
            userRepository.save(adminUser)
        } catch (ex: DataIntegrityViolationException) {
            logger.error("Error during signup: ${ex.message}", ex)
            throw RuntimeException("Username or email already exists globally", ex)
        }

        return SignupResponse(
            tenantId = tenant.id!!,
            tenantName = tenant.name,
            adminUsername = adminUser.username,
            adminEmail = adminUser.email
        )
    }
}
