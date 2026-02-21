import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SaleEditRequestService, SaleEditRequestDto } from '../../core/services/sale-edit-request.service';
import { ExpensesService, ExpenseDto, EXPENSE_TYPE_LABELS } from '../../core/services/expenses.service';

export interface NotificationBottomSheetData {
  isAdmin: boolean;
}

/**
 * Material bottom sheet for the notification center.
 * Shows sale edit requests (admin) and placeholder for other notifications.
 * UI design: brand-mint, brand-sky, brand-coral per workspace rules.
 */
@Component({
  selector: 'app-notification-bottom-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './notification-bottom-sheet.component.html',
  styleUrl: './notification-bottom-sheet.component.scss'
})
export class NotificationBottomSheetComponent implements OnInit {
  private readonly ref = inject(MatBottomSheetRef<NotificationBottomSheetComponent>);
  private readonly data = inject<NotificationBottomSheetData>(MAT_BOTTOM_SHEET_DATA);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly isAdmin = this.data?.isAdmin ?? false;
  readonly pendingItems = signal<SaleEditRequestDto[]>([]);
  readonly pendingLoading = signal(false);
  readonly actingOnId = signal<string | null>(null);
  readonly rejectingId = signal<string | null>(null);
  rejectReasonText = '';

  readonly pendingExpenses = signal<ExpenseDto[]>([]);
  readonly pendingExpensesLoading = signal(false);
  readonly actingOnExpenseId = signal<string | null>(null);
  readonly rejectingExpenseId = signal<string | null>(null);
  rejectExpenseReasonText = '';

  private readonly saleEditRequestService = inject(SaleEditRequestService);
  private readonly expensesService = inject(ExpensesService);

  ngOnInit(): void {
    if (this.isAdmin) {
      this.loadPending();
      this.loadPendingExpenses();
    }
  }

  close(): void {
    this.ref.dismiss();
  }

  closeAndNavigate(route: string[]): void {
    this.ref.dismiss();
    this.router.navigate(route);
  }

  loadPending(): void {
    this.pendingLoading.set(true);
    this.saleEditRequestService.listPending(0, 50).subscribe({
      next: (res) => {
        this.pendingItems.set(res.items);
        this.pendingLoading.set(false);
      },
      error: () => this.pendingLoading.set(false)
    });
  }

  loadPendingExpenses(): void {
    this.pendingExpensesLoading.set(true);
    this.expensesService.listPending(0, 50).subscribe({
      next: (res) => {
        this.pendingExpenses.set(res.items);
        this.pendingExpensesLoading.set(false);
      },
      error: () => this.pendingExpensesLoading.set(false)
    });
  }

  expenseTypeLabel(type: string): string {
    return (EXPENSE_TYPE_LABELS as Record<string, string>)[type] ?? type;
  }

  approveExpense(expense: ExpenseDto): void {
    this.actingOnExpenseId.set(expense.id);
    this.expensesService.approve(expense.id).subscribe({
      next: () => {
        this.snackBar.open('Expense approved', 'Close', { duration: 3000 });
        this.pendingExpenses.update((list) => list.filter((x) => x.id !== expense.id));
        this.actingOnExpenseId.set(null);
      },
      error: () => {
        this.actingOnExpenseId.set(null);
        this.snackBar.open('Failed to approve expense', 'Close', { duration: 3000 });
      }
    });
  }

  toggleRejectExpense(expense: ExpenseDto): void {
    this.rejectExpenseReasonText = '';
    this.rejectingExpenseId.set(this.rejectingExpenseId() === expense.id ? null : expense.id);
  }

  cancelRejectExpense(): void {
    this.rejectingExpenseId.set(null);
  }

  confirmRejectExpense(expense: ExpenseDto): void {
    this.actingOnExpenseId.set(expense.id);
    this.expensesService.reject(expense.id, this.rejectExpenseReasonText || undefined).subscribe({
      next: () => {
        this.snackBar.open('Expense rejected', 'Close', { duration: 3000 });
        this.pendingExpenses.update((list) => list.filter((x) => x.id !== expense.id));
        this.rejectingExpenseId.set(null);
        this.actingOnExpenseId.set(null);
      },
      error: () => {
        this.actingOnExpenseId.set(null);
        this.snackBar.open('Failed to reject expense', 'Close', { duration: 3000 });
      }
    });
  }

  approveEditRequest(item: SaleEditRequestDto): void {
    this.actingOnId.set(item.id);
    this.saleEditRequestService.approveOrReject(item.id, { approved: true }).subscribe({
      next: () => {
        this.snackBar.open('Sale edit approved', 'Close', { duration: 3000 });
        this.pendingItems.update(list => list.filter(x => x.id !== item.id));
        this.saleEditRequestService.refreshPendingCount();
        this.actingOnId.set(null);
      },
      error: () => {
        this.actingOnId.set(null);
        this.snackBar.open('Failed to approve', 'Close', { duration: 3000 });
      }
    });
  }

  toggleRejectReason(item: SaleEditRequestDto): void {
    if (this.rejectingId() === item.id) {
      this.cancelReject();
      return;
    }
    this.rejectingId.set(item.id);
    this.rejectReasonText = '';
  }

  cancelReject(): void {
    this.rejectingId.set(null);
    this.rejectReasonText = '';
  }

  confirmRejectEditRequest(item: SaleEditRequestDto): void {
    this.actingOnId.set(item.id);
    const reason = this.rejectReasonText?.trim() || undefined;
    this.saleEditRequestService.approveOrReject(item.id, { approved: false, rejectionReason: reason }).subscribe({
      next: () => {
        this.snackBar.open('Sale edit rejected', 'Close', { duration: 3000 });
        this.pendingItems.update(list => list.filter(x => x.id !== item.id));
        this.saleEditRequestService.refreshPendingCount();
        this.actingOnId.set(null);
        this.cancelReject();
      },
      error: () => {
        this.actingOnId.set(null);
        this.snackBar.open('Failed to reject', 'Close', { duration: 3000 });
      }
    });
  }
}
