package com.chemsys.controller

import com.chemsys.dto.*
import com.chemsys.service.BranchService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*
import jakarta.validation.Valid

@RestController
@RequestMapping("/api/branches")
class BranchController(
    private val branchService: BranchService
) {

    @PostMapping
    fun createBranch(@Valid @RequestBody request: CreateBranchRequest): ResponseEntity<BranchDto> {
        val branch = branchService.createBranch(request)
        return ResponseEntity.ok(branch)
    }

    @GetMapping
    fun getAllBranches(): ResponseEntity<BranchListResponse> {
        val branches = branchService.getAllBranches()
        return ResponseEntity.ok(branches)
    }

    @GetMapping("/{id}")
    fun getBranchById(@PathVariable id: UUID): ResponseEntity<BranchDto> {
        val branch = branchService.getBranchById(id)
        return ResponseEntity.ok(branch)
    }

    @PutMapping("/{id}")
    fun updateBranch(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateBranchRequest
    ): ResponseEntity<BranchDto> {
        val branch = branchService.updateBranch(id, request)
        return ResponseEntity.ok(branch)
    }

    @DeleteMapping("/{id}")
    fun deleteBranch(@PathVariable id: UUID): ResponseEntity<Unit> {
        branchService.deleteBranch(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/assign-user")
    fun assignUserToBranch(@Valid @RequestBody request: AssignUserToBranchRequest): ResponseEntity<UserBranchAssignmentDto> {
        val assignment = branchService.assignUserToBranch(request)
        return ResponseEntity.ok(assignment)
    }

    @DeleteMapping("/remove-user")
    fun removeUserFromBranch(@Valid @RequestBody request: RemoveUserFromBranchRequest): ResponseEntity<Unit> {
        branchService.removeUserFromBranch(request)
        return ResponseEntity.noContent().build()
    }

    @PutMapping("/update-primary")
    fun updateUserBranchPrimary(@Valid @RequestBody request: UpdateUserBranchPrimaryRequest): ResponseEntity<UserBranchAssignmentDto> {
        val assignment = branchService.updateUserBranchPrimary(request)
        return ResponseEntity.ok(assignment)
    }

    @GetMapping("/{branchId}/users")
    fun getBranchUsers(@PathVariable branchId: UUID): ResponseEntity<List<UserBranchAssignmentDto>> {
        val users = branchService.getBranchUsers(branchId)
        return ResponseEntity.ok(users)
    }

    @GetMapping("/users/{userId}")
    fun getUserBranches(@PathVariable userId: UUID): ResponseEntity<List<UserBranchAssignmentDto>> {
        val branches = branchService.getUserBranches(userId)
        return ResponseEntity.ok(branches)
    }
}
