package com.chemsys.controller

import com.chemsys.dto.LoginRequest
import com.chemsys.dto.LoginResponse
import com.chemsys.dto.SignupRequest
import com.chemsys.dto.SignupResponse
import com.chemsys.service.AuthService
import com.chemsys.security.JwtService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.User
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/auth")
class AuthController(
    private val authService: AuthService,
    private val jwtService: JwtService
) {

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<LoginResponse> {
        val response = authService.login(request)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/signup")
    fun signup(@Valid @RequestBody request: SignupRequest): ResponseEntity<SignupResponse> {
        val response = authService.signup(request)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/me")
    fun me(@AuthenticationPrincipal principal: User?): ResponseEntity<Map<String, Any>> {
        if (principal == null) return ResponseEntity.status(401).build()
        val body = mapOf(
            "username" to principal.username,
            "authorities" to principal.authorities.map { it.authority }
        )
        return ResponseEntity.ok(body)
    }
}
