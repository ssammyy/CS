package com.chemsys.controller

import com.chemsys.dto.*
import com.chemsys.service.MpesaConfigurationService
import com.chemsys.service.MpesaTransactionService
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

/**
 * MpesaController provides REST API endpoints for M-Pesa integration
 */
@RestController
@RequestMapping("/api/mpesa")
@CrossOrigin(origins = ["*"])
class MpesaController(
    private val mpesaConfigService: MpesaConfigurationService,
    private val mpesaTransactionService: MpesaTransactionService
) {

    companion object {
        private val logger = LoggerFactory.getLogger(MpesaController::class.java)
    }

    /**
     * Get M-Pesa configuration for current tenant
     */
    @GetMapping("/config")
    fun getMpesaConfig(): ResponseEntity<MpesaConfigurationDto> {
        return try {
            val config = mpesaConfigService.getMpesaConfiguration()
            ResponseEntity.ok(config)
        } catch (e: Exception) {
            logger.error("Error fetching M-Pesa configuration: ${e.message}")
            ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Update M-Pesa configuration for current tenant
     */
    @PutMapping("/config")
    fun updateMpesaConfig(
        @Valid @RequestBody request: UpdateMpesaConfigRequest
    ): ResponseEntity<MpesaConfigurationDto> {
        return try {
            val config = mpesaConfigService.updateMpesaConfiguration(request)
            ResponseEntity.ok(config)
        } catch (e: Exception) {
            logger.error("Error updating M-Pesa configuration: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Initiate STK Push payment
     */
    @PostMapping("/initiate-payment")
    fun initiateMpesaPayment(
        @Valid @RequestBody request: InitiateMpesaPaymentRequest
    ): ResponseEntity<MpesaPaymentResponse> {
        return try {
            val response = mpesaTransactionService.initiateMpesaPayment(request)
            ResponseEntity.ok(response)
        } catch (e: IllegalArgumentException) {
            logger.error("Invalid request: ${e.message}")
            ResponseEntity.badRequest().build()
        } catch (e: Exception) {
            logger.error("Error initiating M-Pesa payment: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Get transaction status
     */
    @GetMapping("/transaction/{transactionId}")
    fun getTransactionStatus(
        @PathVariable transactionId: String
    ): ResponseEntity<MpesaTransactionStatusResponse> {
        return try {
            val status = mpesaTransactionService.getTransactionStatus(UUID.fromString(transactionId))
            ResponseEntity.ok(status)
        } catch (e: Exception) {
            logger.error("Error fetching transaction status: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Get transaction history for current tenant
     */
    @GetMapping("/transactions")
    fun getTransactionHistory(
        @RequestParam(defaultValue = "50") limit: Int
    ): ResponseEntity<List<MpesaTransactionDto>> {
        return try {
            val transactions = mpesaTransactionService.getTransactionHistory(limit)
            ResponseEntity.ok(transactions)
        } catch (e: Exception) {
            logger.error("Error fetching transaction history: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Webhook endpoint for Safaricom M-Pesa callbacks
     * Receives payment confirmation/failure notifications
     */
    @PostMapping("/callback")
    fun handleMpesaCallback(
        @RequestBody payload: MpesaCallbackRequest
    ): ResponseEntity<Map<String, String>> {
        return try {
            val stkCallback = payload.Body.stkCallback
            logger.info("Received M-Pesa callback for checkout: ${stkCallback.CheckoutRequestID}")

            // Get transaction
            val transaction = mpesaTransactionService.getTransactionByCheckoutId(stkCallback.CheckoutRequestID)
                ?: run {
                    logger.warn("Transaction not found for checkout: ${stkCallback.CheckoutRequestID}")
                    return ResponseEntity.ok(mapOf("ResultCode" to "1", "ResultDesc" to "Invalid checkout request"))
                }

            // Process callback based on result code
            when (stkCallback.ResultCode) {
                0 -> {
                    // Success
                    val mpesaReceiptNumber = extractValueFromMetadata(
                        stkCallback.CallbackMetadata,
                        "MpesaReceiptNumber"
                    )
                    mpesaTransactionService.updateTransactionStatus(
                        stkCallback.CheckoutRequestID,
                        com.chemsys.entity.MpesaTransactionStatus.COMPLETED,
                        mpesaReceiptNumber = mpesaReceiptNumber
                    )
                    logger.info("Payment successful for sale: ${transaction.sale.saleNumber}")
                }
                1 -> {
                    // Cancelled
                    mpesaTransactionService.updateTransactionStatus(
                        stkCallback.CheckoutRequestID,
                        com.chemsys.entity.MpesaTransactionStatus.CANCELLED,
                        errorCode = stkCallback.ResultCode.toString(),
                        errorMessage = stkCallback.ResultDesc
                    )
                    logger.info("Payment cancelled for sale: ${transaction.sale.saleNumber}")
                }
                else -> {
                    // Failed or other error
                    mpesaTransactionService.updateTransactionStatus(
                        stkCallback.CheckoutRequestID,
                        com.chemsys.entity.MpesaTransactionStatus.FAILED,
                        errorCode = stkCallback.ResultCode.toString(),
                        errorMessage = stkCallback.ResultDesc
                    )
                    logger.warn("Payment failed for sale: ${transaction.sale.saleNumber}, code: ${stkCallback.ResultCode}")
                }
            }

            ResponseEntity.ok(mapOf("ResultCode" to "0", "ResultDesc" to "Received successfully"))
        } catch (e: Exception) {
            logger.error("Error processing M-Pesa callback: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Extract value from callback metadata
     */
    private fun extractValueFromMetadata(metadata: CallbackMetadata?, key: String): String? {
        return metadata?.Item?.find { it.Name == key }?.Value?.toString()
    }
}
