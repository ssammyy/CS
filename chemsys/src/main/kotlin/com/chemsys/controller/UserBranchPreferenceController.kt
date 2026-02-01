package com.chemsys.controller

import com.chemsys.dto.*
import com.chemsys.service.UserBranchPreferenceService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

/**
 * REST controller for managing user branch preferences and context.
 * This controller provides endpoints for:
 * - Setting user's preferred branch
 * - Updating last selected branch (for context tracking)
 * - Getting user's current branch context
 * - Managing branch preferences
 */
@RestController
@RequestMapping("/api/user-branch-preferences")
class UserBranchPreferenceController(
    private val userBranchPreferenceService: UserBranchPreferenceService
) {
    
    /**
     * Set a user's branch preference
     */
    @PostMapping("/{userId}/preferences")
    fun setBranchPreference(
        @PathVariable userId: UUID,
        @RequestBody request: SetBranchPreferenceRequest
    ): ResponseEntity<UserBranchPreferenceResponse> {
        val response = userBranchPreferenceService.setBranchPreference(userId, request)
        return ResponseEntity.ok(response)
    }
    
    /**
     * Update user's last selected branch (for context tracking)
     */
    @PutMapping("/{userId}/last-selected")
    fun updateLastSelectedBranch(
        @PathVariable userId: UUID,
        @RequestBody request: UpdateLastSelectedBranchRequest
    ): ResponseEntity<UserBranchPreferenceResponse> {
        val response = userBranchPreferenceService.updateLastSelectedBranch(userId, request)
        return ResponseEntity.ok(response)
    }
    
    /**
     * Get user's current branch context
     */
    @GetMapping("/{userId}/context")
    fun getUserBranchContext(
        @PathVariable userId: UUID
    ): ResponseEntity<UserBranchContextResponse> {
        val response = userBranchPreferenceService.getUserBranchContext(userId)
        return ResponseEntity.ok(response)
    }
    
    /**
     * Get user's preferred branch
     */
    @GetMapping("/{userId}/preferred")
    fun getUserPreferredBranch(
        @PathVariable userId: UUID
    ): ResponseEntity<UserBranchPreferenceResponse?> {
        val response = userBranchPreferenceService.getUserPreferredBranch(userId)
        return ResponseEntity.ok(response)
    }
    
    /**
     * Clear user's branch preferences for current tenant
     */
    @DeleteMapping("/{userId}/preferences")
    fun clearUserBranchPreferences(
        @PathVariable userId: UUID
    ): ResponseEntity<Unit> {
        userBranchPreferenceService.clearUserBranchPreferences(userId)
        return ResponseEntity.ok().build()
    }
}
