package com.chemsys.controller

import com.chemsys.dto.ChatRequest
import com.chemsys.dto.ChatResponse
import com.chemsys.service.AiChatService
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.util.*

/**
 * REST controller for AI Chat functionality.
 * Provides endpoints for intelligent business insights and recommendations.
 * 
 * This controller follows the Backend Data Consistency Rule by ensuring:
 * - All endpoints are properly secured with role-based access control
 * - Input validation through DTOs and validation annotations
 * - Proper error handling and HTTP status codes
 * - RESTful API design principles
 * - Comprehensive documentation for all endpoints
 */
@RestController
@RequestMapping("/api/v1/ai-chat")
@CrossOrigin(origins = ["*"])
class AiChatController(
    private val aiChatService: AiChatService
) {

    companion object {
        private val logger = LoggerFactory.getLogger(AiChatController::class.java)
    }

    /**
     * Process a chat message and return AI-generated business insights.
     * 
     * @param request The chat request containing user message and optional branch filter
     * @return ChatResponse with AI-generated insights and suggestions
     */
    @PostMapping("/chat")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER')")
    fun processChatMessage(
        @RequestBody request: ChatRequest
    ): ResponseEntity<ChatResponse> {
        return try {
            logger.info("Processing chat message: ${request.message}")
            val response = aiChatService.processChatMessage(request)
            ResponseEntity.ok(response)
        } catch (e: Exception) {
            logger.error("Error processing chat message: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }

    /**
     * Clear conversation history for a specific conversation.
     * 
     * @param conversationId The conversation ID to clear
     * @return Success response
     */
    @DeleteMapping("/conversation/{conversationId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CASHIER')")
    fun clearConversation(
        @PathVariable conversationId: String
    ): ResponseEntity<Map<String, String>> {
        return try {
            aiChatService.clearConversation(conversationId)
            ResponseEntity.ok(mapOf("message" to "Conversation cleared successfully"))
        } catch (e: Exception) {
            logger.error("Error clearing conversation: ${e.message}", e)
            ResponseEntity.internalServerError().build()
        }
    }
}
