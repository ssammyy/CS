import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  ExpensesService,
  ExpenseDto,
  CreateExpenseRequest,
  EXPENSE_TYPES,
  EXPENSE_TYPE_LABELS,
  ExpenseType
} from '../../core/services/expenses.service';
import { BranchDto } from '../../core/services/branches.service';
import { PrimaryButtonComponent, SecondaryButtonComponent } from '../../shared/components';

export interface ExpenseFormDialogData {
  expense?: ExpenseDto;
  branches: BranchDto[];
}

/**
 * Dialog for creating or editing an expense.
 * Supports all expense types: delivery, advertisements, rent, wifi, commissions paid, miscellaneous.
 */
@Component({
  selector: 'app-expense-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    PrimaryButtonComponent,
    SecondaryButtonComponent
  ],
  template: `
    <div class="min-w-[320px] max-w-lg">
      <div class="px-5 pt-5">
        <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-4"></div>
        <h2 class="text-xl font-semibold text-gray-900">{{ isEdit ? 'Edit Expense' : 'Add Expense' }}</h2>
        <p class="text-gray-600 mt-1 text-sm">{{ isEdit ? 'Update expense details' : 'Record a new expense' }}</p>
      </div>

      <form #f="ngForm" (ngSubmit)="submit()" class="p-5 pt-3 space-y-4">
        <mat-form-field class="w-full">
          <mat-label>Branch</mat-label>
          <mat-select [(ngModel)]="model.branchId" name="branchId" required>
            <mat-option *ngFor="let b of data.branches" [value]="b.id">{{ b.name }}</mat-option>
          </mat-select>
          <mat-error>Branch is required</mat-error>
        </mat-form-field>

        <mat-form-field class="w-full">
          <mat-label>Expense type</mat-label>
          <mat-select [(ngModel)]="model.expenseType" name="expenseType" required>
            <mat-option *ngFor="let t of expenseTypes" [value]="t">{{ getTypeLabel(t) }}</mat-option>
          </mat-select>
          <mat-error>Type is required</mat-error>
        </mat-form-field>

        <mat-form-field class="w-full">
          <mat-label>Amount (KES)</mat-label>
          <input matInput type="number" step="0.01" min="0.01" [(ngModel)]="model.amount" name="amount" required />
          <mat-error>Enter a positive amount</mat-error>
        </mat-form-field>

        <mat-form-field class="w-full">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="expenseDatePicker" [(ngModel)]="model.expenseDate" name="expenseDate" required />
          <mat-datepicker-toggle matIconSuffix [for]="expenseDatePicker"></mat-datepicker-toggle>
          <mat-datepicker #expenseDatePicker></mat-datepicker>
          <mat-error>Date is required</mat-error>
        </mat-form-field>

        <mat-form-field class="w-full">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput [(ngModel)]="model.description" name="description" rows="2" placeholder="Notes or reference"></textarea>
        </mat-form-field>

        <div class="flex justify-end gap-2 pt-2">
          <app-secondary-button label="Cancel" (click)="dialogRef.close()"></app-secondary-button>
          <app-primary-button
            [label]="isEdit ? 'Update' : 'Add expense'"
            [type]="'submit'"
            [disabled]="f.invalid || submitting">
          </app-primary-button>
        </div>
      </form>
    </div>
  `
})
export class ExpenseFormDialogComponent {
  isEdit: boolean;
  model: { branchId: string; expenseType: string; amount: number; expenseDate: Date | null; description: string | null };
  submitting = false;
  expenseTypes = EXPENSE_TYPES;

  constructor(
    public dialogRef: MatDialogRef<ExpenseFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExpenseFormDialogData,
    private expensesService: ExpensesService
  ) {
    this.isEdit = !!data.expense;
    const e = data.expense;
    const today = new Date();
    this.model = {
      branchId: e?.branchId ?? (data.branches[0]?.id ?? ''),
      expenseType: e?.expenseType ?? 'MISCELLANEOUS',
      amount: e?.amount ?? 0,
      expenseDate: e?.expenseDate ? new Date(e.expenseDate) : today,
      description: e?.description ?? null
    };
  }

  /** Formats date as yyyy-MM-dd for API. */
  private formatDateForApi(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  getTypeLabel(t: ExpenseType): string {
    return EXPENSE_TYPE_LABELS[t] ?? t;
  }

  submit(): void {
    if (this.submitting || !this.model.expenseDate) return;
    this.submitting = true;
    const expenseDateStr = this.formatDateForApi(this.model.expenseDate);
    if (this.isEdit && this.data.expense) {
      this.expensesService
        .update(this.data.expense.id, {
          branchId: this.model.branchId,
          expenseType: this.model.expenseType,
          amount: this.model.amount,
          expenseDate: expenseDateStr,
          description: this.model.description || undefined
        })
        .subscribe({
          next: (updated) => {
            this.submitting = false;
            this.dialogRef.close(updated);
          },
          error: () => (this.submitting = false)
        });
    } else {
      const req: CreateExpenseRequest = {
        branchId: this.model.branchId,
        expenseType: this.model.expenseType,
        amount: this.model.amount,
        expenseDate: expenseDateStr,
        description: this.model.description || undefined
      };
      this.expensesService.create(req).subscribe({
        next: (created) => {
          this.submitting = false;
          this.dialogRef.close(created);
        },
        error: () => (this.submitting = false)
      });
    }
  }
}
