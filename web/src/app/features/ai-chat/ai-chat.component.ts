import { Component, OnInit, signal, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { AiChatService, ChatResponse } from '../../core/services/ai-chat.service';
import { BranchContextService } from '../../core/services/branch-context.service';

/**
 * Message interface for chat UI
 */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * AI Chat Component provides an intelligent business advisor interface.
 * 
 * This component follows the UI Design Language Rule by:
 * - Using the brand color palette (Mint Green, Light Blue, Soft Coral)
 * - Consistent typography and spacing
 * - Modern, accessible UI design
 * - Clear visual hierarchy
 */
@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatChipsModule
  ],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss'
})
export class AiChatComponent implements OnInit, AfterViewChecked {
  private readonly aiChatService = inject(AiChatService);
  private readonly branchContext = inject(BranchContextService);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput', { static: false }) messageInput!: ElementRef<HTMLInputElement>;

  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal(false);
  readonly suggestions = signal<string[]>([]);
  readonly currentMessage = signal('');

  private shouldScroll = false;
  private readonly defaultSuggestions = [
    'What products should I stock more?',
    'Which products are selling best?',
    'What inventory items are running low?',
    'How can I improve my sales?',
    'What are the sales trends this month?'
  ];

  ngOnInit(): void {
    // Start with empty messages for clean welcome screen
    this.messages.set([]);
    // Show default suggestions on welcome screen
    this.suggestions.set(this.defaultSuggestions);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  /**
   * Send a message to the AI chat service
   */
  sendMessage(): void {
    const message = this.currentMessage().trim();
    if (!message || this.loading()) {
      return;
    }

    // Add user message to chat
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, userMessage]);
    this.currentMessage.set('');
    this.loading.set(true);
    this.shouldScroll = true;

    // Get current branch ID if available
    const currentBranch = this.branchContext.currentBranch;
    const branchId = currentBranch?.id || null;

    // Send to AI service
    this.aiChatService.sendMessage(message, branchId).subscribe({
      next: (response: ChatResponse) => {
        // Add AI response to chat
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date()
        };
        this.messages.update(msgs => [...msgs, aiMessage]);
        this.suggestions.set(response.suggestions);
        this.loading.set(false);
        this.shouldScroll = true;
      },
      error: (error) => {
        console.error('Error sending message:', error);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date()
        };
        this.messages.update(msgs => [...msgs, errorMessage]);
        this.loading.set(false);
        this.shouldScroll = true;
      }
    });
  }

  /**
   * Send a suggestion as a message
   */
  sendSuggestion(suggestion: string): void {
    this.currentMessage.set(suggestion);
    this.sendMessage();
  }

  /**
   * Clear conversation history
   */
  clearConversation(): void {
    this.aiChatService.clearConversation().subscribe({
      next: () => {
        this.messages.set([]);
        this.suggestions.set([]);
      },
      error: (error) => {
        console.error('Error clearing conversation:', error);
      }
    });
  }

  /**
   * Scroll to bottom of messages container
   */
  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  /**
   * Handle Enter key press
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Format timestamp for display
   */
  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  /**
   * Convert markdown to HTML and sanitize it
   */
  renderMarkdown(text: string): SafeHtml {
    if (!text) return '';
    
    let html = text;
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    let listType: 'ul' | 'ol' | null = null;
    let listItems: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Headings
      if (line.startsWith('### ')) {
        if (inList) {
          processedLines.push(this.closeList(listType!, listItems));
          listItems = [];
          inList = false;
          listType = null;
        }
        processedLines.push(`<h3 class="font-semibold text-gray-900 mt-4 mb-2 text-base">${line.substring(4)}</h3>`);
        continue;
      }
      
      if (line.startsWith('## ')) {
        if (inList) {
          processedLines.push(this.closeList(listType!, listItems));
          listItems = [];
          inList = false;
          listType = null;
        }
        processedLines.push(`<h2 class="font-semibold text-gray-900 mt-4 mb-2 text-lg">${line.substring(3)}</h2>`);
        continue;
      }
      
      if (line.startsWith('# ')) {
        if (inList) {
          processedLines.push(this.closeList(listType!, listItems));
          listItems = [];
          inList = false;
          listType = null;
        }
        processedLines.push(`<h1 class="font-bold text-gray-900 mt-4 mb-2 text-xl">${line.substring(2)}</h1>`);
        continue;
      }
      
      // Numbered lists
      const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
      if (numberedMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) {
            processedLines.push(this.closeList(listType!, listItems));
            listItems = [];
          }
          inList = true;
          listType = 'ol';
        }
        listItems.push(this.processInlineMarkdown(numberedMatch[1]));
        continue;
      }
      
      // Bullet lists
      const bulletMatch = line.match(/^[-*]\s+(.*)$/);
      if (bulletMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) {
            processedLines.push(this.closeList(listType!, listItems));
            listItems = [];
          }
          inList = true;
          listType = 'ul';
        }
        listItems.push(this.processInlineMarkdown(bulletMatch[1]));
        continue;
      }
      
      // Regular paragraph
      if (inList) {
        processedLines.push(this.closeList(listType!, listItems));
        listItems = [];
        inList = false;
        listType = null;
      }
      
      if (line) {
        processedLines.push(`<p class="my-2">${this.processInlineMarkdown(line)}</p>`);
      } else {
        processedLines.push('<br>');
      }
    }
    
    // Close any remaining list
    if (inList) {
      processedLines.push(this.closeList(listType!, listItems));
    }
    
    html = processedLines.join('');
    
    // Wrap in a div for styling
    html = `<div class="markdown-content">${html}</div>`;
    
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
  
  /**
   * Process inline markdown (bold, italic)
   */
  private processInlineMarkdown(text: string): string {
    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    
    // Convert *italic* to <em> (but not if it's part of **)
    text = text.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em class="italic">$1</em>');
    
    return text;
  }
  
  /**
   * Close a list and return HTML
   */
  private closeList(type: 'ul' | 'ol', items: string[]): string {
    if (items.length === 0) return '';
    const tag = type === 'ul' ? 'ul' : 'ol';
    const className = type === 'ul' ? 'list-disc' : 'list-decimal';
    return `<${tag} class="${className} ml-6 my-2 space-y-1">${items.map(item => `<li>${item}</li>`).join('')}</${tag}>`;
  }
}
