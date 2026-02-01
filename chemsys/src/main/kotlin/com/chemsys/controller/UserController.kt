package com.chemsys.controller

import com.chemsys.dto.CreateUserRequest
import com.chemsys.dto.UserManagementDto
import com.chemsys.dto.UpdateUserRequest
import com.chemsys.dto.RoleListResponse
import com.chemsys.dto.UserListResponse
import com.chemsys.service.UserService
import jakarta.validation.Valid
import org.springframework.data.domain.PageRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/users")
class UserController(
    private val userService: UserService
) {

    @PostMapping
    fun createUser(@Valid @RequestBody request: CreateUserRequest): ResponseEntity<UserManagementDto> {
        val user = userService.createUser(request)
        return ResponseEntity.ok(user)
    }

    @GetMapping
    fun getAllUsers(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<UserListResponse> {
        val pageable = PageRequest.of(page, size)
        val response = userService.getAllUsers(pageable)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/{id}")
    fun getUserById(@PathVariable id: String): ResponseEntity<UserManagementDto> {
        val user = userService.getUserById(java.util.UUID.fromString(id))
        return ResponseEntity.ok(user)
    }

    @PatchMapping("/{id}")
    fun updateUser(@PathVariable id: String, @Valid @RequestBody request: UpdateUserRequest): ResponseEntity<UserManagementDto> {
        val user = userService.updateUser(java.util.UUID.fromString(id), request)
        return ResponseEntity.ok(user)
    }

    @DeleteMapping("/{id}")
    fun deleteUser(@PathVariable id: String): ResponseEntity<Void> {
        userService.deleteUser(java.util.UUID.fromString(id))
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/roles")
    fun listRoles(): ResponseEntity<RoleListResponse> {
        return ResponseEntity.ok(userService.listAvailableRoles())
    }

    @PatchMapping("/me")
    fun updateMe(@Valid @RequestBody request: UpdateUserRequest): ResponseEntity<UserManagementDto> {
        return ResponseEntity.ok(userService.updateCurrentUser(request))
    }
}
