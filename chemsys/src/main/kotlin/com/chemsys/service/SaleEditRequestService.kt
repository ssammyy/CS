package com.chemsys.service

import com.chemsys.config.TenantContext
import com.chemsys.dto.*
import com.chemsys.entity.*
import com.chemsys.repository.*
import com.chemsys.entity.inventoryAuditLog
import org.slf4j.LoggerFactory
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import javax.persistence.EntityManager
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.OffsetDateTime
import java.util.*

/**
 * Maker-checker workflow for sale edits: cashier requests (price change or line delete), admin approves.
 * On approval: price change updates line and sale totals; line delete restores inventory and removes line.
 */
@Service
class SaleEditRequestService(
    private val saleEditRequestRepository: SaleEditRequestRepository,
    private val saleRepository: SaleRepository,
    private val saleLineItemRepository: SaleLineItemRepository,
    private val inventoryRepository: InventoryRepository,
    private val inventoryAuditLogRepository: InventoryAuditLogRepository,
    private val userRepository: UserRepository,
    private val entityManager: EntityManager
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    private fun getCurrentUser(): User {
        val username = SecurityContextHolder.getContext().authentication.name
        return userRepository.findByUsername(username)
            ?: throw IllegalStateException("Current user not found: $username")
    }

    @Transactional
    @PreAuthorize("hasRole('CASHIER') or hasRole('MANAGER')")
    fun createRequest(dto: CreateSaleEditRequestDto): SaleEditRequestDto {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw IllegalStateException("No tenant context")
        val user = getCurrentUser()
        val sale = saleRepository.findById(dto.saleId).orElseThrow { IllegalArgumentException("Sale not found") }
        if (sale.tenant.id != tenantId) throw IllegalArgumentException("Sale not found")
        if (sale.status != SaleStatus.COMPLETED) throw IllegalArgumentException("Only completed sales can be edited")
        val lineItem = saleLineItemRepository.findById(dto.saleLineItemId).orElseThrow { IllegalArgumentException("Line item not found") }
        if (lineItem.sale.id != sale.id) throw IllegalArgumentException("Line item does not belong to sale")
        val requestType = when (dto.requestType.uppercase()) {
            "PRICE_CHANGE" -> SaleEditRequestType.PRICE_CHANGE
            "LINE_DELETE" -> SaleEditRequestType.LINE_DELETE
            else -> throw IllegalArgumentException("Invalid request type: ${dto.requestType}")
        }
        if (requestType == SaleEditRequestType.PRICE_CHANGE && (dto.newUnitPrice == null || dto.newUnitPrice <= BigDecimal.ZERO))
            throw IllegalArgumentException("New unit price required for price change")
        val entity = SaleEditRequest(
            tenant = sale.tenant,
            sale = sale,
            saleLineItem = lineItem,
            requestType = requestType,
            editType = requestType,
            status = SaleEditRequestStatus.PENDING,
            newUnitPrice = dto.newUnitPrice,
            reason = dto.reason,
            requestedBy = user
        )
        val saved = saleEditRequestRepository.save(entity)
        return toDto(saved)
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('PLATFORM_ADMIN')")
    fun listPending(page: Int, size: Int): Pair<List<SaleEditRequestDto>, Long> {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw IllegalStateException("No tenant context")
        val pageable = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "requestedAt"))
        val pageResult = saleEditRequestRepository.findByTenantIdAndStatus(tenantId, SaleEditRequestStatus.PENDING, pageable)
        val count = saleEditRequestRepository.countByTenantIdAndStatus(tenantId, SaleEditRequestStatus.PENDING)
        return pageResult.content.map { toDto(it) } to count
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('PLATFORM_ADMIN')")
    fun getPendingCount(): Long {
        val tenantId = TenantContext.getCurrentTenant() ?: return 0
        return saleEditRequestRepository.countByTenantIdAndStatus(tenantId, SaleEditRequestStatus.PENDING)
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN') or hasRole('PLATFORM_ADMIN')")
    fun approveOrReject(requestId: UUID, dto: ApproveRejectSaleEditRequestDto): SaleEditRequestDto {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw IllegalStateException("No tenant context")
        val admin = getCurrentUser()
        val request = saleEditRequestRepository.findById(requestId).orElseThrow { IllegalArgumentException("Request not found") }
        if (request.tenant.id != tenantId) throw IllegalArgumentException("Request not found")
        if (request.status != SaleEditRequestStatus.PENDING) throw IllegalStateException("Request is no longer pending")
        val lineItem = request.saleLineItem
            ?: throw IllegalStateException("Line item required")
        if (dto.approved) {
            when (request.requestType) {
                SaleEditRequestType.PRICE_CHANGE -> applyPriceChange(request, lineItem, admin)
                SaleEditRequestType.LINE_DELETE -> applyLineDelete(request, lineItem, admin)
            }
            request.status = SaleEditRequestStatus.APPROVED
            request.approvedBy = admin
            request.approvedAt = OffsetDateTime.now()
            saleEditRequestRepository.save(request)
            return toDto(request)
        } else {
            request.status = SaleEditRequestStatus.REJECTED
            request.approvedBy = admin
            request.approvedAt = OffsetDateTime.now()
            request.rejectionReason = dto.rejectionReason
            saleEditRequestRepository.save(request)
            return toDto(request)
        }
    }

    private fun applyPriceChange(request: SaleEditRequest, lineItem: SaleLineItem, performedBy: User) {
        val newPrice = request.newUnitPrice ?: return
        val newLineTotal = newPrice.multiply(BigDecimal(lineItem.quantity)).setScale(2, RoundingMode.HALF_UP)
        saleLineItemRepository.updatePriceAndTotal(lineItem.id!!, newPrice, newLineTotal)
        // Flush and clear so findBySaleId in recalcAndUpdateSaleTotals sees updated line items (not cached old values)
        entityManager.flush()
        entityManager.clear()
        recalcAndUpdateSaleTotals(request.sale)
    }

    private fun applyLineDelete(request: SaleEditRequest, lineItem: SaleLineItem, performedBy: User) {
        restoreInventoryForLineDelete(lineItem, request.sale.saleNumber, performedBy)
        saleLineItemRepository.delete(lineItem)
        recalcAndUpdateSaleTotals(request.sale)
    }

    private fun restoreInventoryForLineDelete(lineItem: SaleLineItem, sourceRef: String, performedBy: User) {
        val inventoryList = if (lineItem.batchNumber != null)
            inventoryRepository.findByProductIdAndBranchIdAndBatchNumber(
                lineItem.product.id!!,
                lineItem.sale.branch.id!!,
                lineItem.batchNumber!!
            )
        else
            inventoryRepository.findByProductIdAndBranchId(lineItem.product.id!!, lineItem.sale.branch.id!!)
        val inventoryItem = inventoryList.minByOrNull { it.quantity } ?: inventoryList.firstOrNull()
        if (inventoryItem != null) {
            val qtyBefore = inventoryItem.quantity
            val qtyAfter = qtyBefore + lineItem.quantity
            val updated = inventoryItem.copy(
                quantity = qtyAfter,
                updatedAt = OffsetDateTime.now()
            )
            inventoryRepository.save(updated)
            val auditLog = inventoryAuditLog()
                .product(lineItem.product)
                .branch(lineItem.sale.branch)
                .tenant(lineItem.sale.tenant)
                .transactionType(TransactionType.RETURN)
                .quantityChanged(lineItem.quantity)
                .quantityBefore(qtyBefore)
                .quantityAfter(qtyAfter)
                .sourceReference(sourceRef)
                .sourceType(SourceType.SALE_EDIT)
                .performedBy(performedBy)
                .notes("Inventory restored after approved sale line delete (maker-checker)")
                .build()
            inventoryAuditLogRepository.save(auditLog)
        } else {
            logger.warn("No inventory found to restore for product ${lineItem.product.name} branch ${lineItem.sale.branch.name}")
        }
    }

    private fun recalcAndUpdateSaleTotals(sale: Sale) {
        val lineItems = saleLineItemRepository.findBySaleId(sale.id!!)
        val newSubtotal = lineItems.fold(BigDecimal.ZERO) { acc, li -> acc.add(li.lineTotal) }.setScale(2, RoundingMode.HALF_UP)
        val newTotal = newSubtotal
            .add(sale.taxAmount ?: BigDecimal.ZERO)
            .subtract(sale.discountAmount ?: BigDecimal.ZERO)
            .setScale(2, RoundingMode.HALF_UP)
        saleRepository.updateTotals(sale.id!!, newSubtotal, newTotal, OffsetDateTime.now())
    }

    private fun toDto(r: SaleEditRequest): SaleEditRequestDto {
        val sale = r.sale
        val lineItem = r.saleLineItem
        return SaleEditRequestDto(
            id = r.id!!,
            saleId = sale.id!!,
            saleNumber = sale.saleNumber,
            saleLineItemId = lineItem?.id,
            productName = lineItem?.product?.name,
            requestType = r.requestType.name,
            status = r.status.name,
            currentUnitPrice = lineItem?.unitPrice,
            newUnitPrice = r.newUnitPrice,
            quantity = lineItem?.quantity,
            reason = r.reason,
            requestedById = r.requestedBy.id!!,
            requestedByName = r.requestedBy.username,
            requestedAt = r.requestedAt,
            approvedById = r.approvedBy?.id,
            approvedByName = r.approvedBy?.username,
            approvedAt = r.approvedAt,
            rejectionReason = r.rejectionReason
        )
    }
}
