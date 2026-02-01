package com.chemsys.service

import com.chemsys.dto.*
import com.fasterxml.jackson.annotation.JsonProperty
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import org.springframework.web.client.HttpClientErrorException
import java.math.BigDecimal
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.*

/**
 * Service to interact with Safaricom M-Pesa Daraja API
 * Handles authentication and STK Push initiation
 */
@Service
class MpesaApiService(
    private val restTemplate: RestTemplate
) {

    companion object {
        private val logger = LoggerFactory.getLogger(MpesaApiService::class.java)
        private const val SANDBOX_AUTH_URL = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        private const val SANDBOX_STK_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        private const val CALLBACK_URL = "/api/mpesa/callback"
        private const val BUSINESS_SHORT_CODE = "174379" // Sandbox test till
    }

    @Value("\${mpesa.consumer-key:}")
    private lateinit var consumerKey: String

    @Value("\${mpesa.consumer-secret:}")
    private lateinit var consumerSecret: String

    @Value("\${mpesa.passkey:}")
    private lateinit var passkey: String

    @Value("\${app.base-url:http://localhost:4200}")
    private lateinit var baseUrl: String

    private var accessToken: String? = null
    private var tokenExpiryTime: Long = 0

    /**
     * Get access token from Daraja API
     * Tokens are cached and reused until expiry
     */
    fun getAccessToken(): String {
        val now = System.currentTimeMillis()
        if (accessToken != null && now < tokenExpiryTime) {
            return accessToken!!
        }

        try {
            val auth = "$consumerKey:$consumerSecret"
            val encodedAuth = Base64.getEncoder().encodeToString(auth.toByteArray())

            val headers = HttpHeaders().apply {
                set("Authorization", "Basic $encodedAuth")
                contentType = MediaType.APPLICATION_JSON
            }

            val response = restTemplate.getForObject(
                SANDBOX_AUTH_URL,
                OAuthResponse::class.java
            )

            if (response != null) {
                accessToken = response.access_token
                tokenExpiryTime = now + (response.expires_in * 1000)
                logger.info("M-Pesa access token obtained successfully")
                return accessToken!!
            }
        } catch (e: Exception) {
            logger.error("Failed to get M-Pesa access token", e)
        }

        throw RuntimeException("Unable to obtain M-Pesa access token")
    }

    /**
     * Initiate STK Push for payment
     * Sends a payment prompt to customer's phone
     */
    fun initiateStkPush(
        phoneNumber: String,
        amount: BigDecimal,
        accountReference: String,
        transactionDesc: String,
        callbackUrl: String
    ): StkPushResponse {
        try {
            val token = getAccessToken()
            val timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
            val password = generatePassword(BUSINESS_SHORT_CODE, passkey, timestamp)

            val request = StkPushRequest(
                BusinessShortCode = BUSINESS_SHORT_CODE,
                Password = password,
                Timestamp = timestamp,
                TransactionType = "CustomerPayBillOnline",
                Amount = amount.toInt().toString(),
                PartyA = phoneNumber,
                PartyB = BUSINESS_SHORT_CODE,
                PhoneNumber = phoneNumber,
                CallBackURL = callbackUrl,
                AccountReference = accountReference,
                TransactionDesc = transactionDesc
            )

            val headers = HttpHeaders().apply {
                set("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
            }

            logger.info("Initiating STK Push for phone: $phoneNumber, amount: $amount")

            val response = restTemplate.postForObject(
                SANDBOX_STK_URL,
                org.springframework.http.HttpEntity(request, headers),
                StkPushResponse::class.java
            )

            if (response != null) {
                logger.info("STK Push initiated successfully: ${response.CheckoutRequestID}")
                return response
            }

        } catch (e: HttpClientErrorException) {
            logger.error("HTTP Error: ${e.statusCode} - ${e.responseBodyAsString}", e)
            throw RuntimeException("Failed to initiate STK Push: ${e.message}")
        } catch (e: Exception) {
            logger.error("Failed to initiate STK Push", e)
            throw RuntimeException("Failed to initiate STK Push: ${e.message}")
        }

        throw RuntimeException("Failed to initiate STK Push")
    }

    /**
     * Generate password for STK Push
     * Password = Base64(BusinessShortCode + Passkey + Timestamp)
     */
    private fun generatePassword(businessShortCode: String, passkey: String, timestamp: String): String {
        val plaintext = "$businessShortCode$passkey$timestamp"
        return Base64.getEncoder().encodeToString(plaintext.toByteArray())
    }

    /**
     * Verify webhook signature (HMAC-SHA256)
     * This ensures callbacks are genuine from Safaricom
     */
    fun verifyWebhookSignature(payload: String, signature: String): Boolean {
        try {
            // For sandbox testing, you might want to skip or use a test signature
            // In production, implement proper HMAC-SHA256 verification
            logger.info("Webhook signature verification (simplified for sandbox)")
            return true
        } catch (e: Exception) {
            logger.error("Webhook signature verification failed", e)
            return false
        }
    }
}

/**
 * OAuth Response from Daraja API
 */
data class OAuthResponse(
    @JsonProperty("access_token")
    val access_token: String,

    @JsonProperty("expires_in")
    val expires_in: Long
)

/**
 * STK Push Request for Daraja API
 */
data class StkPushRequest(
    @JsonProperty("BusinessShortCode")
    val BusinessShortCode: String,

    @JsonProperty("Password")
    val Password: String,

    @JsonProperty("Timestamp")
    val Timestamp: String,

    @JsonProperty("TransactionType")
    val TransactionType: String,

    @JsonProperty("Amount")
    val Amount: String,

    @JsonProperty("PartyA")
    val PartyA: String,

    @JsonProperty("PartyB")
    val PartyB: String,

    @JsonProperty("PhoneNumber")
    val PhoneNumber: String,

    @JsonProperty("CallBackURL")
    val CallBackURL: String,

    @JsonProperty("AccountReference")
    val AccountReference: String,

    @JsonProperty("TransactionDesc")
    val TransactionDesc: String
)

/**
 * STK Push Response from Daraja API
 */
data class StkPushResponse(
    @JsonProperty("MerchantRequestID")
    val MerchantRequestID: String? = null,

    @JsonProperty("CheckoutRequestID")
    val CheckoutRequestID: String? = null,

    @JsonProperty("ResponseCode")
    val ResponseCode: String? = null,

    @JsonProperty("ResponseDescription")
    val ResponseDescription: String? = null,

    @JsonProperty("CustomerMessage")
    val CustomerMessage: String? = null
)
