package com.chemsys.repository

import com.chemsys.entity.BranchMpesaTill
import com.chemsys.entity.MpesaConfiguration
import com.chemsys.entity.MpesaTransaction
import com.chemsys.entity.MpesaTransactionStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

/**
 * Repository for M-Pesa Configuration
 */
@Repository
interface MpesaConfigurationRepository : JpaRepository<MpesaConfiguration, UUID> {
    /**
     * Find M-Pesa configuration by tenant ID
     */
    fun findByTenantId(tenantId: UUID): MpesaConfiguration?

    /**
     * Check if M-Pesa is enabled for a tenant
     */
    fun existsByTenantIdAndEnabledTrue(tenantId: UUID): Boolean
}

/**
 * Repository for Branch M-Pesa Till Numbers
 */
@Repository
interface BranchMpesaTillRepository : JpaRepository<BranchMpesaTill, UUID> {
    /**
     * Find till number for a specific branch
     */
    fun findByBranchIdAndMpesaConfigTenantId(branchId: UUID, tenantId: UUID): BranchMpesaTill?

    /**
     * Find all till numbers for a tenant
     */
    fun findByMpesaConfigTenantId(tenantId: UUID): List<BranchMpesaTill>

    /**
     * Check if till number exists for a branch
     */
    fun existsByBranchIdAndMpesaConfigTenantId(branchId: UUID, tenantId: UUID): Boolean
}

/**
 * Repository for M-Pesa Transactions
 */
@Repository
interface MpesaTransactionRepository : JpaRepository<MpesaTransaction, UUID> {
    /**
     * Find transaction by checkout request ID (from Daraja API)
     */
    fun findByCheckoutRequestId(checkoutRequestId: String): MpesaTransaction?

    /**
     * Find transaction by sale ID
     */
    fun findBySaleId(saleId: UUID): MpesaTransaction?

    /**
     * Find all transactions for a tenant
     */
    fun findByTenantIdOrderByRequestedAtDesc(tenantId: UUID): List<MpesaTransaction>

    /**
     * Find pending transactions (for retry logic)
     */
    fun findByStatusAndTenantId(status: MpesaTransactionStatus, tenantId: UUID): List<MpesaTransaction>

    /**
     * Find transactions awaiting callback
     */
    fun findByCallbackReceivedFalseAndStatusIn(statuses: List<MpesaTransactionStatus>): List<MpesaTransaction>
}
