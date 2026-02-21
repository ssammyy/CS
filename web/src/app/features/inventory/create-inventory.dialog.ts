import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';

import { InventoryService, CreateInventoryRequest } from '../../core/services/inventory.service';
import { ProductsService, ProductDto } from '../../core/services/products.service';
import { BranchesService, BranchDto } from '../../core/services/branches.service';
import { BranchContextService } from '../../core/services/branch-context.service';

export interface CreateInventoryDialogData {
  branches: BranchDto[];
}

/**
 * Enhanced dialog component for creating new inventory items.
 * Provides a comprehensive form for inventory creation with all backend fields.
 * Automatically defaults branch selection to current branch context if available.
 */
@Component({
  selector: 'app-create-inventory-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatAutocompleteModule
  ],
  template: `
    <div class="h-[min(92vh,800px)] bg-white rounded-lg shadow-lg">
      <div class="px-5 pt-5">
        <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-coral to-brand-sky mb-4"></div>
        <h2 class="text-2xl font-semibold">Add New Stock</h2>
        <p class="text-gray-600 mt-1 text-sm">Add inventory for a product at a specific branch</p>
      </div>

      <form #inventoryForm="ngForm" (ngSubmit)="onSubmit()" class="p-5 pt-3 space-y-6">
        <!-- Product Selection Section -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">inventory</mat-icon>
            Product & Branch Selection
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Product *</mat-label>
              <input
                matInput
                type="text"
                name="productSearch"
                [(ngModel)]="productSearchInput"
                (ngModelChange)="onProductSearchChange($event)"
                (focus)="onProductSearchFocus()"
                [matAutocomplete]="productAutocomplete"
                placeholder="Search by name, generic name, strength, or barcode..."
                [required]="!inventory.productId"
                autocomplete="off">
              <mat-icon matPrefix class="mr-2 opacity-60">search</mat-icon>
              <mat-autocomplete
                #productAutocomplete="matAutocomplete"
                [displayWith]="displayProductFn"
                (optionSelected)="onProductSelected($event)"
                (closed)="onAutocompleteClosed()">
                <mat-option *ngFor="let product of filteredProducts" [value]="product">
                  <div class="flex flex-col">
                    <span class="font-medium">{{ product?.name ?? '' }}</span>
                    <span *ngIf="(product?.strength || product?.genericName)" class="text-xs text-gray-500">
                      {{ product?.strength ?? '' }}
                      {{ product?.strength && product?.genericName ? ' • ' : '' }}
                      {{ product?.genericName ?? '' }}
                    </span>
                  </div>
                </mat-option>
                <mat-option *ngIf="filteredProducts.length === 0 && getProductSearchText().trim()" [value]="null" disabled>
                  <span class="text-gray-500">No products found</span>
                </mat-option>
              </mat-autocomplete>
              <mat-error *ngIf="inventoryForm.submitted && !inventory.productId">
                Product selection is required
              </mat-error>
            </mat-form-field>

            <mat-form-field class="w-full" color="primary">
              <mat-label>Branch *</mat-label>
              <mat-select name="branchId" [(ngModel)]="inventory.branchId" required>
                <mat-option value="">Select Branch</mat-option>
                <mat-option *ngFor="let branch of data.branches" [value]="branch.id">
                  {{ branch.name }}
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="currentBranchContext">
                <span class="text-brand-sky">Defaulted to current branch: {{ currentBranchContext.name }}</span>
              </mat-hint>
              <mat-hint *ngIf="!currentBranchContext">
                <span class="text-gray-600">Please select a branch to add stock to</span>
              </mat-hint>
            </mat-form-field>
          </div>
        </div>

        <!-- Stock Details Section -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">add_shopping_cart</mat-icon>
            Stock Details
          </h3>

          <div class="grid grid-cols-1 gap-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Quantity *</mat-label>
              <input
                matInput
                type="number"
                name="quantity"
                [(ngModel)]="inventory.quantity"
                required
                min="1"
                placeholder="e.g., 100" />
            </mat-form-field>
          </div>
        </div>

        <!-- Financial Information (from product; editable) -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">attach_money</mat-icon>
            Financial Information
          </h3>
          <p *ngIf="selectedProduct" class="text-sm text-gray-600 mb-3">
            Defaults from selected product. You can override for this batch if needed.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Unit Cost (KES)</mat-label>
              <input
                matInput
                type="number"
                name="unitCost"
                [(ngModel)]="inventory.unitCost"
                min="0"
                step="0.01"
                placeholder="From product or enter manually" />
              <mat-hint>Cost per unit{{ selectedProduct?.unitCost != null ? ' (from product)' : '' }}</mat-hint>
            </mat-form-field>

            <mat-form-field class="w-full" color="primary">
              <mat-label>Selling Price (KES)</mat-label>
              <input
                matInput
                type="number"
                name="sellingPrice"
                [(ngModel)]="inventory.sellingPrice"
                min="0"
                step="0.01"
                placeholder="From product or enter manually" />
              <mat-hint>Price per unit{{ selectedProduct?.sellingPrice != null ? ' (from product)' : '' }}</mat-hint>
            </mat-form-field>
          </div>
        </div>

        <!-- Additional Information Section -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <mat-icon class="text-brand-sky">info</mat-icon>
            Additional Information
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field class="w-full" color="primary">
              <mat-label>Location in Branch</mat-label>
              <input
                matInput
                name="locationInBranch"
                [(ngModel)]="inventory.locationInBranch"
                placeholder="e.g., Shelf A1, Refrigerator 2" />
            </mat-form-field>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="pt-4 grid grid-cols-2 gap-3">
          <button
            mat-stroked-button
            type="button"
            (click)="close()"
            class="!py-3">
            Cancel
          </button>
          <button
            mat-raised-button
            color="primary"
            type="submit"
            class="!py-3 bg-brand-coral text-white hover:opacity-95"
            [disabled]="!inventoryForm.valid || !inventory.productId || submitting">
            <mat-icon *ngIf="submitting" class="animate-spin">refresh</mat-icon>
            {{ submitting ? 'Adding Stock...' : 'Add Stock' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class CreateInventoryDialogComponent implements OnInit {
  private readonly ref = inject(MatDialogRef<CreateInventoryDialogComponent, any>);
  readonly data: CreateInventoryDialogData = inject(MAT_DIALOG_DATA);
  private readonly inventoryService = inject(InventoryService);
  private readonly productsService = inject(ProductsService);
  private readonly branchContextService = inject(BranchContextService);
  private readonly snackBar = inject(MatSnackBar);

  inventory: CreateInventoryRequest = {
    productId: '',
    branchId: '',
    batchNumber: '',
    expiryDate: '',
    manufacturingDate: '',
    quantity: 0,
    unitCost: undefined,
    sellingPrice: undefined,
    locationInBranch: ''
  };

  products: ProductDto[] = [];
  filteredProducts: ProductDto[] = [];
  /** Model for the product input: string when typing to search, ProductDto when an option was selected (Material sets this). */
  productSearchInput: string | ProductDto = '';
  selectedProduct: ProductDto | null = null;
  currentBranchContext: BranchDto | null = null;
  submitting = false;

  ngOnInit(): void {
    this.loadProducts();
    this.setDefaultBranch();
  }

  /**
   * Sets the default branch based on current branch context.
   * If user has a branch context, automatically selects it.
   * If no context, leaves branch selection open for manual choice.
   */
  private setDefaultBranch(): void {
    // Subscribe to current branch context
    this.branchContextService.currentBranch$.subscribe(branch => {
      this.currentBranchContext = branch;
      
      if (branch) {
        // Auto-select the current branch context
        this.inventory.branchId = branch.id;
        console.log('🎯 Auto-selected current branch context:', branch.name);
      } else {
        // No branch context - leave selection open
        this.inventory.branchId = '';
        console.log('ℹ️ No branch context - user must select branch manually');
      }
    });
  }

  loadProducts(): void {
    this.productsService.loadProducts();
    this.productsService.products$.subscribe(products => {
      this.products = products ?? [];
      this.onProductSearchChange(); // Re-apply current search so dropdown stays in sync
    });
  }

  /**
   * Returns the current search text as a string (for filtering and "no results" check).
   * When user has selected a product, productSearchInput is the object; we still return display string.
   */
  getProductSearchText(): string {
    const v = this.productSearchInput;
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object' && 'id' in v) return this.displayProductFn(v);
    return '';
  }

  /**
   * Applies product-level unit cost and selling price to the inventory form.
   * Called when a product is selected so financial fields default from the product.
   */
  private applyProductPricing(product: ProductDto): void {
    this.inventory.unitCost = product.unitCost ?? undefined;
    this.inventory.sellingPrice = product.sellingPrice ?? undefined;
  }

  /**
   * Clears product-derived financial fields when product selection is cleared.
   */
  private clearProductPricing(): void {
    this.inventory.unitCost = undefined;
    this.inventory.sellingPrice = undefined;
  }

  /**
   * Handles product input changes: typed search text or selected option (Material sets model to option value).
   * When value is a ProductDto (from selection), we keep it and set selectedProduct/productId and apply product pricing.
   * When value is a string (typing), we filter the list and clear selection.
   */
  onProductSearchChange(value?: string | ProductDto): void {
    const raw = value !== undefined ? value : this.productSearchInput;

    if (raw && typeof raw === 'object' && 'id' in raw && raw.id) {
      this.selectedProduct = raw as ProductDto;
      this.inventory.productId = (raw as ProductDto).id;
      this.applyProductPricing(raw as ProductDto);
      return;
    }

    const searchTerm = (typeof raw === 'string' ? raw : '').toLowerCase().trim();
    if (searchTerm === '' && typeof raw === 'string') {
      this.selectedProduct = null;
      this.inventory.productId = '';
      this.clearProductPricing();
    }
    if (!searchTerm) {
      this.filteredProducts = [...this.products];
      return;
    }

    this.filteredProducts = this.products.filter(product => {
      if (!product) return false;
      const nameMatch = (product.name ?? '').toLowerCase().includes(searchTerm);
      const genericMatch = (product.genericName ?? '').toLowerCase().includes(searchTerm);
      const strengthMatch = (product.strength ?? '').toLowerCase().includes(searchTerm);
      const barcodeMatch = (product.barcode ?? '').toLowerCase().includes(searchTerm);
      return nameMatch || genericMatch || strengthMatch || barcodeMatch;
    });
  }

  /**
   * Handles product search input focus - shows all products when focused and no search text.
   */
  onProductSearchFocus(): void {
    if (!this.getProductSearchText()) {
      this.filteredProducts = [...this.products];
    }
  }

  /**
   * Handles product selection from autocomplete dropdown.
   * Syncs selection state and applies product-level unit cost and selling price to the form.
   */
  onProductSelected(event: { option: { value: ProductDto | null } }): void {
    const product = event.option.value as ProductDto | null;
    if (!product?.id) return;
    this.selectedProduct = product;
    this.inventory.productId = product.id;
    this.applyProductPricing(product);
  }

  /**
   * Handles autocomplete panel closing - no-op; Material uses displayWith to show the selected product.
   */
  onAutocompleteClosed(): void {
    // Model is already the product object; displayWith will show the name
  }

  /**
   * Display function for autocomplete - converts model value to the string shown in the input.
   * When user selects an option, Material sets the model to the product object; this turns it into the display text.
   */
  displayProductFn(product: ProductDto | string | null | undefined): string {
    if (product == null) return '';
    if (typeof product === 'string') return product;
    const name = (product.name ?? '').trim();
    const strength = (product.strength ?? '').trim();
    if (!name) return '';
    return strength ? `${name} (${strength})` : name;
  }

  onSubmit(): void {
    if (this.submitting) return;

    // Validate product selection
    if (!this.inventory.productId) {
      this.snackBar.open('Please select a product', 'Close', { duration: 3000 });
      return;
    }

    this.submitting = true;
    this.inventoryService.createInventory(this.inventory).subscribe({
      next: () => {
        this.submitting = false;
        this.snackBar.open('Stock added successfully!', 'Close', { duration: 3000 });
        this.ref.close(true);
      },
      error: (error) => {
        console.error('Error adding stock:', error);
        this.submitting = false;
        this.snackBar.open('Error adding stock. Please try again.', 'Close', { duration: 5000 });
      }
    });
  }

  close(): void {
    this.ref.close();
  }
}
