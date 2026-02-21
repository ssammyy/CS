import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface RequestSaleEditData {
  saleId: string;
  lineItemId: string;
  productName: string;
  requestType: 'PRICE_CHANGE' | 'LINE_DELETE';
  currentUnitPrice?: number;
}

@Component({
  selector: 'app-request-sale-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="p-4">
      <h2 mat-dialog-title class="!text-lg">
        {{ data.requestType === 'PRICE_CHANGE' ? 'Request price change' : 'Request remove line' }}
      </h2>
      <p class="text-sm text-gray-600 mb-4">{{ data.productName }}</p>
      <mat-dialog-content>
        <div *ngIf="data.requestType === 'PRICE_CHANGE'" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">New unit price (KSh)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            [(ngModel)]="newUnitPrice"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-transparent"
            placeholder="e.g. 150.00">
          <p *ngIf="data.currentUnitPrice != null" class="text-xs text-gray-500 mt-1">Current: KSh {{ data.currentUnitPrice | number:'1.2-2' }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
          <textarea
            [(ngModel)]="reason"
            rows="2"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-transparent"
            placeholder="e.g. Customer discount"></textarea>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="!p-0 !mt-4 !min-h-0">
        <button mat-button (click)="dialogRef.close()">Cancel</button>
        <button
          mat-raised-button
          color="primary"
          (click)="submit()"
          [disabled]="data.requestType === 'PRICE_CHANGE' && (newUnitPrice == null || newUnitPrice <= 0)"
          class="!bg-brand-coral hover:!bg-brand-coral/90">
          Submit request
        </button>
      </mat-dialog-actions>
    </div>
  `
})
export class RequestSaleEditDialogComponent {
  newUnitPrice: number | null = null;
  reason = '';

  constructor(
    public dialogRef: MatDialogRef<RequestSaleEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RequestSaleEditData
  ) {
    if (data.requestType === 'PRICE_CHANGE' && data.currentUnitPrice != null) {
      this.newUnitPrice = data.currentUnitPrice;
    }
  }

  submit(): void {
    if (this.data.requestType === 'PRICE_CHANGE' && (this.newUnitPrice == null || this.newUnitPrice <= 0)) return;
    this.dialogRef.close({
      saleId: this.data.saleId,
      saleLineItemId: this.data.lineItemId,
      requestType: this.data.requestType,
      newUnitPrice: this.data.requestType === 'PRICE_CHANGE' ? this.newUnitPrice! : undefined,
      reason: this.reason || undefined
    });
  }
}
