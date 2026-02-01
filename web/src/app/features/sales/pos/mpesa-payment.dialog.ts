import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, interval } from 'rxjs';
import { takeUntil, takeWhile } from 'rxjs/operators';

import { MpesaService, InitiateMpesaPaymentRequest } from '../../../core/services/mpesa.service';
import {
  PrimaryButtonComponent,
  SecondaryButtonComponent
} from '../../../shared/components';

export interface MpesaPaymentDialogData {
  saleId: string;
  saleNumber: string;
  amount: number;
  branchId?: string;
}

@Component({
  selector: 'app-mpesa-payment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    PrimaryButtonComponent,
    SecondaryButtonComponent
  ],
  template: `
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-brand-mint/20 rounded-lg">
            <mat-icon class="text-brand-mint text-2xl">payment</mat-icon>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900">M-Pesa Payment</h2>
            <p class="text-sm text-gray-600">Sale: {{ data.saleNumber }}</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Payment Details -->
        <div class="bg-gray-50 rounded-lg p-4 space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600">Amount:</span>
            <span class="font-semibold text-gray-900">KES {{ data.amount | number: '1.2-2' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Phone Number:</span>
            <span class="font-semibold text-gray-900">{{ paymentForm.get('phoneNumber')?.value || '-' }}</span>
          </div>
        </div>

        <!-- Form -->
        <form [formGroup]="paymentForm" class="space-y-4">
          <!-- Phone Number Input -->
          <mat-form-field class="w-full">
            <mat-label>Phone Number *</mat-label>
            <input
              matInput
              formControlName="phoneNumber"
              placeholder="Enter Kenyan phone number (0712345678 or 254712345678)"
              (keyup.enter)="initiatePayment()"
              [disabled]="isProcessing">
            <mat-hint>Format: 0712345678 or 254712345678</mat-hint>
            <mat-error *ngIf="paymentForm.get('phoneNumber')?.hasError('required')">
              Phone number is required
            </mat-error>
            <mat-error *ngIf="paymentForm.get('phoneNumber')?.hasError('pattern')">
              Invalid Kenyan phone number format
            </mat-error>
          </mat-form-field>

          <!-- Status Message -->
          <div *ngIf="statusMessage" class="p-3 rounded-lg" [ngClass]="{
            'bg-blue-50 text-blue-800': statusType === 'info',
            'bg-green-50 text-green-800': statusType === 'success',
            'bg-red-50 text-red-800': statusType === 'error'
          }">
            <div class="flex items-center gap-2">
              <mat-icon class="text-base">
                {{ statusType === 'success' ? 'check_circle' : statusType === 'error' ? 'error' : 'info' }}
              </mat-icon>
              <span class="text-sm">{{ statusMessage }}</span>
            </div>
          </div>

          <!-- Loading State -->
          <div *ngIf="isProcessing" class="flex flex-col items-center gap-3 py-4">
            <mat-spinner diameter="40"></mat-spinner>
            <p class="text-sm text-gray-600 text-center">
              Initiating payment prompt on your phone...
            </p>
            <p class="text-xs text-gray-500">
              This may take a few seconds
            </p>
          </div>

          <!-- Countdown Timer -->
          <div *ngIf="showCountdown" class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <p class="text-sm text-yellow-800 font-medium">
              Complete payment on your phone
            </p>
            <p class="text-xs text-yellow-700 mt-1">
              Waiting for payment confirmation... ({{ countdown }}s)
            </p>
          </div>
        </form>

        <!-- Instructions -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <div class="flex gap-2">
            <mat-icon class="text-blue-600 flex-shrink-0">info</mat-icon>
            <div class="text-sm text-blue-800 space-y-1">
              <p class="font-medium">How it works:</p>
              <ul class="list-disc list-inside space-y-0.5">
                <li>Enter your phone number</li>
                <li>You'll receive a payment prompt</li>
                <li>Enter your M-Pesa PIN to confirm</li>
                <li>We'll notify you once payment is confirmed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex gap-3 p-6 border-t border-gray-200">
        <app-secondary-button
          label="Cancel"
          (click)="cancel()"
          [disabled]="isProcessing"
          class="flex-1">
        </app-secondary-button>
        <app-primary-button
          label="Pay with M-Pesa"
          icon="payment"
          (click)="initiatePayment()"
          [disabled]="!paymentForm.valid || isProcessing"
          class="flex-1">
        </app-primary-button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class MpesaPaymentDialogComponent implements OnInit, OnDestroy {
  paymentForm: FormGroup;
  isProcessing = false;
  statusMessage = '';
  statusType: 'info' | 'success' | 'error' = 'info';
  showCountdown = false;
  countdown = 120;
  transactionId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private mpesaService: MpesaService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<MpesaPaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MpesaPaymentDialogData
  ) {
    this.paymentForm = this.fb.group({
      phoneNumber: ['', [
        Validators.required,
        Validators.pattern(/^(?:0|\+?254)?[17]\d{8}$/)
      ]]
    });
  }

  ngOnInit(): void {
    // Focus on phone number input
    setTimeout(() => {
      const phoneInput = document.querySelector('input[formControlName="phoneNumber"]') as HTMLInputElement;
      phoneInput?.focus();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initiate M-Pesa STK Push payment
   */
  initiatePayment(): void {
    if (!this.paymentForm.valid) {
      this.showError('Please enter a valid phone number');
      return;
    }

    this.isProcessing = true;
    this.statusMessage = '';
    this.showCountdown = false;

    const request: InitiateMpesaPaymentRequest = {
      saleId: this.data.saleId,
      phoneNumber: this.paymentForm.value.phoneNumber,
      amount: this.data.amount,
      branchId: this.data.branchId
    };

    this.mpesaService.initiateMpesaPayment(request).subscribe({
      next: (response) => {
        this.transactionId = response.transactionId;
        this.statusMessage = 'Payment prompt sent! Check your phone and enter your M-Pesa PIN';
        this.statusType = 'success';
        this.showCountdown = true;
        this.startPaymentMonitoring(response.transactionId);
      },
      error: (error) => {
        this.isProcessing = false;
        this.showError(error.error?.message || 'Failed to initiate payment. Please try again.');
      }
    });
  }

  /**
   * Monitor payment status and auto-close on success
   */
  private startPaymentMonitoring(transactionId: string): void {
    this.countdown = 120;

    // Check status every 5 seconds
    interval(5000)
      .pipe(
        takeUntil(this.destroy$),
        takeWhile(() => this.countdown > 0)
      )
      .subscribe(() => {
        this.countdown -= 5;

        this.mpesaService.getTransactionStatus(transactionId).subscribe({
          next: (status) => {
            switch (status.status) {
              case 'COMPLETED':
                this.isProcessing = false;
                this.statusMessage = `Payment successful! Receipt: ${status.mpesaReceiptNumber}`;
                this.statusType = 'success';
                this.showCountdown = false;

                // Close dialog after brief delay
                setTimeout(() => {
                  this.dialogRef.close({ success: true, transactionId });
                }, 2000);
                break;

              case 'FAILED':
              case 'CANCELLED':
              case 'ERROR':
                this.isProcessing = false;
                this.showCountdown = false;
                this.showError(status.errorMessage || `Payment ${status.status.toLowerCase()}`);
                break;

              case 'PENDING':
              case 'TIMEOUT':
                // Still waiting
                break;
            }
          },
          error: (error) => {
            console.error('Error checking payment status:', error);
          }
        });
      });
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.statusMessage = message;
    this.statusType = 'error';
  }

  /**
   * Cancel payment
   */
  cancel(): void {
    if (this.isProcessing) {
      const confirmed = confirm('Payment is being processed. Do you want to cancel?');
      if (!confirmed) return;
    }
    this.dialogRef.close({ success: false });
  }
}
