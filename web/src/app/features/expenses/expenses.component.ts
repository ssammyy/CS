import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { PrimaryButtonComponent, SecondaryButtonComponent, IconButtonComponent } from '../../shared/components';
import {
  ExpensesService,
  ExpenseDto,
  ExpenseListResponse,
  EXPENSE_TYPE_LABELS,
  ExpenseType,
  EXPENSE_TYPES
} from '../../core/services/expenses.service';
import { BranchesService, BranchDto } from '../../core/services/branches.service';
import { AuthService } from '../../core/services/auth.service';
import { ExpenseFormDialogComponent, ExpenseFormDialogData } from './expense-form.dialog';

/**
 * Expenses module: manage expenses by type (delivery, advertisements, rent, wifi, commissions paid, miscellaneous).
 * List with filters by branch, type, and date range; add, edit, delete.
 */
@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    PrimaryButtonComponent,
    SecondaryButtonComponent,
    IconButtonComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Expenses</h1>
            <p class="text-gray-600 mt-1">Delivery, rent, wifi, commissions, and other costs</p>
          </div>
          <app-primary-button label="Add expense" icon="add" (click)="openAdd()"></app-primary-button>
        </div>
      </div>

      <!-- Summary card -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-coral">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total in range</p>
              <p class="text-2xl font-bold text-gray-900">{{ totalAmountInRange | currency: 'KES' }}</p>
            </div>
            <div class="p-2 bg-brand-coral/20 rounded-lg">
              <mat-icon class="text-brand-coral">payments</mat-icon>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-sky">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Records</p>
              <p class="text-2xl font-bold text-gray-900">{{ totalElements }}</p>
            </div>
            <div class="p-2 bg-brand-sky/20 rounded-lg">
              <mat-icon class="text-brand-sky">receipt_long</mat-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Branch</label>
            <select
              [(ngModel)]="branchId"
              (ngModelChange)="applyFilters()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-transparent">
              <option value="">All branches</option>
              <option *ngFor="let b of branches" [value]="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              [(ngModel)]="expenseType"
              (ngModelChange)="applyFilters()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-sky focus:border-transparent">
              <option value="">All types</option>
              <option *ngFor="let t of expenseTypes" [value]="t">{{ getTypeLabel(t) }}</option>
            </select>
          </div>
          <mat-form-field  subscriptSizing="dynamic" class="flex-1">
            <mat-label>From</mat-label>
            <input matInput [matDatepicker]="startDatePicker" [(ngModel)]="startDate" (dateChange)="applyFilters()">
            <mat-datepicker-toggle matIconSuffix [for]="startDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #startDatePicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic" class="flex-1">
            <mat-label>To</mat-label>
            <input matInput [matDatepicker]="endDatePicker" [(ngModel)]="endDate" (dateChange)="applyFilters()">
            <mat-datepicker-toggle matIconSuffix [for]="endDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #endDatePicker></mat-datepicker>
          </mat-form-field>
          <div class="flex items-end gap-2">
            <app-secondary-button label="Apply" (click)="load()"></app-secondary-button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Expense list</h2>
          <app-icon-button icon="refresh" (click)="load()" [disabled]="loading" matTooltip="Refresh"></app-icon-button>
        </div>
        <div class="overflow-x-auto">
          <div *ngIf="loading" class="flex justify-center py-12">
            <mat-spinner diameter="40"></mat-spinner>
          </div>
          <div *ngIf="!loading && expenses.length === 0" class="text-center py-12 text-gray-500">
            <mat-icon class="text-6xl text-gray-300 mb-4">receipt_long</mat-icon>
            <p class="text-gray-500">No expenses in this period. Add one to get started.</p>
          </div>
          <table *ngIf="!loading && expenses.length > 0" class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Branch</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let e of expenses" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900">{{ e.expenseDate }}</td>
                <td class="px-4 py-3 text-sm text-gray-900">{{ e.branchName }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-brand-mint/20 text-gray-800">
                    {{ getTypeLabel(e.expenseType) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex px-2 py-0.5 rounded text-xs font-medium" [ngClass]="getStatusClasses(e.status)">
                    {{ getStatusLabel(e.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right font-medium text-gray-900">{{ e.amount | currency: 'KES' }}</td>
                <td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{{ e.description || '—' }}</td>
                <td class="px-4 py-3 text-right">
                  <button mat-icon-button [matMenuTriggerFor]="menu" class="text-gray-400 hover:text-gray-600">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="openEdit(e)" [disabled]="!canEditOrDelete(e)">
                      <mat-icon>edit</mat-icon>
                      <span>Edit</span>
                    </button>
                    <button mat-menu-item (click)="deleteExpense(e)" [disabled]="!canEditOrDelete(e)">
                      <mat-icon>delete</mat-icon>
                      <span>Delete</span>
                    </button>
                  </mat-menu>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div *ngIf="!loading && totalPages > 1" class="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
          <span>Page {{ page + 1 }} of {{ totalPages }} ({{ totalElements }} total)</span>
          <div class="flex gap-2">
            <button mat-stroked-button (click)="prevPage()" [disabled]="page === 0">Previous</button>
            <button mat-stroked-button (click)="nextPage()" [disabled]="page >= totalPages - 1">Next</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ExpensesComponent implements OnInit {
  expenses: ExpenseDto[] = [];
  branches: BranchDto[] = [];
  loading = false;
  totalAmountInRange = 0;
  totalElements = 0;
  totalPages = 0;
  page = 0;
  size = 20;

  branchId = '';
  expenseType = '';
  startDate: Date | null = null;
  endDate: Date | null = null;
  expenseTypes = EXPENSE_TYPES;

  constructor(
    private expensesService: ExpensesService,
    private branchesService: BranchesService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    this.endDate = end;
    this.startDate = start;
  }

  ngOnInit(): void {
    this.branchesService.loadBranches();
    this.branchesService.branches$.subscribe((b) => (this.branches = b ?? []));
    this.load();
  }

  getTypeLabel(t: ExpenseType | string): string {
    return EXPENSE_TYPE_LABELS[t as ExpenseType] ?? t;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING_APPROVAL: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected'
    };
    return labels[status] ?? status;
  }

  getStatusClasses(status: string): string {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'bg-amber-100 text-amber-800';
      case 'APPROVED':
        return 'bg-brand-mint/20 text-gray-800';
      case 'REJECTED':
        return 'bg-brand-coral/20 text-brand-coral';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /** True if the current user can edit or delete this expense (pending, or admin for any status). */
  canEditOrDelete(e: ExpenseDto): boolean {
    if (e.status === 'PENDING_APPROVAL') return true;
    return this.authService.hasAnyRole(['ADMIN', 'PLATFORM_ADMIN']);
  }

  applyFilters(): void {
    this.page = 0;
    this.load();
  }

  load(): void {
    this.loading = true;
    const params: Parameters<ExpensesService['list']>[0] = {
      startDate: this.startDate ? this.formatDate(this.startDate) : undefined,
      endDate: this.endDate ? this.formatDate(this.endDate) : undefined,
      page: this.page,
      size: this.size
    };
    if (this.branchId) params.branchId = this.branchId;
    if (this.expenseType) params.expenseType = this.expenseType;

    this.expensesService.list(params).subscribe({
      next: (res: ExpenseListResponse) => {
        this.expenses = res.content;
        this.totalAmountInRange = res.totalAmountInRange ?? 0;
        this.totalElements = res.totalElements;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load expenses', 'Close', { duration: 3000 });
      }
    });
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.load();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.load();
    }
  }

  openAdd(): void {
    const data: ExpenseFormDialogData = { branches: this.branches };
    this.dialog
      .open(ExpenseFormDialogComponent, { data, width: '400px' })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.load();
          this.snackBar.open('Expense added', 'Close', { duration: 2000 });
        }
      });
  }

  openEdit(expense: ExpenseDto): void {
    const data: ExpenseFormDialogData = { expense, branches: this.branches };
    this.dialog
      .open(ExpenseFormDialogComponent, { data, width: '400px' })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.load();
          this.snackBar.open('Expense updated', 'Close', { duration: 2000 });
        }
      });
  }

  deleteExpense(expense: ExpenseDto): void {
    if (!confirm(`Delete this expense (${expense.amount} KES)?`)) return;
    this.expensesService.delete(expense.id).subscribe({
      next: () => {
        this.load();
        this.snackBar.open('Expense deleted', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to delete expense', 'Close', { duration: 3000 })
    });
  }

  /** Formats date as yyyy-MM-dd for API. */
  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
