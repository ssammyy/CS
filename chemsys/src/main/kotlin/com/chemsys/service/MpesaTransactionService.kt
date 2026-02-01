package com.chemsys.service

import com.chemsys.config.TenantContext
import com.chemsys.dto.InitiateMpesaPaymentRequest
import com.chemsys.dto.MpesaPaymentResponse
import com.chemsys.dto.MpesaTransactionDto
import com.chemsys.dto.MpesaTransactionStatusResponse
import com.chemsys.entity.MpesaTransaction
import com.chemsys.entity.MpesaTransactionStatus
import com.chemsys.repository.MpesaTransactionRepository
import com.chemsys.repository.SaleRepository
import com.chemsys.repository.TenantRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.*

/**
 * Service for managing M-Pesa transactions
 */
@Service
class MpesaTransactionService(
    private val mpesaTransactionRepository: MpesaTransactionRepository,
    private val mpesaApiService: MpesaApiService,
    private val mpesaConfigService: MpesaConfigurationService,
    private val saleRepository: SaleRepository,
    private val tenantRepository: TenantRepository
) {

    companion object {
        private val logger = LoggerFactory.getLogger(MpesaTransactionService::class.java)
    }

    /**
     * Initiate STK Push payment for a sale
     */
    @Transactional
    fun initiateMpesaPayment(request: InitiateMpesaPaymentRequest): MpesaPaymentResponse {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        // Verify M-Pesa is enabled
        if (!mpesaConfigService.isMpesaEnabled(tenantId)) {
            throw RuntimeException("M-Pesa is not enabled for this tenant")
        }

        // Get sale
        val sale = saleRepository.findById(UUID.fromString(request.saleId))
            .orElseThrow { RuntimeException("Sale not found") }

        // Verify sale belongs to current tenant
        if (sale.tenant.id != tenantId) {
            throw RuntimeException("Sale does not belong to this tenant")
        }

        // Get till number (branch-specific or default)
        val branchId = request.branchId?.let { UUID.fromString(it) } ?: sale.branch.id
        val tillNumber = mpesaConfigService.getTillNumberForBranch(branchId!!, tenantId)
            ?: throw RuntimeException("M-Pesa till number not configured for this branch")

        // Validate phone number (Kenya format: 254...)
        val normalizedPhone = normalizePhoneNumber(request.phoneNumber)
        if (!isValidKenyanPhoneNumber(normalizedPhone)) {
            throw RuntimeException("Invalid Kenyan phone number")
        }

        try {
            // Create transaction record first
            val transaction = MpesaTransaction(
                id = UUID.randomUUID(),
                sale = sale,
                tenant = sale.tenant,
                phoneNumber = normalizedPhone,
                amount = java.math.BigDecimal(request.amount.toString()),
                tillNumber = tillNumber,
                status = MpesaTransactionStatus.PENDING,
                checkoutRequestId = null,
                mpesaReceiptNumber = null,
                errorCode = null,
                errorMessage = null,
                requestedAt = OffsetDateTime.now()
            )

            val savedTransaction = mpesaTransactionRepository.save(transaction)

            // Call Daraja API to initiate STK Push
            val callbackUrl = "${System.getenv("APP_BASE_URL") ?: "http://localhost:8080"}/api/mpesa/callback"
            val stkResponse = mpesaApiService.initiateStkPush(
                phoneNumber = normalizedPhone,
                amount = request.amount,
                accountReference = sale.saleNumber,
                transactionDesc = "Payment for sale ${sale.saleNumber}",
                callbackUrl = callbackUrl
            )

            // Update transaction with checkout request ID
            savedTransaction.checkoutRequestId = stkResponse.CheckoutRequestID
            mpesaTransactionRepository.save(savedTransaction)

            logger.info("STK Push initiated for sale: ${sale.saleNumber}, transaction: ${savedTransaction.id}")

            return MpesaPaymentResponse(
                transactionId = savedTransaction.id!!,
                checkoutRequestId = stkResponse.CheckoutRequestID ?: "",
                status = stkResponse.ResponseCode ?: "0",
                message = stkResponse.ResponseDescription ?: stkResponse.CustomerMessage ?: "STK Push initiated"
            )

        } catch (e: Exception) {
            logger.error("Failed to initiate M-Pesa payment", e)
            throw RuntimeException("Failed to initiate payment: ${e.message}")
        }
    }

    /**
     * Get transaction status
     */
    fun getTransactionStatus(transactionId: UUID): MpesaTransactionStatusResponse {
        val transaction = mpesaTransactionRepository.findById(transactionId)
            .orElseThrow { RuntimeException("Transaction not found") }

        // Verify current tenant owns this transaction
        val tenantId = TenantContext.getCurrentTenant()
        if (transaction.tenant.id != tenantId) {
            throw RuntimeException("Unauthorized access to transaction")
        }

        return MpesaTransactionStatusResponse(
            transactionId = transaction.id!!,
            status = transaction.status.name,
            mpesaReceiptNumber = transaction.mpesaReceiptNumber,
            completedAt = transaction.completedAt,
            errorCode = transaction.errorCode,
            errorMessage = transaction.errorMessage
        )
    }

    /**
     * Get transaction by checkout request ID
     * Used when processing callbacks from Safaricom
     */
    fun getTransactionByCheckoutId(checkoutRequestId: String): MpesaTransaction? {
        return mpesaTransactionRepository.findByCheckoutRequestId(checkoutRequestId)
    }

    /**
     * Get transaction by sale ID
     */
    fun getTransactionBySaleId(saleId: UUID): MpesaTransaction? {
        return mpesaTransactionRepository.findBySaleId(saleId)
    }

    /**
     * Update transaction status based on callback
     */
    @Transactional
    fun updateTransactionStatus(
        checkoutRequestId: String,
        status: MpesaTransactionStatus,
        mpesaReceiptNumber: String? = null,
        errorCode: String? = null,
        errorMessage: String? = null
    ): MpesaTransaction {
        val transaction = mpesaTransactionRepository.findByCheckoutRequestId(checkoutRequestId)
            ?: throw RuntimeException("Transaction not found for checkout request: $checkoutRequestId")

        transaction.status = status
        transaction.mpesaReceiptNumber = mpesaReceiptNumber
        transaction.errorCode = errorCode
        transaction.errorMessage = errorMessage
        transaction.completedAt = OffsetDateTime.now()
        transaction.callbackReceived = true

        val updated = mpesaTransactionRepository.save(transaction)
        logger.info("Transaction status updated: $checkoutRequestId -> $status")

        return updated
    }

    /**
     * Get transaction history for current tenant
     */
    fun getTransactionHistory(limit: Int = 50): List<MpesaTransactionDto> {
        val tenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        return mpesaTransactionRepository.findByTenantIdOrderByRequestedAtDesc(tenantId)
            .take(limit)
            .map { mapToDto(it) }
    }

    /**
     * Normalize phone number to international format
     * Input: 0712345678 or 712345678 or 254712345678
     * Output: 254712345678
     */
    private fun normalizePhoneNumber(phone: String): String {
        var normalized = phone.replace(" ", "").replace("-", "")

        // Remove leading 0 if present
        if (normalized.startsWith("0")) {
            normalized = normalized.substring(1)
        }

        // Add country code if not present
        if (!normalized.startsWith("254")) {
            normalized = "254$normalized"
        }

        return normalized
    }

    /**
     * Validate Kenyan phone number
     * Must start with 254 and have 12 digits total
     */
    private fun isValidKenyanPhoneNumber(phone: String): Boolean {
        return phone.matches(Regex("^254[17]\\d{8}$"))
    }

    /**
     * Map entity to DTO
     */
    private fun mapToDto(entity: MpesaTransaction): MpesaTransactionDto {
        return MpesaTransactionDto(
            id = entity.id!!,
            saleId = entity.sale.id!!,
            phoneNumber = entity.phoneNumber,
            amount = entity.amount,
            tillNumber = entity.tillNumber,
            status = entity.status.name,
            checkoutRequestId = entity.checkoutRequestId,
            mpesaReceiptNumber = entity.mpesaReceiptNumber,
            errorCode = entity.errorCode,
            errorMessage = entity.errorMessage,
            requestedAt = entity.requestedAt,
            completedAt = entity.completedAt,
            callbackReceived = entity.callbackReceived
        )
    }
}
