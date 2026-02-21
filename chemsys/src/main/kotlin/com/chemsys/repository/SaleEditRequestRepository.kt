package com.chemsys.repository

import com.chemsys.entity.SaleEditRequest
import com.chemsys.entity.SaleEditRequestStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface SaleEditRequestRepository : JpaRepository<SaleEditRequest, UUID> {

    fun findByTenantIdAndStatus(tenantId: UUID, status: SaleEditRequestStatus, pageable: Pageable): Page<SaleEditRequest>
    fun countByTenantIdAndStatus(tenantId: UUID, status: SaleEditRequestStatus): Long
    fun findBySaleId(saleId: UUID): List<SaleEditRequest>
}
