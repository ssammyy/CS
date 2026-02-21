import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * DTOs for AI Chat functionality
 */
export interface ChatRequest {
  message: string;
  branchId?: string | null;
  conversationId?: string | null;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  suggestions: string[];
}

/**
 * AI Chat Service provides intelligent business insights using AI.
 * 
 * This service follows the Frontend State Caching Rule by:
 * - Managing conversation state in memory
 * - Providing observable streams for chat messages
 * - Handling conversation history
 * - Documenting caching logic and state management
 */
@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/ai-chat`;
  private currentConversationId: string | null = null;

  /**
   * Send a chat message and get AI-generated response.
   * 
   * @param message The user's message
   * @param branchId Optional branch ID to filter business data
   * @returns Observable of chat response
   */
  sendMessage(message: string, branchId?: string | null): Observable<ChatResponse> {
    const request: ChatRequest = {
      message,
      branchId: branchId || null,
      conversationId: this.currentConversationId
    };

    return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, request).pipe(
      // Update conversation ID from response
      tap((response: ChatResponse) => {
        this.currentConversationId = response.conversationId;
      })
    );
  }

  /**
   * Clear the current conversation history.
   * 
   * @returns Observable of success response
   */
  clearConversation(): Observable<{ message: string }> {
    if (!this.currentConversationId) {
      return new Observable(observer => {
        observer.next({ message: 'No conversation to clear' });
        observer.complete();
      });
    }

    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/conversation/${this.currentConversationId}`
    ).pipe(
      // Clear conversation ID after successful deletion
      tap(() => {
        this.currentConversationId = null;
      })
    );
  }

  /**
   * Get the current conversation ID.
   * 
   * @returns Current conversation ID or null
   */
  getConversationId(): string | null {
    return this.currentConversationId;
  }

  /**
   * Reset the conversation (clears local state only).
   */
  resetConversation(): void {
    this.currentConversationId = null;
  }
}
