package com.chemsys.dto

import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

/**
 * DTO for M-Pesa configuration
 */
data class MpesaConfigurationDto(
    val id: UUID,
    val tenantId: UUID,
    val enabled: Boolean,
    val tierEnabled: Boolean,
    val defaultTillNumber: String?,
    val branchTillNumbers: List<BranchMpesaTillDto> = emptyList(),
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime?
)

/**
 * DTO for branch-specific M-Pesa till number
 */
data class BranchMpesaTillDto(
    val id: UUID,
    val branchId: UUID,
    val branchName: String,
    val tillNumber: String,
    val createdAt: OffsetDateTime,
    val updatedAt: OffsetDateTime?
)

/**
 * Request DTO for updating M-Pesa configuration
 */
data class UpdateMpesaConfigRequest(
    val enabled: Boolean? = null,
    val defaultTillNumber: String? = null,
    val branchTillNumbers: List<UpdateBranchTillRequest> = emptyList()
)

/**
 * Request DTO for updating branch till number
 */
data class UpdateBranchTillRequest(
    val branchId: String,
    val tillNumber: String
)

/**
 * Request DTO to initiate STK Push payment
 */
data class InitiateMpesaPaymentRequest(
    val saleId: String,
    val phoneNumber: String,
    val amount: BigDecimal,
    val branchId: String?
)

/**
 * Response DTO from STK Push initiation
 */
data class MpesaPaymentResponse(
    val transactionId: UUID,
    val checkoutRequestId: String,
    val status: String,
    val message: String
)

/**
 * DTO for M-Pesa transaction
 */
data class MpesaTransactionDto(
    val id: UUID,
    val saleId: UUID,
    val phoneNumber: String,
    val amount: BigDecimal,
    val tillNumber: String,
    val status: String,
    val checkoutRequestId: String?,
    val mpesaReceiptNumber: String?,
    val errorCode: String?,
    val errorMessage: String?,
    val requestedAt: OffsetDateTime,
    val completedAt: OffsetDateTime?,
    val callbackReceived: Boolean
)

/**
 * Request DTO for M-Pesa callback from Safaricom
 */
data class MpesaCallbackRequest(
    val Body: MpesaCallbackBody
)

data class MpesaCallbackBody(
    val stkCallback: StkCallback
)

data class StkCallback(
    val MerchantRequestID: String,
    val CheckoutRequestID: String,
    val ResultCode: Int,
    val ResultDesc: String,
    val CallbackMetadata: CallbackMetadata? = null
)

data class CallbackMetadata(
    val Item: List<MetadataItem> = emptyList()
)

data class MetadataItem(
    val Name: String,
    val Value: Any? = null
)

/**
 * Query DTO to get transaction status
 */
data class MpesaTransactionStatusResponse(
    val transactionId: UUID,
    val status: String,
    val mpesaReceiptNumber: String?,
    val completedAt: OffsetDateTime?,
    val errorCode: String?,
    val errorMessage: String?
)
