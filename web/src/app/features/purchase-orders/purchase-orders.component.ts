import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// Professional Button Components
import { 
  PrimaryButtonComponent, 
  SecondaryButtonComponent, 
  IconButtonComponent
} from '../../shared/components';

import { 
  PurchaseOrdersService, 
  PurchaseOrderDto, 
  CreatePurchaseOrderRequest, 
  PurchaseOrderStatus,
  PurchaseOrderSummaryDto,
  PaginatedPurchaseOrderResponse
} from '../../core/services/purchase-orders.service';
import { AuthService } from '../../core/services/auth.service';
import { CreatePurchaseOrderDialogComponent } from './create-purchase-order.dialog';
import { EditPurchaseOrderDialogComponent } from './edit-purchase-order.dialog';
import { PurchaseOrderDetailsDialogComponent } from './purchase-order-details.dialog';
import { ChangeStatusDialogComponent } from './change-status.dialog';
import { ReceiveGoodsDialogComponent } from './receive-goods.dialog';

/**
 * Purchase Orders component for managing procurement orders in the system.
 * Provides CRUD operations, workflow management, search, filtering, and purchase order overview.
 */
@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatMenuModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatDatepickerModule,
    MatNativeDateModule,
    // Professional Button Components
    PrimaryButtonComponent,
    SecondaryButtonComponent,
    IconButtonComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Purchase Orders</h1>
            <p class="text-gray-600 mt-1">Manage your procurement orders and workflow</p>
          </div>
          <app-primary-button 
            label="Create PO"
            icon="add_shopping_cart"
            (click)="createPurchaseOrder()">
          </app-primary-button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-sky">
          <div class="flex items-center">
            <div class="p-2 bg-brand-sky/20 rounded-lg">
              <mat-icon class="text-brand-sky">receipt_long</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Total POs</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.totalPurchaseOrders || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-brand-mint">
          <div class="flex items-center">
            <div class="p-2 bg-brand-mint/20 rounded-lg">
              <mat-icon class="text-brand-mint">pending</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Pending Approval</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.pendingApprovalCount || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div class="flex items-center">
            <div class="p-2 bg-orange-500/20 rounded-lg">
              <mat-icon class="text-orange-500">warning</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Overdue</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.overdueCount || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div class="flex items-center">
            <div class="p-2 bg-purple-500/20 rounded-lg">
              <mat-icon class="text-purple-500">attach_money</mat-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-600">Total Value</p>
              <p class="text-2xl font-bold text-gray-900">{{ getTotalValue() | currency: 'KES' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="flex flex-col md:flex-row gap-4">
          <mat-form-field class="flex-1">
            <mat-label>Search Purchase Orders</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">search</mat-icon>
            <input 
              matInput 
              [(ngModel)]="searchQuery" 
              (input)="onSearch()"
              placeholder="Search by PO number, title, or supplier..." />
          </mat-form-field>

          <mat-form-field class="w-full md:w-48">
            <mat-label>Filter by Status</mat-label>
            <mat-select [(ngModel)]="statusFilter" (selectionChange)="applyFilters()">
              <mat-option value="">All Status</mat-option>
              <mat-option *ngFor="let status of statuses" [value]="status">
                {{ getStatusDisplayName(status) }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field class="w-full md:w-48">
            <mat-label>Filter by Supplier</mat-label>
            <mat-select [(ngModel)]="supplierFilter" (selectionChange)="applyFilters()">
              <mat-option value="">All Suppliers</mat-option>
              <mat-option *ngFor="let supplier of suppliers" [value]="supplier.id">
                {{ supplier.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field class="w-full md:w-48">
            <mat-label>Filter by Branch</mat-label>
            <mat-select [(ngModel)]="branchFilter" (selectionChange)="applyFilters()">
              <mat-option value="">All Branches</mat-option>
              <mat-option *ngFor="let branch of branches" [value]="branch.id">
                {{ branch.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <app-secondary-button 
            label="Clear Filters"
            (click)="clearFilters()">
          </app-secondary-button>
        </div>
      </div>

      <!-- Purchase Orders List -->
      <div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Purchase Orders List</h2>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">{{ paginatedResponse?.totalElements || 0 }} purchase orders</span>
              <app-icon-button 
                icon="refresh"
                (click)="refreshPurchaseOrders()"
                [disabled]="loading"
                matTooltip="Refresh">
              </app-icon-button>
            </div>
          </div>
        </div>

        <div class="p-4">
          <div *ngIf="loading" class="flex justify-center py-8">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <div *ngIf="!loading && (!purchaseOrders || purchaseOrders.length === 0)" class="text-center py-12 text-gray-500">
            <mat-icon class="text-6xl text-gray-300 mb-4">receipt_long</mat-icon>
            <h3 class="text-xl font-semibold text-gray-400 mb-2">No purchase orders found</h3>
            <p class="text-gray-400">Try adjusting your search or filters, or create your first purchase order.</p>
          </div>

          <div *ngIf="!loading && purchaseOrders && purchaseOrders.length > 0">
            <!-- Table View -->
            <div class="overflow-x-auto">
              <table mat-table [dataSource]="purchaseOrders" class="w-full">
                <!-- PO Number Column -->
                <ng-container matColumnDef="poNumber">
                  <th mat-header-cell *matHeaderCellDef>PO Number</th>
                  <td mat-cell *matCellDef="let po">
                    <span class="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{{ po.poNumber }}</span>
                  </td>
                </ng-container>

                <!-- Title Column -->
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Title</th>
                  <td mat-cell *matCellDef="let po">
                    <div>
                      <div class="font-medium text-gray-900">{{ po.title }}</div>
                      <div class="text-sm text-gray-500">{{ po.description }}</div>
                    </div>
                  </td>
                </ng-container>

                <!-- Supplier Column -->
                <ng-container matColumnDef="supplier">
                  <th mat-header-cell *matHeaderCellDef>Supplier</th>
                  <td mat-cell *matCellDef="let po">
                    <div class="text-sm">
                      <div class="font-medium text-gray-900">{{ po.supplierName }}</div>
                      <div class="text-gray-500">{{ po.branchName }}</div>
                    </div>
                  </td>
                </ng-container>

                <!-- Status Column -->
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let po">
                    <span [class]="getStatusChipClass(po.status)" class="px-2 py-1 rounded-full text-xs font-medium">
                      {{ getStatusDisplayName(po.status) }}
                    </span>
                  </td>
                </ng-container>

                <!-- Amount Column -->
                <ng-container matColumnDef="amount">
                  <th mat-header-cell *matHeaderCellDef>Amount</th>
                  <td mat-cell *matCellDef="let po">
                    <div class="text-right">
                      <div class="font-medium text-gray-900">{{ po.grandTotal | currency: 'KES' }}</div>
                      <div class="text-sm text-gray-500">{{ po.lineItems?.length || 0 }} items</div>
                    </div>
                  </td>
                </ng-container>

                <!-- Delivery Date Column -->
                <ng-container matColumnDef="deliveryDate">
                  <th mat-header-cell *matHeaderCellDef>Expected Delivery</th>
                  <td mat-cell *matCellDef="let po">
                    <div class="text-sm">
                      <div [class]="getDeliveryDateClass(po.expectedDeliveryDate)">
                        {{ po.expectedDeliveryDate ? (po.expectedDeliveryDate | date:'shortDate') : 'Not set' }}
                      </div>
                      <div *ngIf="po.actualDeliveryDate" class="text-green-600">
                        Delivered: {{ po.actualDeliveryDate | date:'shortDate' }}
                      </div>
                    </div>
                  </td>
                </ng-container>

                <!-- Actions Column -->
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let po">
                    <div class="flex items-center gap-2">
                      <app-icon-button 
                        icon="visibility"
                        (click)="viewPurchaseOrder(po)"
                        matTooltip="View Details">
                      </app-icon-button>
                      
                      <app-icon-button 
                        *ngIf="po.status === 'DRAFT'"
                        icon="edit"
                        (click)="editPurchaseOrder(po)"
                        matTooltip="Edit">
                      </app-icon-button>

                      <button mat-icon-button [matMenuTriggerFor]="menu" class="text-gray-400 hover:text-gray-600">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      
                      <mat-menu #menu="matMenu">
                        <!-- Show "Approve" for ADMIN users on DRAFT status, "Submit for Approval" for others -->
                        <button mat-menu-item (click)="approvePurchaseOrder(po)" *ngIf="po.status === 'DRAFT' && isAdmin">
                          <mat-icon>approval</mat-icon>
                          <span>Approve</span>
                        </button>
                        
                        <button mat-menu-item (click)="submitForApproval(po)" *ngIf="po.status === 'DRAFT' && !isAdmin">
                          <mat-icon>send</mat-icon>
                          <span>Submit for Approval</span>
                        </button>
                        
                        <button mat-menu-item (click)="approvePurchaseOrder(po)" *ngIf="po.status === 'PENDING_APPROVAL'">
                          <mat-icon>approval</mat-icon>
                          <span>Approve</span>
                        </button>
                        
                        <button mat-menu-item (click)="receiveGoods(po)" *ngIf="po.status === 'APPROVED'">
                          <mat-icon>local_shipping</mat-icon>
                          <span>Receive Goods</span>
                        </button>
                        
                        <button mat-menu-item (click)="changeStatus(po)">
                          <mat-icon>swap_horiz</mat-icon>
                          <span>Change Status</span>
                        </button>
                        
                        <button mat-menu-item (click)="viewHistory(po)">
                          <mat-icon>history</mat-icon>
                          <span>View History</span>
                        </button>
                        
                        <button mat-menu-item (click)="deletePurchaseOrder(po)" *ngIf="po.status === 'DRAFT'" class="text-red-600">
                          <mat-icon>delete</mat-icon>
                          <span>Delete</span>
                        </button>
                      </mat-menu>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>

            <!-- Pagination -->
            <mat-paginator 
              [length]="paginatedResponse?.totalElements || 0"
              [pageSize]="pageSize"
              [pageSizeOptions]="[10, 20, 50, 100]"
              [pageIndex]="currentPage"
              (page)="onPageChange($event)"
              class="mt-4">
            </mat-paginator>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .status-draft { @apply bg-gray-100 text-gray-800; }
    .status-pending { @apply bg-yellow-100 text-yellow-800; }
    .status-approved { @apply bg-blue-100 text-blue-800; }
    .status-delivered { @apply bg-green-100 text-green-800; }
    .status-closed { @apply bg-purple-100 text-purple-800; }
    .status-cancelled { @apply bg-red-100 text-red-800; }
    
    .delivery-overdue { @apply text-red-600 font-medium; }
    .delivery-due-soon { @apply text-orange-600 font-medium; }
    .delivery-normal { @apply text-gray-600; }
  `]
})
export class PurchaseOrdersComponent implements OnInit {
  purchaseOrders: PurchaseOrderDto[] = [];
  paginatedResponse?: PaginatedPurchaseOrderResponse;
  stats: PurchaseOrderSummaryDto = {} as PurchaseOrderSummaryDto;
  loading = false;
  searchQuery = '';
  statusFilter = '';
  supplierFilter = '';
  branchFilter = '';
  
  // Pagination
  currentPage = 0;
  pageSize = 20;
  
  // Display columns for table
  displayedColumns = ['poNumber', 'title', 'supplier', 'status', 'amount', 'deliveryDate', 'actions'];
  
  // Available statuses
  statuses = Object.values(PurchaseOrderStatus);
  
  // Mock data for filters (these would come from services)
  suppliers: any[] = [];
  branches: any[] = [];
  
  // User role check
  isAdmin = false;

  constructor(
    private purchaseOrdersService: PurchaseOrdersService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.checkUserRole();
    this.loadPurchaseOrders();
    this.loadStats();
    this.loadFilters();
  }

  loadPurchaseOrders(): void {
    this.loading = true;
    this.purchaseOrdersService.getPurchaseOrdersWithPagination(
      this.currentPage,
      this.pageSize,
      undefined, // poNumber
      undefined, // title
      this.supplierFilter || undefined,
      this.branchFilter || undefined,
      this.statusFilter || undefined
    ).subscribe({
      next: (response) => {
        this.paginatedResponse = response;
        this.purchaseOrders = response.content;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading purchase orders:', error);
        this.loading = false;
        const errorMessage = error?.error?.detail || error?.message || 'Error loading purchase orders';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  loadStats(): void {
    this.purchaseOrdersService.getPurchaseOrderSummary().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  loadFilters(): void {
    // Load suppliers and branches for filters
    // This would come from respective services
    this.suppliers = [];
    this.branches = [];
  }

  checkUserRole(): void {
    // Check if current user has ADMIN role
    this.isAdmin = this.authService.hasRole('ADMIN');
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.purchaseOrdersService.searchPurchaseOrders(this.searchQuery).subscribe({
        next: (result) => {
          this.purchaseOrders = result.purchaseOrders;
        },
        error: (error) => {
          console.error('Error searching purchase orders:', error);
          const errorMessage = error?.error?.detail || error?.message || 'Error searching purchase orders';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    } else {
      this.loadPurchaseOrders();
    }
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadPurchaseOrders();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.supplierFilter = '';
    this.branchFilter = '';
    this.currentPage = 0;
    this.loadPurchaseOrders();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPurchaseOrders();
  }

  refreshPurchaseOrders(): void {
    this.loadPurchaseOrders();
    this.loadStats();
  }

  // Action Methods
  createPurchaseOrder(): void {
    const dialogRef = this.dialog.open(CreatePurchaseOrderDialogComponent, {
      width: '1200px',
      maxWidth: '95vw',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshPurchaseOrders();
        this.snackBar.open('Purchase order created successfully', 'Close', { duration: 3000 });
      }
    });
  }

  editPurchaseOrder(po: PurchaseOrderDto): void {
    const dialogRef = this.dialog.open(EditPurchaseOrderDialogComponent, {
      width: '1200px',
      maxWidth: '95vw',
      data: { purchaseOrder: po }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshPurchaseOrders();
        this.snackBar.open('Purchase order updated successfully', 'Close', { duration: 3000 });
      }
    });
  }

  viewPurchaseOrder(po: PurchaseOrderDto): void {
    // Fetch the full purchase order with line items
    this.purchaseOrdersService.getPurchaseOrderById(po.id).subscribe({
      next: (fullPurchaseOrder) => {
        this.dialog.open(PurchaseOrderDetailsDialogComponent, {
          width: '900px',
          data: { purchaseOrder: fullPurchaseOrder }
        });
      },
      error: (error) => {
        console.error('Error loading purchase order details:', error);
        const errorMessage = error?.error?.detail || error?.message || 'Error loading purchase order details';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  changeStatus(po: PurchaseOrderDto): void {
    const dialogRef = this.dialog.open(ChangeStatusDialogComponent, {
      width: '500px',
      data: { purchaseOrder: po }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshPurchaseOrders();
        this.snackBar.open('Purchase order status changed successfully', 'Close', { duration: 3000 });
      }
    });
  }

  submitForApproval(po: PurchaseOrderDto): void {
    this.purchaseOrdersService.submitForApproval(po.id, 'current-user').subscribe({
      next: () => {
        this.refreshPurchaseOrders();
        this.snackBar.open('Purchase order submitted for approval', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error submitting for approval:', error);
        const errorMessage = error?.error?.detail || error?.message || 'Error submitting for approval';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  approvePurchaseOrder(po: PurchaseOrderDto): void {
    const request = { approvedBy: 'current-user', notes: '' };
    this.purchaseOrdersService.approvePurchaseOrder(po.id, request).subscribe({
      next: () => {
        this.refreshPurchaseOrders();
        this.snackBar.open('Purchase order approved successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error approving purchase order:', error);
        const errorMessage = error?.error?.detail || error?.message || 'Error approving purchase order';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  receiveGoods(po: PurchaseOrderDto): void {
    const dialogRef = this.dialog.open(ReceiveGoodsDialogComponent, {
      width: '700px',
      data: { purchaseOrder: po }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.refreshPurchaseOrders();
        this.snackBar.open('Goods received successfully', 'Close', { duration: 3000 });
      }
    });
  }

  viewHistory(po: PurchaseOrderDto): void {
    this.purchaseOrdersService.getPurchaseOrderHistory(po.id).subscribe({
      next: (history) => {
        // Show history in a dialog
        console.log('Purchase order history:', history);
      },
      error: (error) => {
        console.error('Error loading history:', error);
        this.snackBar.open('Error loading history', 'Close', { duration: 3000 });
      }
    });
  }

  deletePurchaseOrder(po: PurchaseOrderDto): void {
    if (confirm(`Are you sure you want to delete purchase order ${po.poNumber}?`)) {
      this.purchaseOrdersService.deletePurchaseOrder(po.id).subscribe({
        next: () => {
          this.refreshPurchaseOrders();
          this.snackBar.open('Purchase order deleted successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deleting purchase order:', error);
          const errorMessage = error?.error?.detail || error?.message || 'Error deleting purchase order';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    }
  }

  // Helper Methods
  getStatusDisplayName(status: PurchaseOrderStatus): string {
    const statusMap: Record<PurchaseOrderStatus, string> = {
      [PurchaseOrderStatus.DRAFT]: 'Draft',
      [PurchaseOrderStatus.PENDING_APPROVAL]: 'Pending Approval',
      [PurchaseOrderStatus.APPROVED]: 'Approved',
      [PurchaseOrderStatus.DELIVERED]: 'Delivered',
      [PurchaseOrderStatus.CLOSED]: 'Closed',
      [PurchaseOrderStatus.CANCELLED]: 'Cancelled'
    };
    return statusMap[status] || status;
  }

  getStatusChipClass(status: PurchaseOrderStatus): string {
    const classMap: Record<PurchaseOrderStatus, string> = {
      [PurchaseOrderStatus.DRAFT]: 'status-draft',
      [PurchaseOrderStatus.PENDING_APPROVAL]: 'status-pending',
      [PurchaseOrderStatus.APPROVED]: 'status-approved',
      [PurchaseOrderStatus.DELIVERED]: 'status-delivered',
      [PurchaseOrderStatus.CLOSED]: 'status-closed',
      [PurchaseOrderStatus.CANCELLED]: 'status-cancelled'
    };
    return classMap[status] || 'status-draft';
  }

  getDeliveryDateClass(date: string | undefined): string {
    if (!date) return 'delivery-normal';
    
    const deliveryDate = new Date(date);
    const today = new Date();
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'delivery-overdue';
    if (diffDays <= 3) return 'delivery-due-soon';
    return 'delivery-normal';
  }

  getTotalValue(): number {
    return this.stats.totalValue || 0;
  }
}
