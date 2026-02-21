import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';

// Professional Button Components
import { 
  PrimaryButtonComponent, 
  SecondaryButtonComponent, 
  AccentButtonComponent, 
  DangerButtonComponent
} from '../../shared/components';

import { 
  PurchaseOrdersService, 
  CreatePurchaseOrderRequest, 
  CreatePurchaseOrderLineItemRequest,
  PurchaseOrderStatus
} from '../../core/services/purchase-orders.service';
import { SuppliersService } from '../../core/services/suppliers.service';
import { BranchesService } from '../../core/services/branches.service';
import { ProductsService } from '../../core/services/products.service';

/**
 * Dialog component for creating new purchase orders.
 * Provides a comprehensive form for PO details and line items.
 */
@Component({
  selector: 'app-create-purchase-order-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatDividerModule,
    // Professional Button Components
    PrimaryButtonComponent,
    SecondaryButtonComponent,
    AccentButtonComponent,
    DangerButtonComponent
  ],
  template: `
    <div class="h-[min(92vh,900px)] p-6 overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Create Purchase Order</h2>
          <p class="text-gray-600 mt-1">
            <span *ngIf="loading">Loading form data...</span>
            <span *ngIf="!loading">Fill in the details to create a new purchase order</span>
          </p>
        </div>
        <button mat-icon-button (click)="close()" class="text-gray-400 hover:text-gray-600">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="purchaseOrderForm" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Basic Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <mat-form-field class="w-full">
            <mat-label>Title *</mat-label>
            <input matInput formControlName="title" placeholder="Enter PO title" required>
            <mat-error *ngIf="purchaseOrderForm.get('title')?.hasError('required')">
              Title is required
            </mat-error>
          </mat-form-field>

          <mat-form-field class="w-full">
            <mat-label>Supplier *</mat-label>
            <mat-select formControlName="supplierId" required [disabled]="loading">
              <mat-option *ngIf="loading" value="" disabled>Loading suppliers...</mat-option>
              <mat-option *ngFor="let supplier of suppliers" [value]="supplier.id">
                {{ supplier.name }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="purchaseOrderForm.get('supplierId')?.hasError('required')">
              Supplier is required
            </mat-error>
          </mat-form-field>

          <mat-form-field class="w-full">
            <mat-label>Branch *</mat-label>
            <mat-select formControlName="branchId" required [disabled]="loading">
              <mat-option *ngIf="loading" value="" disabled>Loading branches...</mat-option>
              <mat-option *ngFor="let branch of branches" [value]="branch.id">
                {{ branch.name }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="purchaseOrderForm.get('branchId')?.hasError('required')">
              Branch is required
            </mat-error>
          </mat-form-field>

          <mat-form-field class="w-full">
            <mat-label>Expected Delivery Date</mat-label>
            <input matInput [matDatepicker]="deliveryPicker" formControlName="expectedDeliveryDate" readonly>
            <mat-datepicker-toggle matIconSuffix [for]="deliveryPicker"></mat-datepicker-toggle>
            <mat-datepicker #deliveryPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field class="w-full">
            <mat-label>Payment Terms</mat-label>
            <input matInput formControlName="paymentTerms" placeholder="e.g., Net 30">
          </mat-form-field>

          <mat-form-field class="w-full md:col-span-2">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3" placeholder="Enter PO description"></textarea>
          </mat-form-field>

          <mat-form-field class="w-full md:col-span-2">
            <mat-label>Notes</mat-label>
            <textarea matInput formControlName="notes" rows="2" placeholder="Additional notes"></textarea>
          </mat-form-field>
        </div>

        <!-- Line Items Section -->
        <div class="border-t border-gray-200 pt-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Line Items</h3>
              <p class="text-sm text-gray-600 mt-1">Add products to this purchase order</p>
            </div>
            <app-accent-button 
              label="Add Item"
              icon="add"
              (click)="addLineItem()">
            </app-accent-button>
          </div>

          <div formArrayName="lineItems" class="space-y-4">
            <div *ngFor="let item of lineItemsArray.controls; let i = index" 
                 [formGroupName]="i" 
                 class="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">Item {{ i + 1 }}</span>
                <app-danger-button 
                  label=""
                  icon="delete"
                  (click)="removeLineItem(i)"
                  [disabled]="lineItemsArray.length === 1">
                </app-danger-button>
              </div>
              
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <mat-form-field class="w-full">
                  <mat-label>Product *</mat-label>
                  <mat-select formControlName="productId" required [disabled]="loading">
                    <mat-option *ngIf="loading" value="" disabled>Loading products...</mat-option>
                    <mat-option *ngFor="let product of products" [value]="product.id">
                      {{ product.name }} ({{ product.barcode }})
                    </mat-option>
                  </mat-select>
                  <mat-error *ngIf="item.get('productId')?.hasError('required')">
                    Product is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field class="w-full">
                  <mat-label>Quantity *</mat-label>
                  <input matInput type="number" formControlName="quantity" min="1" required>
                  <mat-error *ngIf="item.get('quantity')?.hasError('required')">
                    Quantity is required
                  </mat-error>
                  <mat-error *ngIf="item.get('quantity')?.hasError('min')">
                    Quantity must be at least 1
                  </mat-error>
                </mat-form-field>

                <mat-form-field class="w-full">
                  <mat-label>Unit Price *</mat-label>
                  <input matInput type="number" formControlName="unitPrice" min="0.01" step="0.01" required>
                  <mat-error *ngIf="item.get('unitPrice')?.hasError('required')">
                    Unit price is required
                  </mat-error>
                  <mat-error *ngIf="item.get('unitPrice')?.hasError('min')">
                    Unit price must be positive
                  </mat-error>
                </mat-form-field>

                <div class="flex items-center justify-end">
                  <div class="text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded border">
                    Total: {{ getLineItemTotal(i) | currency: 'KES' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Line Items Summary -->
          <div class="mt-4 p-4 bg-brand-mint/20 rounded-lg">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700">Total Items: {{ lineItemsArray.length }}</span>
              <span class="text-lg font-bold text-gray-900">Total Amount: {{ getTotalAmount() | currency: 'KES' }}</span>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <app-secondary-button 
            label="Cancel"
            (click)="close()">
          </app-secondary-button>
          
          <app-primary-button 
            label="Create Purchase Order"
            icon="save"
            type="submit"
            [disabled]="purchaseOrderForm.invalid || submitting || loading">
          </app-primary-button>
        </div>
      </form>
    </div>
  `
})
export class CreatePurchaseOrderDialogComponent implements OnInit {
  purchaseOrderForm: FormGroup;
  submitting = false;

  // Data for dropdowns
  suppliers: any[] = [];
  branches: any[] = [];
  products: any[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreatePurchaseOrderDialogComponent>,
    private purchaseOrdersService: PurchaseOrdersService,
    private suppliersService: SuppliersService,
    private branchesService: BranchesService,
    private productsService: ProductsService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.purchaseOrderForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      supplierId: ['', Validators.required],
      branchId: ['', Validators.required],
      paymentTerms: [''],
      expectedDeliveryDate: [''],
      notes: [''],
      lineItems: this.fb.array([
        this.createLineItemForm()
      ])
    });
  }

  ngOnInit(): void {
    this.loadFormData();
  }

  get lineItemsArray(): FormArray {
    return this.purchaseOrderForm.get('lineItems') as FormArray;
  }

  loadFormData(): void {
    this.loading = true;
    
    // Load suppliers
    this.suppliersService.loadSuppliers();
    this.suppliersService.suppliers$.subscribe({
      next: (suppliers) => {
        this.suppliers = suppliers;
      },
      error: (error: any) => {
        console.error('Error loading suppliers:', error);
        this.snackBar.open('Error loading suppliers', 'Close', { duration: 3000 });
      }
    });

    // Load branches
    this.branchesService.loadBranches();
    this.branchesService.branches$.subscribe({
      next: (branches) => {
        if (branches) {
          this.branches = branches;
        }
      },
      error: (error: any) => {
        console.error('Error loading branches:', error);
        this.snackBar.open('Error loading branches', 'Close', { duration: 3000 });
      }
    });

    // Load products
    this.productsService.loadProducts();
    this.productsService.products$.subscribe({
      next: (products) => {
        this.products = products;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading products:', error);
        this.snackBar.open('Error loading products', 'Close', { duration: 3000 });
      }
    });
  }

  createLineItemForm(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0.01)]],
      expectedDeliveryDate: ['']
    });
  }

  addLineItem(): void {
    this.lineItemsArray.push(this.createLineItemForm());
  }

  removeLineItem(index: number): void {
    if (this.lineItemsArray.length > 1) {
      this.lineItemsArray.removeAt(index);
    }
  }

  getLineItemTotal(index: number): number {
    const item = this.lineItemsArray.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    return quantity * unitPrice;
  }

  getTotalAmount(): number {
    let total = 0;
    for (let i = 0; i < this.lineItemsArray.length; i++) {
      total += this.getLineItemTotal(i);
    }
    return total;
  }

  /**
   * Formats a Date object to YYYY-MM-DD string format for backend LocalDate
   */
  private formatDateForBackend(date: Date | null | undefined): string | undefined {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onSubmit(): void {
    if (this.purchaseOrderForm.valid) {
      this.submitting = true;
      
      const formValue = this.purchaseOrderForm.value;
      const request: CreatePurchaseOrderRequest = {
        title: formValue.title,
        description: formValue.description,
        supplierId: formValue.supplierId,
        branchId: formValue.branchId,
        paymentTerms: formValue.paymentTerms,
        expectedDeliveryDate: this.formatDateForBackend(formValue.expectedDeliveryDate),
        notes: formValue.notes,
        lineItems: formValue.lineItems.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          expectedDeliveryDate: this.formatDateForBackend(item.expectedDeliveryDate)
        }))
      };

      this.purchaseOrdersService.createPurchaseOrder(request, 'current-user').subscribe({
        next: (result) => {
          this.submitting = false;
          this.dialogRef.close(result);
        },
        error: (error) => {
          this.submitting = false;
          console.error('Error creating purchase order:', error);
          this.snackBar.open('Error creating purchase order', 'Close', { duration: 3000 });
        }
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
