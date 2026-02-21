package com.chemsys.controller

import com.chemsys.dto.ApproveRejectSaleEditRequestDto
import com.chemsys.dto.CreateSaleEditRequestDto
import com.chemsys.dto.SaleEditRequestDto
import com.chemsys.service.SaleEditRequestService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/sale-edit-requests")
class SaleEditRequestController(
    private val saleEditRequestService: SaleEditRequestService
) {

    @PostMapping
    fun create(@Valid @RequestBody dto: CreateSaleEditRequestDto): ResponseEntity<SaleEditRequestDto> {
        val created = saleEditRequestService.createRequest(dto)
        return ResponseEntity.ok(created)
    }

    @GetMapping("/pending")
    fun listPending(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<Map<String, Any>> {
        val (list, total) = saleEditRequestService.listPending(page, size)
        return ResponseEntity.ok(mapOf(
            "items" to list,
            "total" to total
        ))
    }

    @GetMapping("/pending/count")
    fun getPendingCount(): ResponseEntity<Map<String, Long>> {
        val count = saleEditRequestService.getPendingCount()
        return ResponseEntity.ok(mapOf("count" to count))
    }

    @PostMapping("/{id}/approve-reject")
    fun approveOrReject(
        @PathVariable id: UUID,
        @Valid @RequestBody dto: ApproveRejectSaleEditRequestDto
    ): ResponseEntity<SaleEditRequestDto> {
        val updated = saleEditRequestService.approveOrReject(id, dto)
        return ResponseEntity.ok(updated)
    }
}
