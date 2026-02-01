import { Component, OnInit, OnDestroy, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { SalesService, CreateSaleRequest, CreateSaleLineItemRequest, CreateSalePaymentRequest, BarcodeScanRequest, BarcodeScanResponse, PaymentMethod, CustomerDto } from '../../../core/services/sales.service';
import { ProductsService, ProductDto } from '../../../core/services/products.service';
import { InventoryService, InventoryDto } from '../../../core/services/inventory.service';
import { BranchContextService } from '../../../core/services/branch-context.service';
import { ErrorService } from '../../../core/services/error.service';
import { CreditService, CreateCreditAccountRequest } from '../../../core/services/credit.service';
import { MpesaService } from '../../../core/services/mpesa.service';
import { MpesaPaymentDialogComponent } from './mpesa-payment.dialog';

/**
 * Enhanced search result that includes product and inventory details
 */
interface ProductSearchResult {
  product: ProductDto;
  inventoryItems: CachedInventoryItem[];
  totalQuantity: number;
  hasMultipleBatches: boolean;
  selectedBatchIndex?: number; // Index of selected batch
}

/**
 * Saam POS (Point of Sale) component for processing sales transactions.
 * Provides barcode scanning, cart management, and payment processing.
 *
 * This component follows the UI Design Language Rule by:
 * - Using the approved color palette (Mint Green, Light Blue, Soft Coral)
 * - Implementing consistent input fields and button styling
 * - Following the design system for typography and spacing
 * - Ensuring accessibility with proper contrast and focus states
 */
@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatDialogModule
  ],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.scss'
})
export class PosComponent implements OnInit, OnDestroy {
  private readonly salesService = inject(SalesService);
  private readonly productsService = inject(ProductsService);
  private readonly inventoryService = inject(InventoryService);
  private readonly creditService = inject(CreditService);
  private readonly mpesaService = inject(MpesaService);
  readonly branchContext = inject(BranchContextService);
  private readonly errorService = inject(ErrorService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  // Component state
  readonly cart = signal<CartItem[]>([]);
  readonly barcodeInput = signal('');
  readonly productSearchInput = signal('');
  readonly searchResults = signal<ProductSearchResult[]>([]);
  readonly showSearchResults = signal(false);
  readonly isSearching = signal(false);
  readonly selectedSearchIndex = signal(-1);
  readonly customerName = signal('');
  readonly customerPhone = signal('');
  readonly notes = signal('');
  readonly selectedPaymentMethod = signal<PaymentMethod>(PaymentMethod.CASH);
  readonly paymentAmount = signal(0);
  readonly isProcessing = signal(false);
  readonly showCustomerForm = signal(false);
  
  // Credit sale toggle
  readonly isCreditSale = signal(false);
  
  // Credit payment form fields
  readonly showCreditForm = signal(false);
  readonly creditLimit = signal(0);
  readonly expectedPaymentDate = signal('');
  readonly creditNotes = signal('');

  // Customer search and management
  readonly customerSearchInput = signal('');
  readonly customerSearchResults = signal<CustomerDto[]>([]);
  readonly showCustomerSearchResults = signal(false);
  readonly isCustomerSearching = signal(false);
  readonly selectedCustomer = signal<CustomerDto | null>(null);
  readonly showCreateCustomerForm = signal(false);
  readonly isCreatingCustomer = signal(false);
  readonly hasSearched = signal(false);
  readonly customerSortOrder = signal<'asc' | 'desc'>('asc');
  
  // Advanced search
  showAdvancedSearch = false;
  advancedSearch = {
    firstName: '',
    lastName: '',
    phone: '',
    customerNumber: '',
    isActive: ''
  };
  
  // New customer form fields
  readonly newCustomerFirstName = signal('');
  readonly newCustomerLastName = signal('');
  readonly newCustomerPhone = signal('');

  // Caching state
  private productCache = new Map<string, ProductDto>();
  private inventoryCache = new Map<string, CachedInventoryItem[]>();
  private pricingCache = new Map<string, number>();
  private lastCacheUpdate = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000; // Maximum items to cache

  // Draft management state
  readonly savedDrafts = signal<SaleDraft[]>([]);
  readonly currentDraftId = signal<string | null>(null);
  readonly isDraftModified = signal(false);
  private autoSaveTimeout: any;
  private readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  private readonly DRAFT_STORAGE_KEY = 'pos_sale_drafts';

  // Branch context state
  readonly currentBranchId = signal<string | null>(null);
  readonly isBranchValid = signal(false);

  // Calculated values
  readonly subtotal = signal(0);
  readonly discountAmount = signal(0);
  readonly totalAmount = signal(0);
  readonly changeAmount = signal(0);
  readonly remainingBalance = signal(0);

  // M-Pesa state
  readonly mpesaEnabled = signal(false);
  readonly mpesaLoading = signal(false);

  // Available payment methods (excluding CREDIT which is handled separately)
  readonly paymentMethods = Object.values(PaymentMethod).filter(method => method !== PaymentMethod.CREDIT);

  // Search timeout for debouncing
  private searchTimeout: any;
  private customerSearchTimeout: any;

  ngOnInit(): void {
    // Load saved drafts from localStorage
    this.loadSavedDrafts();

    // Set up auto-save
    this.setupAutoSave();

    // Load M-Pesa configuration
    this.loadMpesaConfiguration();

    // Subscribe to branch context changes
    this.branchContext.currentBranch$.subscribe(branch => {
      this.handleBranchChange(branch);
    });
  }

  /**
   * Handles branch context changes
   */
  private handleBranchChange(branch: any): void {
    if (!branch) {
      // No branch selected - redirect to branch selection
      this.currentBranchId.set(null);
      this.isBranchValid.set(false);
      this.clearAllData();
      this.router.navigate(['/branches']);
      return;
    }

    // Branch selected - validate and initialize
    this.currentBranchId.set(branch.id);
    this.isBranchValid.set(true);
    
    // Clear any existing data from previous branch
    this.clearAllData();
    
    // Initialize cache for the new branch
    this.initializeCache();
    
    // Check for existing draft for this branch
    this.loadBranchDraft(branch.id);
  }

  /**
   * Clears all Saam POS data when switching branches
   */
  private clearAllData(): void {
    // Clear cart
    this.cart.set([]);
    
    // Clear form data
    this.customerName.set('');
    this.customerPhone.set('');
    this.notes.set('');
    this.selectedPaymentMethod.set(PaymentMethod.CASH);
    this.paymentAmount.set(0);
    this.showCustomerForm.set(false);
    
    // Clear credit form data
    this.isCreditSale.set(false);
    this.showCreditForm.set(false);
    this.creditLimit.set(0);
    
    // Clear customer search and selection
    this.clearCustomerSearch();
    this.clearSelectedCustomer();
    this.cancelCreateCustomer();
    this.clearAdvancedSearch();
    this.expectedPaymentDate.set('');
    this.creditNotes.set('');
    
    // Clear search data
    this.productSearchInput.set('');
    this.searchResults.set([]);
    this.showSearchResults.set(false);
    this.selectedSearchIndex.set(-1);
    
    // Clear barcode input
    this.barcodeInput.set('');
    
    // Clear current draft
    this.currentDraftId.set(null);
    this.isDraftModified.set(false);
    
    // Clear cache
    this.invalidateCache();
    
    // Recalculate totals
    this.recalculateTotals();
  }

  /**
   * Initializes the cache with product and inventory data
   */
  private async initializeCache(): Promise<void> {
    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) return;

    try {
      // Load all products and inventory data in parallel
      const [productsResponse, inventoryData] = await Promise.all([
        this.productsService.searchProducts('').toPromise(), // Empty query to get all products
        this.inventoryService.getInventoryByBranch(currentBranch.id).toPromise()
      ]);

      if (productsResponse?.products) {
        // Cache all products for fast search
        productsResponse.products.forEach((product: ProductDto) => {
          this.productCache.set(product.id, product);
          this.productCache.set(product.barcode || '', product); // Cache by barcode too
        });
      }

      if (inventoryData) {
        // Cache inventory data by product ID
        const inventoryByProduct = new Map<string, CachedInventoryItem[]>();
        inventoryData.forEach((inv: InventoryDto) => {
          if (!inventoryByProduct.has(inv.productId)) {
            inventoryByProduct.set(inv.productId, []);
          }
          inventoryByProduct.get(inv.productId)!.push({
            inventoryId: inv.id,
            productId: inv.productId,
            branchId: inv.branchId,
            quantity: inv.quantity,
            location: inv.locationInBranch || 'Unknown',
            expiryDate: inv.expiryDate,
            sellingPrice: inv.sellingPrice,
            batchNumber: inv.batchNumber,
            manufacturingDate: inv.manufacturingDate
          });

          // Cache pricing data
          if (inv.sellingPrice && inv.sellingPrice > 0) {
            this.pricingCache.set(inv.productId, inv.sellingPrice);
          }
        });

        // Store inventory cache
        inventoryByProduct.forEach((items, productId) => {
          this.inventoryCache.set(productId, items);
        });
      }

      this.lastCacheUpdate = Date.now();
      console.log('Saam POS Cache initialized successfully');
    } catch (error: any) {
      console.error('Failed to initialize Saam POS cache:', error);
      this.handleApiError(error, 'Failed to load product data');
    }
  }

  /**
   * Checks if cache is still valid
   */
  private isCacheValid(): boolean {
    return (Date.now() - this.lastCacheUpdate) < this.CACHE_DURATION;
  }

  /**
   * Refreshes the cache if needed
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    if (!this.isCacheValid()) {
      await this.initializeCache();
    }
  }

  /**
   * Scans barcode and adds product to cart using cached data
   */
  async scanBarcode(): Promise<void> {
    const barcode = this.barcodeInput().trim();
    if (!barcode) return;

    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) {
      return; // getCurrentBranch already handles the error and navigation
    }

    try {
      // Ensure cache is up to date
      await this.refreshCacheIfNeeded();
      
      // Look up product in cache by barcode
      const product = this.productCache.get(barcode);
      if (!product) {
        this.errorService.show('Product not found');
        return;
      }

      // Get inventory data from cache
      const inventoryData = this.inventoryCache.get(product.id) || [];
      const availableInventory = inventoryData.filter(inv => inv.quantity > 0);
      
      if (availableInventory.length === 0) {
        this.errorService.show('Product out of stock');
        return;
      }

      // Get selling price from cache
      const sellingPrice = this.pricingCache.get(product.id) || 0;

      // Create BarcodeScanResponse from cached data
      const response: BarcodeScanResponse = {
        productId: product.id,
        productName: product.name,
        barcode: product.barcode || '',
        availableInventory: availableInventory,
        sellingPrice: sellingPrice,
        requiresPrescription: product.requiresPrescription
      };

      this.addProductToCart(response);
      this.barcodeInput.set('');
      
    } catch {
      this.errorService.show('Product not found or out of stock');
    }
  }

  /**
   * Searches for products by name using cached data
   */
  async searchProducts(): Promise<void> {
    const query = this.productSearchInput().trim();
    if (!query || query.length < 2) {
      this.searchResults.set([]);
      this.showSearchResults.set(false);
      return;
    }

    this.isSearching.set(true);
    
    try {
      // Ensure cache is up to date
      await this.refreshCacheIfNeeded();
      
      // Search in cached products and create enhanced results
      const searchResults: ProductSearchResult[] = [];
      const queryLower = query.toLowerCase();
      
      for (const [key, product] of this.productCache) {
        // Skip barcode entries (they're duplicates)
        if (key === product.barcode) continue;
        
        // Search in product name and generic name
        if (
          product.name.toLowerCase().includes(queryLower) ||
          (product.genericName && product.genericName.toLowerCase().includes(queryLower))
        ) {
          // Get inventory items for this product
          const inventoryItems = this.inventoryCache.get(product.id) || [];
          const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
          const hasMultipleBatches = inventoryItems.length > 1;
          
          searchResults.push({
            product,
            inventoryItems,
            totalQuantity,
            hasMultipleBatches,
            selectedBatchIndex: 0 // Default to first batch
          });
        }
      }
      
      // Sort by relevance (exact matches first, then partial matches)
      searchResults.sort((a, b) => {
        const aName = a.product.name.toLowerCase();
        const bName = b.product.name.toLowerCase();
        
        if (aName.startsWith(queryLower) && !bName.startsWith(queryLower)) return -1;
        if (!aName.startsWith(queryLower) && bName.startsWith(queryLower)) return 1;
        
        return aName.localeCompare(bName);
      });
      
      // Limit results to prevent UI overload
      this.searchResults.set(searchResults.slice(0, 20));
      this.showSearchResults.set(true);
      
    } catch (error: any) {
      this.handleApiError(error, 'Failed to search products');
      this.searchResults.set([]);
      this.showSearchResults.set(false);
    } finally {
      this.isSearching.set(false);
    }
  }

  /**
   * Selects a product from search results and adds to cart using cached data
   */
  async selectProductFromSearch(searchResult: ProductSearchResult): Promise<void> {
    const product = searchResult.product;
    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) {
      return; // getCurrentBranch already handles the error and navigation
    }

    // Check if product already exists in cart
    const existingItem = this.cart().find(item => item.productId === product.id);
    if (existingItem) {
      // Update quantity if product already in cart
      this.updateCartItemQuantity(existingItem.id, existingItem.quantity + 1);
      this.snackBar.open(`${product.name} quantity updated`, 'Close', { duration: 2000 });
    } else {
      // Use selected batch or first available batch
      const selectedBatch = this.getSelectedBatch(searchResult);
      const availableInventory = selectedBatch ? [selectedBatch] : searchResult.inventoryItems.filter(inv => inv.quantity > 0);
      
      if (availableInventory.length === 0) {
        this.errorService.show('Product out of stock');
        return;
      }

      const sellingPrice = this.pricingCache.get(product.id) || 0;
      
      const scanResponse: BarcodeScanResponse = {
        productId: product.id,
        productName: product.name,
        barcode: product.barcode || '',
        availableInventory: availableInventory,
        sellingPrice: sellingPrice,
        requiresPrescription: product.requiresPrescription
      };

      this.addProductToCart(scanResponse);
      this.snackBar.open(`${product.name} added to cart`, 'Close', { duration: 2000 });
    }

    this.productSearchInput.set('');
    this.showSearchResults.set(false);
    this.searchResults.set([]);
    this.selectedSearchIndex.set(-1);
  }

  /**
   * Clears search results
   */
  clearSearchResults(): void {
    this.productSearchInput.set('');
    this.searchResults.set([]);
    this.showSearchResults.set(false);
    this.selectedSearchIndex.set(-1);
  }

  /**
   * Invalidates cache after a successful sale to ensure data consistency
   */
  private invalidateCache(): void {
    this.productCache.clear();
    this.inventoryCache.clear();
    this.pricingCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Manages cache size to prevent memory issues
   */
  private manageCacheSize(): void {
    if (this.productCache.size > this.MAX_CACHE_SIZE) {
      // Remove oldest entries (simple FIFO approach)
      const entries = Array.from(this.productCache.entries());
      const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => this.productCache.delete(key));
    }
  }

  /**
   * Loads saved drafts from localStorage
   */
  private loadSavedDrafts(): void {
    try {
      const savedDraftsJson = localStorage.getItem(this.DRAFT_STORAGE_KEY);
      if (savedDraftsJson) {
        const drafts: SaleDraft[] = JSON.parse(savedDraftsJson);
        this.savedDrafts.set(drafts);
      }
    } catch (error) {
      console.error('Failed to load saved drafts:', error);
      this.savedDrafts.set([]);
    }
  }

  /**
   * Saves drafts to localStorage
   */
  private saveDraftsToStorage(): void {
    try {
      const drafts = this.savedDrafts();
      localStorage.setItem(this.DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    } catch (error) {
      console.error('Failed to save drafts:', error);
    }
  }

  /**
   * Sets up auto-save functionality
   */
  private setupAutoSave(): void {
    // Auto-save every 30 seconds if there are changes
    setInterval(() => {
      if (this.isDraftModified() && this.cart().length > 0) {
        this.autoSaveDraft();
      }
    }, this.AUTO_SAVE_INTERVAL);
  }

  /**
   * Auto-saves the current draft
   */
  private autoSaveDraft(): void {
    if (this.cart().length === 0) return;

    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) return;

    const draft: SaleDraft = this.createDraftFromCurrentState();
    this.saveDraft(draft, true); // true for auto-save
  }

  /**
   * Creates a draft from the current Saam POS state
   */
  private createDraftFromCurrentState(): SaleDraft {
    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) {
      throw new Error('No valid branch context for creating draft');
    }
    
    return {
      id: this.currentDraftId() || this.generateDraftId(),
      branchId: currentBranch.id,
      branchName: currentBranch.name,
      cartItems: this.cart(),
      customerName: this.customerName(),
      customerPhone: this.customerPhone(),
      notes: this.notes(),
      selectedPaymentMethod: this.selectedPaymentMethod(),
      paymentAmount: this.paymentAmount(),
      subtotal: this.subtotal(),
      discountAmount: this.discountAmount(),
      totalAmount: this.totalAmount(),
      showCustomerForm: this.showCustomerForm(),
      // Credit form fields
      isCreditSale: this.isCreditSale(),
      creditLimit: this.creditLimit(),
      expectedPaymentDate: this.expectedPaymentDate(),
      creditNotes: this.creditNotes(),
      remainingBalance: this.remainingBalance(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAutoSaved: false
    };
  }

  /**
   * Saves a draft
   */
  saveDraft(draft?: SaleDraft, isAutoSave = false): void {
    const draftToSave = draft || this.createDraftFromCurrentState();
    draftToSave.isAutoSaved = isAutoSave;
    draftToSave.updatedAt = new Date().toISOString();

    const currentDrafts = this.savedDrafts();
    const existingIndex = currentDrafts.findIndex(d => d.id === draftToSave.id);

    if (existingIndex >= 0) {
      // Update existing draft
      currentDrafts[existingIndex] = draftToSave;
    } else {
      // Add new draft
      currentDrafts.push(draftToSave);
    }

    this.savedDrafts.set([...currentDrafts]);
    this.currentDraftId.set(draftToSave.id);
    this.isDraftModified.set(false);
    this.saveDraftsToStorage();

    if (!isAutoSave) {
      this.snackBar.open('Draft saved successfully', 'Close', { duration: 2000 });
    }
  }

  /**
   * Loads a specific draft
   */
  loadDraft(draftId: string): void {
    const draft = this.savedDrafts().find(d => d.id === draftId);
    if (!draft) {
      this.errorService.show('Draft not found');
      return;
    }

    // Validate branch context
    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) {
      return; // getCurrentBranch already handles the error and navigation
    }

    // Check if current branch matches draft branch
    if (draft.branchId !== currentBranch.id) {
      this.errorService.show('This draft belongs to a different branch');
      return;
    }

    // Load draft data into current state
    this.cart.set(draft.cartItems);
    this.customerName.set(draft.customerName);
    this.customerPhone.set(draft.customerPhone);
    this.notes.set(draft.notes);
    this.selectedPaymentMethod.set(draft.selectedPaymentMethod);
    this.paymentAmount.set(draft.paymentAmount);
    
    // Restore customer form visibility
    if (draft.showCustomerForm !== undefined) {
      this.showCustomerForm.set(draft.showCustomerForm);
    }
    
    // Load credit form fields if they exist
    if (draft.isCreditSale !== undefined) {
      this.isCreditSale.set(draft.isCreditSale);
    }
    if (draft.creditLimit !== undefined) {
      this.creditLimit.set(draft.creditLimit);
    }
    if (draft.expectedPaymentDate) {
      this.expectedPaymentDate.set(draft.expectedPaymentDate);
    }
    if (draft.creditNotes) {
      this.creditNotes.set(draft.creditNotes);
    }
    if (draft.remainingBalance !== undefined) {
      this.remainingBalance.set(draft.remainingBalance);
    }
    
    // Show credit form if it's a credit sale
    this.showCreditForm.set(draft.isCreditSale === true);
    
    this.currentDraftId.set(draft.id);
    this.isDraftModified.set(false);

    // Recalculate totals
    this.recalculateTotals();

    this.snackBar.open('Draft loaded successfully', 'Close', { duration: 2000 });
  }

  /**
   * Loads the most recent draft for the current branch
   */
  private loadBranchDraft(branchId: string): void {
    const branchDrafts = this.savedDrafts()
      .filter(d => d.branchId === branchId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    if (branchDrafts.length > 0) {
      // Ask user if they want to continue with the draft
      this.promptToLoadDraft(branchDrafts[0]);
    }
  }

  /**
   * Prompts user to load a draft
   */
  private promptToLoadDraft(draft: SaleDraft): void {
    const message = `You have an unsaved draft from ${new Date(draft.updatedAt).toLocaleString()}. Do you want to continue?`;
    
    // For now, we'll use a simple confirm dialog
    // In a real app, you might want to use a custom dialog component
    if (confirm(message)) {
      this.loadDraft(draft.id);
    } else {
      this.deleteDraft(draft.id);
    }
  }

  /**
   * Deletes a draft
   */
  deleteDraft(draftId: string): void {
    const currentDrafts = this.savedDrafts().filter(d => d.id !== draftId);
    this.savedDrafts.set(currentDrafts);
    this.saveDraftsToStorage();

    if (this.currentDraftId() === draftId) {
      this.currentDraftId.set(null);
    }

    this.snackBar.open('Draft deleted', 'Close', { duration: 2000 });
  }

  /**
   * Clears all drafts for the current branch
   */
  clearAllDrafts(): void {
    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) return;

    const currentDrafts = this.savedDrafts().filter(d => d.branchId !== currentBranch.id);
    this.savedDrafts.set(currentDrafts);
    this.saveDraftsToStorage();
    this.currentDraftId.set(null);

    this.snackBar.open('All drafts cleared', 'Close', { duration: 2000 });
  }

  /**
   * Generates a unique draft ID
   */
  private generateDraftId(): string {
    return 'draft-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Validates that a valid branch is selected
   */
  private validateBranchContext(): boolean {
    if (!this.isBranchValid() || !this.currentBranchId()) {
      this.errorService.show('No branch selected. Please select a branch to continue.');
      this.router.navigate(['/branches']);
      return false;
    }
    return true;
  }

  /**
   * Gets the current branch with validation
   */
  private getCurrentBranch(): any {
    if (!this.validateBranchContext()) {
      return null;
    }
    return this.branchContext.currentBranch;
  }

  /**
   * Extracts and displays detailed error messages from API responses
   */
  private handleApiError(error: any, defaultMessage: string): void {
    let errorMessage = defaultMessage;
    
    if (error?.error?.detail) {
      // Use the detailed error message from the API response
      errorMessage = error.error.detail;
    } else if (error?.error?.message) {
      // Fallback to message field
      errorMessage = error.error.message;
    } else if (error?.message) {
      // Fallback to general error message
      errorMessage = error.message;
    }
    
    this.errorService.show(errorMessage);
  }

  /**
   * Handles stock validation errors with specific messaging
   */
  private handleStockError(error: any): void {
    let errorMessage = 'Insufficient stock available';
    
    if (error?.error?.detail) {
      // Check if it's a stock-related error
      if (error.error.detail.includes('Insufficient stock') || 
          error.error.detail.includes('Available:') || 
          error.error.detail.includes('Requested:')) {
        errorMessage = error.error.detail;
      } else {
        errorMessage = error.error.detail;
      }
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    this.errorService.show(errorMessage);
  }

  /**
   * Adds a scanned product to the cart
   */
  private addProductToCart(scanResponse: BarcodeScanResponse): void {
    const existingItem = this.cart().find(item => item.productId === scanResponse.productId);

    if (existingItem) {
      // Update quantity if product already in cart
      this.updateCartItemQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      // Add new item to cart
      const newItem: CartItem = {
        id: this.generateCartItemId(),
        productId: scanResponse.productId,
        productName: scanResponse.productName,
        barcode: scanResponse.barcode,
        quantity: 1,
        unitPrice: scanResponse.sellingPrice || 0,
        discountAmount: 0, // Initialize discount to 0
        lineTotal: scanResponse.sellingPrice || 0,
        requiresPrescription: scanResponse.requiresPrescription,
        inventoryItems: scanResponse.availableInventory
      };

      this.cart.update(items => [...items, newItem]);
    }

    this.recalculateTotals();
    this.isDraftModified.set(true);
  }

  /**
   * Gets available stock for a cart item
   */
  getAvailableStock(item: CartItem): number {
    const inventoryData = this.inventoryCache.get(item.productId) || [];
    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) return 0;
    
    const branchInventory = inventoryData.filter(inv => inv.branchId === currentBranch.id);
    return branchInventory.reduce((sum, inv) => sum + inv.quantity, 0);
  }

  /**
   * Updates quantity of a cart item (called on blur or Enter)
   */
  updateCartItemQuantity(itemId: string, quantity: number): void {
    // If quantity is 0 or negative, remove the item
    if (!quantity || quantity <= 0) {
      this.removeCartItem(itemId);
      return;
    }

    // Find the item to check available stock
    const item = this.cart().find(i => i.id === itemId);
    if (!item) return;

    const availableStock = this.getAvailableStock(item);
    
    // Validate against available stock
    if (quantity > availableStock) {
      this.snackBar.open(
        `Insufficient stock! Only ${availableStock} units available for ${item.productName}`,
        'Close',
        { duration: 4000 }
      );
      // Reset to available stock
      item.quantity = Math.min(item.quantity, availableStock);
      return;
    }

    // Update cart item and recalculate immediately
    this.cart.update(items =>
      items.map(i => {
        if (i.id === itemId) {
          const itemSubtotal = i.unitPrice * quantity;
          const itemDiscount = i.discountAmount || 0;
          const maxAllowedDiscount = itemSubtotal * 0.1; // 10% max
          const validDiscount = Math.min(itemDiscount, maxAllowedDiscount);
          return { 
            ...i, 
            quantity, 
            discountAmount: validDiscount,
            lineTotal: itemSubtotal - validDiscount 
          };
        }
        return i;
      })
    );

    this.recalculateTotals();
    this.isDraftModified.set(true);
  }

  /**
   * Handles Enter key press on quantity input
   */
  onQuantityEnter(event: Event, itemId: string, quantity: number): void {
    this.updateCartItemQuantity(itemId, quantity);
    (event.target as HTMLInputElement).blur();
  }

  /**
   * Removes an item from the cart
   */
  removeCartItem(itemId: string): void {
    this.cart.update(items => items.filter(item => item.id !== itemId));
    this.recalculateTotals();
    this.isDraftModified.set(true);
  }

  /**
   * Clears the entire cart
   */
  clearCart(): void {
    this.cart.set([]);
    this.recalculateTotals();
    this.isDraftModified.set(true);
  }

    /**
   * Recalculates all totals including item discounts
   */
  recalculateTotals(): void {
    const items = this.cart();
    
    // Calculate subtotal before discounts
    const subtotalBeforeDiscount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    
    // Calculate total discount from all items
    const totalDiscount = items.reduce((sum, item) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const maxAllowedDiscount = itemSubtotal * 0.1; // 10% max per item
      const validDiscount = Math.min(item.discountAmount || 0, maxAllowedDiscount);
      return sum + validDiscount;
    }, 0);
    
    // Calculate subtotal after discounts (sum of line totals)
    const subtotal = items.reduce((sum, item) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemDiscount = item.discountAmount || 0;
      const maxAllowedDiscount = itemSubtotal * 0.1;
      const validDiscount = Math.min(itemDiscount, maxAllowedDiscount);
      const itemLineTotal = itemSubtotal - validDiscount;
      return sum + itemLineTotal;
    }, 0);
    
    this.subtotal.set(subtotalBeforeDiscount);
    this.discountAmount.set(totalDiscount);
    
    // Calculate total amount (no tax for now)
    const totalAmount = subtotal;
    this.totalAmount.set(totalAmount);
    
    // Calculate change for cash payments
    const change = this.paymentAmount() - this.totalAmount();
    this.changeAmount.set(Math.max(0, change));
    
    // Calculate remaining balance for credit sales
    if (this.isCreditSale()) {
      const remainingBalance = Math.max(0, this.totalAmount() - this.paymentAmount());
      this.remainingBalance.set(remainingBalance);
    } else {
      this.remainingBalance.set(0);
    }
  }
  
  /**
   * Validates discount amount for a cart item (max 10% of selling price)
   */
  validateDiscount(itemId: string, discountAmount: number): { isValid: boolean; maxAllowed: number; message?: string } {
    const item = this.cart().find(i => i.id === itemId);
    if (!item) {
      return { isValid: false, maxAllowed: 0, message: 'Item not found' };
    }
    
    const itemSubtotal = item.unitPrice * item.quantity;
    const maxAllowed = itemSubtotal * 0.1; // 10% max
    
    if (discountAmount < 0) {
      return { isValid: false, maxAllowed, message: 'Discount cannot be negative' };
    }
    
    if (discountAmount > maxAllowed) {
      return { 
        isValid: false, 
        maxAllowed, 
        message: `Discount cannot exceed ${maxAllowed.toFixed(2)} (10% of selling price)` 
      };
    }
    
    return { isValid: true, maxAllowed };
  }
  
  /**
   * Updates discount amount for a cart item
   */
  updateCartItemDiscount(itemId: string, discountAmount: number): void {
    const validation = this.validateDiscount(itemId, discountAmount);
    
    if (!validation.isValid) {
      this.snackBar.open(validation.message || 'Invalid discount amount', 'Close', { duration: 3000 });
      // Set to max allowed if exceeded
      discountAmount = Math.min(discountAmount, validation.maxAllowed);
    }
    
    this.cart.update(items =>
      items.map(i => {
        if (i.id === itemId) {
          const itemSubtotal = i.unitPrice * i.quantity;
          const validDiscount = Math.min(discountAmount, validation.maxAllowed);
          const itemLineTotal = itemSubtotal - validDiscount;
          return { 
            ...i, 
            discountAmount: validDiscount,
            lineTotal: Math.max(0, itemLineTotal) // Ensure line total is not negative
          };
        }
        return i;
      })
    );
    
    this.recalculateTotals();
    this.isDraftModified.set(true);
  }
  
  /**
   * Gets the maximum allowed discount for an item
   */
  getMaxDiscount(item: CartItem): number {
    const itemSubtotal = item.unitPrice * item.quantity;
    return itemSubtotal * 0.1; // 10% max
  }

  /**
   * TrackBy for cart items to prevent DOM re-creation (keeps input focus stable while typing).
   */
  trackCartItemById(index: number, item: CartItem): string {
    return item.id;
  }

  /**
   * Validates that all cart items belong to the current branch
   */
  private validateCartBranchContext(): { isValid: boolean; errorMessage?: string } {
    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) {
      return {
        isValid: false,
        errorMessage: 'No valid branch context'
      };
    }

    const cartItems = this.cart();
    for (const item of cartItems) {
      const inventoryData = this.inventoryCache.get(item.productId) || [];
      const branchInventory = inventoryData.filter(inv => inv.branchId === currentBranch.id);
      
      if (branchInventory.length === 0) {
        return {
          isValid: false,
          errorMessage: `Product ${item.productName} is not available in the current branch`
        };
      }
    }
    
    return { isValid: true };
  }

  /**
   * Validates stock availability for all cart items
   */
  private validateStockAvailability(): { isValid: boolean; errorMessage?: string } {
    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) {
      return {
        isValid: false,
        errorMessage: 'No valid branch context'
      };
    }

    const cartItems = this.cart();
    
    for (const item of cartItems) {
      const inventoryData = this.inventoryCache.get(item.productId) || [];
      // Only consider inventory from the current branch
      const branchInventory = inventoryData.filter(inv => inv.branchId === currentBranch.id);
      const totalAvailable = branchInventory.reduce((sum, inv) => sum + inv.quantity, 0);
      
      if (totalAvailable < item.quantity) {
        return {
          isValid: false,
          errorMessage: `Insufficient stock for ${item.productName}. Available: ${totalAvailable}, Requested: ${item.quantity}`
        };
      }
    }
    
    return { isValid: true };
  }

  /**
   * Validates credit payment details
   */
  private validateCreditPayment(): { isValid: boolean; errorMessage?: string } {
    if (!this.isCreditSale()) {
      return { isValid: true };
    }

    // Validate customer information for credit
    if (!this.selectedCustomer()) {
      return {
        isValid: false,
        errorMessage: 'Please select or create a customer for credit sales'
      };
    }

    // Validate expected payment date
    if (!this.expectedPaymentDate()) {
      return {
        isValid: false,
        errorMessage: 'Expected payment date is required for credit payments'
      };
    }

    // Check if expected payment date is in the future
    const expectedDate = new Date(this.expectedPaymentDate());
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    if (expectedDate < today) {
      return {
        isValid: false,
        errorMessage: 'Expected payment date must be in the future'
      };
    }

    // Validate payment amount (must be between 0 and total amount)
    if (this.paymentAmount() < 0) {
      return {
        isValid: false,
        errorMessage: 'Payment amount cannot be negative'
      };
    }

    if (this.paymentAmount() > this.totalAmount()) {
      return {
        isValid: false,
        errorMessage: 'Payment amount cannot exceed total amount'
      };
    }

    // For partial payments, ensure remaining balance is tracked
    const remainingBalance = this.remainingBalance();
    if (remainingBalance < 0) {
      return {
        isValid: false,
        errorMessage: 'Invalid payment amount - would result in negative balance'
      };
    }

    return { isValid: true };
  }

  /**
   * Checks if the current sale is a credit sale
   */
  isCreditSaleActive(): boolean {
    return this.isCreditSale();
  }

  /**
   * Gets credit sale status information
   */
  getCreditSaleStatus(): { isCreditSale: boolean; customerName?: string; expectedPaymentDate?: string; remainingBalance: number } {
    return {
      isCreditSale: this.isCreditSale(),
      customerName: this.selectedCustomer() ? `${this.selectedCustomer()!.firstName} ${this.selectedCustomer()!.lastName}` : undefined,
      expectedPaymentDate: this.expectedPaymentDate() || undefined,
      remainingBalance: this.remainingBalance()
    };
  }

  /**
   * Validates if credit sale requirements are met
   */
  validateCreditSaleRequirements(): { isValid: boolean; message?: string } {
    if (!this.isCreditSale()) {
      return { isValid: true };
    }

    const creditValidation = this.validateCreditPayment();
    if (!creditValidation.isValid) {
      return { 
        isValid: false, 
        message: creditValidation.errorMessage 
      };
    }

    return { isValid: true };
  }

  /**
   * Processes the sale transaction
   */
  async processSale(): Promise<void> {
    if (this.cart().length === 0) {
      this.errorService.show('Cart is empty');
      return;
    }

    // Validate payment amount based on sale type
    if (!this.isCreditSale()) {
      // Regular sales require full payment
      if (this.paymentAmount() < this.totalAmount()) {
        this.errorService.show('Payment amount is insufficient');
        return;
      }
    } else {
      // Credit sales allow partial payment (including zero)
      if (this.paymentAmount() < 0) {
        this.errorService.show('Payment amount cannot be negative');
        return;
      }
      if (this.paymentAmount() > this.totalAmount()) {
        this.errorService.show('Payment amount cannot exceed total amount');
        return;
      }
    }

    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) {
      return; // getCurrentBranch already handles the error and navigation
    }

    // Validate branch context for all cart items
    const branchValidation = this.validateCartBranchContext();
    if (!branchValidation.isValid) {
      this.errorService.show(branchValidation.errorMessage!);
      return;
    }

    // Validate stock availability before processing
    const stockValidation = this.validateStockAvailability();
    if (!stockValidation.isValid) {
      this.errorService.show(stockValidation.errorMessage!);
      return;
    }

    // Validate credit payment details if credit payment is selected
    const creditValidation = this.validateCreditPayment();
    if (!creditValidation.isValid) {
      this.errorService.show(creditValidation.errorMessage!);
      return;
    }

    this.isProcessing.set(true);

    try {
      const lineItems: CreateSaleLineItemRequest[] = this.cart().map(item => {
        // Validate discount before sending to backend
        const itemSubtotal = item.unitPrice * item.quantity;
        const maxAllowedDiscount = itemSubtotal * 0.1; // 10% max
        const validDiscount = Math.min(item.discountAmount || 0, maxAllowedDiscount);
        
        return {
          productId: item.productId,
          inventoryId: (item.inventoryItems[0] as any)?.inventoryId || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: validDiscount > 0 ? validDiscount : undefined
        };
      });

      // For credit sales with no upfront payment, send empty payments array
      // For credit sales with partial payment, include the payment
      // For regular sales, always include payment
      const payments: CreateSalePaymentRequest[] = [];
      
      if (this.paymentAmount() > 0) {
        payments.push({
          paymentMethod: this.selectedPaymentMethod(),
          amount: this.paymentAmount()
        });
      } else if (!this.isCreditSale()) {
        // Non-credit sales must have payment
        throw new Error('Payment amount is required for non-credit sales');
      }

      // Calculate total discount amount (sum of all item discounts)
      const totalDiscountAmount = lineItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
      
      const request: CreateSaleRequest = {
        branchId: currentBranch.id,
        lineItems,
        payments,
        customerId: this.selectedCustomer()?.id,
        customerName: this.customerName() || undefined,
        customerPhone: this.customerPhone() || undefined,
        notes: this.notes() || undefined,
        discountAmount: totalDiscountAmount > 0 ? totalDiscountAmount : undefined,
        isCreditSale: this.isCreditSale()
      };

      const sale = await this.salesService.createSale(request).toPromise();

        if (sale) {
          // If this is a credit sale, create a credit account
          if (this.isCreditSale()) {
          try {
            // Use the selected customer
            const customer = this.selectedCustomer();
            if (!customer) {
              throw new Error('No customer selected for credit sale');
            }
            
            const customerId = customer.id;

            // Now create the credit account with partial payment information
            const creditRequest: CreateCreditAccountRequest = {
              saleId: sale.id,
              customerId: customerId,
              totalAmount: this.totalAmount(),
              expectedPaymentDate: this.expectedPaymentDate(),
              notes: this.creditNotes() || undefined,
              paidAmount: this.paymentAmount(), // Amount paid upfront
              remainingAmount: this.remainingBalance() // Remaining balance
            };

            await this.creditService.createCreditAccount(creditRequest).toPromise();
            
            // Show appropriate success message based on payment type
            if (this.paymentAmount() === 0) {
              // No upfront payment
              this.snackBar.open(
                `Credit sale created! Total credit amount: ${this.formatCurrency(this.totalAmount())}. No upfront payment received.`,
                'Close', 
                { duration: 4000 }
              );
            } else if (this.remainingBalance() > 0) {
              // Partial upfront payment
              this.snackBar.open(
                `Credit sale completed! Partial payment of ${this.formatCurrency(this.paymentAmount())} received. Remaining balance: ${this.formatCurrency(this.remainingBalance())}`,
                'Close', 
                { duration: 4000 }
              );
            } else {
              // Full upfront payment
              this.snackBar.open(
                `Credit sale completed! Full payment of ${this.formatCurrency(this.paymentAmount())} received. Account fully paid.`,
                'Close', 
                { duration: 4000 }
              );
            }
          } catch (creditError: any) {
            console.error('Failed to create credit account:', creditError);
            // Sale was successful but credit account creation failed
            this.snackBar.open('Sale completed but failed to create credit account. Please create manually.', 'Close', { duration: 5000 });
          }
        } else {
          this.snackBar.open('Sale completed successfully!', 'Close', { duration: 3000 });
        }

        this.clearCart();
        this.resetForm();
        
        // Clear current draft after successful sale
        if (this.currentDraftId()) {
          this.deleteDraft(this.currentDraftId()!);
        }
        
        // Invalidate cache to ensure fresh data for next transaction
        this.invalidateCache();

        // Navigate to sale details or print receipt
        this.router.navigate(['/sales', sale.id]);
      }
    } catch (error: any) {
      // Check if it's a stock-related error
      if (error?.error?.detail && 
          (error.error.detail.includes('Insufficient stock') || 
           error.error.detail.includes('Available:') || 
           error.error.detail.includes('Requested:'))) {
        this.handleStockError(error);
      } else {
        this.handleApiError(error, 'Failed to process sale');
      }
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Resets the form after successful sale
   */
  private resetForm(): void {
    this.customerName.set('');
    this.customerPhone.set('');
    this.notes.set('');
    this.selectedPaymentMethod.set(PaymentMethod.CASH);
    this.paymentAmount.set(0);
    this.showCustomerForm.set(false);
    
    // Reset credit form
    this.isCreditSale.set(false);
    this.showCreditForm.set(false);
    this.clearCreditForm();
  }

  /**
   * Generates a unique ID for cart items
   */
  private generateCartItemId(): string {
    return 'cart-item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Handles keyboard events for barcode scanning
   */
  onBarcodeKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.scanBarcode();
    }
  }

  /**
   * Handles product search input changes with debouncing
   */
  onProductSearchChange(): void {
    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Set new timeout for debounced search
    this.searchTimeout = setTimeout(() => {
      this.searchProducts();
    }, 300);
  }

  /**
   * Handles keyboard events for product search
   */
  onProductSearchKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      
      // If a search result is selected, add it to cart
      const selectedIndex = this.selectedSearchIndex();
      if (selectedIndex >= 0 && selectedIndex < this.searchResults().length) {
        this.selectProductFromSearch(this.searchResults()[selectedIndex]);
      } else {
        this.searchProducts();
      }
    } else if (event.key === 'Escape') {
      this.clearSearchResults();
    } else if (event.key === 'ArrowDown' && this.searchResults().length > 0) {
      event.preventDefault();
      const currentIndex = this.selectedSearchIndex();
      const nextIndex = currentIndex < this.searchResults().length - 1 ? currentIndex + 1 : 0;
      this.selectedSearchIndex.set(nextIndex);
    } else if (event.key === 'ArrowUp' && this.searchResults().length > 0) {
      event.preventDefault();
      const currentIndex = this.selectedSearchIndex();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : this.searchResults().length - 1;
      this.selectedSearchIndex.set(prevIndex);
    }
  }

  /**
   * Toggles customer form visibility
   */
  toggleCustomerForm(): void {
    this.showCustomerForm.update(show => !show);
  }

  /**
   * Handles customer search input changes
   */
  onCustomerSearchChange(): void {
    const searchTerm = this.customerSearchInput().trim();
    
    if (searchTerm.length < 1) {
      this.clearCustomerSearch();
      return;
    }

    // Show results immediately for better UX
    this.showCustomerSearchResults.set(true);
    this.hasSearched.set(true);

    // Clear previous timeout
    if (this.customerSearchTimeout) {
      clearTimeout(this.customerSearchTimeout);
    }

    // Debounce search - reduced delay for better responsiveness
    this.customerSearchTimeout = setTimeout(() => {
      this.performQuickSearch(searchTerm);
    }, 200);
  }

  /**
   * Handles search input focus
   */
  onCustomerSearchFocus(): void {
    if (this.customerSearchInput().trim()) {
      this.showCustomerSearchResults.set(true);
    }
  }

  /**
   * Handles search input blur with delay to allow clicking results
   */
  onCustomerSearchBlur(): void {
    setTimeout(() => {
      if (!this.selectedCustomer()) {
        this.showCustomerSearchResults.set(false);
      }
    }, 200);
  }

  /**
   * Handles keyboard navigation in search results
   */
  onCustomerSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.clearCustomerSearch();
    } else if (event.key === 'Enter' && this.customerSearchResults().length === 1) {
      this.selectCustomer(this.customerSearchResults()[0]);
    }
  }

  /**
   * Performs quick search for customers
   */
  private async performQuickSearch(searchTerm: string): Promise<void> {
    if (!searchTerm.trim()) return;

    this.isCustomerSearching.set(true);

    try {
      // Send search term in a single field instead of duplicating across all fields
      // This allows the backend to search across all fields with OR logic
      const searchRequest = {
        firstName: searchTerm,
        lastName: undefined,
        phone: undefined,
        customerNumber: undefined,
        page: 0,
        size: 20, // Increased for better results
        sortBy: 'firstName',
        sortDirection: 'asc' as const
      };

      const response = await this.salesService.searchCustomers(searchRequest).toPromise();
      if (response) {
        let customers = response.customers;
        
        // Apply client-side filtering for better search results
        customers = this.filterCustomersBySearchTerm(customers, searchTerm);
        
        // Sort results
        customers = this.sortCustomers(customers, this.customerSortOrder());
        
        this.customerSearchResults.set(customers);
      }
    } catch (error: any) {
      console.error('Error searching customers:', error);
      this.errorService.show('Failed to search customers');
      this.customerSearchResults.set([]);
    } finally {
      this.isCustomerSearching.set(false);
    }
  }

  /**
   * Performs advanced search for customers
   */
  async performAdvancedSearch(): Promise<void> {
    this.isCustomerSearching.set(true);
    this.showCustomerSearchResults.set(true);
    this.hasSearched.set(true);

    try {
      // Only send non-empty fields to avoid AND conditions
      const searchRequest = {
        firstName: this.advancedSearch.firstName.trim() || undefined,
        lastName: this.advancedSearch.lastName.trim() || undefined,
        phone: this.advancedSearch.phone.trim() || undefined,
        customerNumber: this.advancedSearch.customerNumber.trim() || undefined,
        isActive: this.advancedSearch.isActive ? this.advancedSearch.isActive === 'true' : undefined,
        page: 0,
        size: 50,
        sortBy: 'firstName',
        sortDirection: 'asc' as const
      };

      const response = await this.salesService.searchCustomers(searchRequest).toPromise();
      if (response) {
        let customers = response.customers;
        
        // Sort results
        customers = this.sortCustomers(customers, this.customerSortOrder());
        
        this.customerSearchResults.set(customers);
      }
    } catch (error: any) {
      console.error('Error performing advanced search:', error);
      this.errorService.show('Failed to perform advanced search');
      this.customerSearchResults.set([]);
    } finally {
      this.isCustomerSearching.set(false);
    }
  }

  /**
   * Filters customers by search term for better matching
   */
  private filterCustomersBySearchTerm(customers: CustomerDto[], searchTerm: string): CustomerDto[] {
    const term = searchTerm.toLowerCase().trim();
    
    return customers.filter(customer => {
      const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
      const phone = customer.phone?.toLowerCase() || '';
      const customerNumber = customer.customerNumber?.toLowerCase() || '';
      
      return fullName.includes(term) || 
             phone.includes(term) || 
             customerNumber.includes(term) ||
             customer.firstName.toLowerCase().includes(term) ||
             customer.lastName.toLowerCase().includes(term);
    });
  }

  /**
   * Sorts customers by name
   */
  private sortCustomers(customers: CustomerDto[], order: 'asc' | 'desc'): CustomerDto[] {
    return customers.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      
      if (order === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
  }

  /**
   * Sorts customer search results
   */
  sortCustomerResults(): void {
    const newOrder = this.customerSortOrder() === 'asc' ? 'desc' : 'asc';
    this.customerSortOrder.set(newOrder);
    
    const sortedResults = this.sortCustomers(this.customerSearchResults(), newOrder);
    this.customerSearchResults.set(sortedResults);
  }

  /**
   * Clears advanced search
   */
  clearAdvancedSearch(): void {
    this.advancedSearch = {
      firstName: '',
      lastName: '',
      phone: '',
      customerNumber: '',
      isActive: ''
    };
    this.customerSearchResults.set([]);
    this.showCustomerSearchResults.set(false);
    this.hasSearched.set(false);
  }

  /**
   * Clears customer search
   */
  clearCustomerSearch(): void {
    this.customerSearchInput.set('');
    this.customerSearchResults.set([]);
    this.showCustomerSearchResults.set(false);
    this.isCustomerSearching.set(false);
    
    if (this.customerSearchTimeout) {
      clearTimeout(this.customerSearchTimeout);
    }
  }

  /**
   * Selects a customer from search results
   */
  selectCustomer(customer: CustomerDto): void {
    this.selectedCustomer.set(customer);
    this.customerName.set(`${customer.firstName} ${customer.lastName}`);
    this.customerPhone.set(customer.phone || '');
    this.clearCustomerSearch();
    this.snackBar.open(`Selected customer: ${customer.firstName} ${customer.lastName}`, 'Close', { duration: 2000 });
  }

  /**
   * Clears selected customer
   */
  clearSelectedCustomer(): void {
    this.selectedCustomer.set(null);
    this.customerName.set('');
    this.customerPhone.set('');
  }

  /**
   * Creates a new customer
   */
  async createNewCustomer(): Promise<void> {
    if (!this.newCustomerFirstName().trim() || !this.newCustomerLastName().trim()) {
      this.errorService.show('First name and last name are required');
      return;
    }

    this.isCreatingCustomer.set(true);

    try {
      const createRequest = {
        firstName: this.newCustomerFirstName().trim(),
        lastName: this.newCustomerLastName().trim(),
        phone: this.newCustomerPhone().trim() || undefined
      };

      const customer = await this.salesService.createCustomer(createRequest).toPromise();
      if (customer) {
        this.selectedCustomer.set(customer);
        this.customerName.set(`${customer.firstName} ${customer.lastName}`);
        this.customerPhone.set(customer.phone || '');
        this.cancelCreateCustomer();
        this.snackBar.open(`Created customer: ${customer.firstName} ${customer.lastName}`, 'Close', { duration: 3000 });
      }
    } catch (error: any) {
      console.error('Error creating customer:', error);
      this.errorService.show('Failed to create customer');
    } finally {
      this.isCreatingCustomer.set(false);
    }
  }

  /**
   * Cancels customer creation
   */
  cancelCreateCustomer(): void {
    this.showCreateCustomerForm.set(false);
    this.newCustomerFirstName.set('');
    this.newCustomerLastName.set('');
    this.newCustomerPhone.set('');
  }

  /**
   * Track function for customer results list
   */
  trackCustomerByFn(index: number, customer: CustomerDto): string {
    return customer.id;
  }

  /**
   * Formats date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'today';
    } else if (diffDays === 2) {
      return 'yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Handles payment method selection changes
   */
  onPaymentMethodChange(): void {
    // Credit form visibility is now controlled by the credit checkbox
    // This method can be used for other payment method specific logic
  }

  /**
   * Handles credit sale checkbox toggle
   */
  onCreditSaleToggle(): void {
    if (this.isCreditSale()) {
      this.showCreditForm.set(true);
      // Set default expected payment date to 30 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      this.expectedPaymentDate.set(defaultDate.toISOString().split('T')[0]);
      // Set default credit limit to the total amount
      this.creditLimit.set(this.totalAmount());
      // Set payment amount to 0 by default (no upfront payment)
      // User can change this to make a partial payment
      this.paymentAmount.set(0);
      // Recalculate totals to update remaining balance
      this.recalculateTotals();
    } else {
      this.showCreditForm.set(false);
      this.clearCreditForm();
      // Clear selected customer when unchecking credit sale
      this.clearSelectedCustomer();
      // Reset payment amount to total for regular sales
      this.paymentAmount.set(this.totalAmount());
      // Recalculate totals
      this.recalculateTotals();
    }
  }

  /**
   * Clears credit form data
   */
  clearCreditForm(): void {
    this.creditLimit.set(0);
    this.expectedPaymentDate.set('');
    this.creditNotes.set('');
  }

  /**
   * Toggles credit form visibility
   */
  toggleCreditForm(): void {
    this.showCreditForm.update(show => !show);
  }

  /**
   * Sets payment amount to total amount
   */
  setExactPayment(): void {
    this.paymentAmount.set(this.totalAmount());
  }

  /**
   * Checks if a search result item is selected for keyboard navigation
   */
  isSearchResultSelected(index: number): boolean {
    return this.selectedSearchIndex() === index;
  }

  /**
   * Public method to save current draft manually
   */
  saveCurrentDraft(): void {
    if (this.cart().length === 0) {
      this.errorService.show('Cannot save empty cart');
      return;
    }
    this.saveDraft();
  }

  /**
   * Public method to get drafts for current branch
   */
  getCurrentBranchDrafts(): SaleDraft[] {
    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) return [];
    
    return this.savedDrafts()
      .filter(d => d.branchId === currentBranch.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Public method to check if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.isDraftModified() && this.cart().length > 0;
  }

  /**
   * Handles clicks outside search results to close them
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const searchSection = target.closest('.search-section');

    if (!searchSection && this.showSearchResults()) {
      this.clearSearchResults();
    }
  }

  /**
   * Loads M-Pesa configuration
   */
  private loadMpesaConfiguration(): void {
    this.mpesaLoading.set(true);
    this.mpesaService.getMpesaConfiguration().subscribe({
      next: (config) => {
        this.mpesaEnabled.set(config.enabled);
        this.mpesaLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading M-Pesa configuration:', err);
        this.mpesaEnabled.set(false);
        this.mpesaLoading.set(false);
      }
    });
  }

  /**
   * Opens M-Pesa payment dialog
   */
  openMpesaPayment(): void {
    if (this.cart().length === 0) {
      this.errorService.show('Cart is empty. Please add items before paying with M-Pesa.');
      return;
    }

    if (this.totalAmount() <= 0) {
      this.errorService.show('Invalid sale amount');
      return;
    }

    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) {
      return;
    }

    const dialogRef = this.dialog.open(MpesaPaymentDialogComponent, {
      width: '500px',
      disableClose: false,
      data: {
        saleId: 'temp-' + Date.now(), // Temporary ID, will be updated after sale creation
        saleNumber: 'Pending',
        amount: this.totalAmount(),
        branchId: currentBranch.id
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.success) {
        // Payment was successful
        this.snackBar.open('M-Pesa payment confirmed! Transaction ID: ' + result.transactionId, 'Close', {
          duration: 5000,
          panelClass: 'success-snackbar',
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });

        // Now complete the sale with M-PESA payment method
        this.completeSaleWithMpesa(result.transactionId);
      }
    });
  }

  /**
   * Completes the sale using M-Pesa payment
   */
  private async completeSaleWithMpesa(transactionId: string): Promise<void> {
    if (this.cart().length === 0) {
      this.errorService.show('Cart is empty');
      return;
    }

    const currentBranch = this.getCurrentBranch();
    if (!currentBranch) {
      return;
    }

    this.isProcessing.set(true);

    try {
      const lineItems: CreateSaleLineItemRequest[] = this.cart().map(item => ({
        productId: item.productId,
        inventoryId: (item.inventoryItems[0] as any)?.inventoryId || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }));

      // Create payment with MPESA method for full amount
      const payments: CreateSalePaymentRequest[] = [
        {
          paymentMethod: PaymentMethod.MPESA,
          amount: this.totalAmount()
        }
      ];

      const request: CreateSaleRequest = {
        branchId: currentBranch.id,
        lineItems,
        payments,
        customerName: this.customerName() || undefined,
        customerPhone: this.customerPhone() || undefined,
        notes: this.notes() || undefined,
        isCreditSale: false
      };

      const sale = await this.salesService.createSale(request).toPromise();

      if (sale) {
        this.snackBar.open('Sale completed successfully with M-Pesa payment!', 'Close', {
          duration: 3000,
          panelClass: 'success-snackbar',
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });

        this.clearCart();
        this.resetForm();

        // Clear current draft after successful sale
        if (this.currentDraftId()) {
          this.deleteDraft(this.currentDraftId()!);
        }

        // Invalidate cache to ensure fresh data
        this.invalidateCache();

        // Navigate to sale details
        this.router.navigate(['/sales', sale.id]);
      }
    } catch (error: any) {
      console.error('Error completing sale with M-Pesa:', error);
      this.handleApiError(error, 'Failed to complete sale with M-Pesa payment');
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Cleanup method
   */
  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    if (this.autoSaveTimeout) {
      clearInterval(this.autoSaveTimeout);
    }
  }

  /**
   * Formats currency values
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  }


  /**
   * Selects a specific batch for a product in search results
   */
  selectBatch(searchResultIndex: number, batchIndex: number, event: Event): void {
    event.stopPropagation(); // Prevent triggering the main product selection
    
    const searchResults = this.searchResults();
    if (searchResultIndex >= 0 && searchResultIndex < searchResults.length) {
      const updatedResults = [...searchResults];
      updatedResults[searchResultIndex].selectedBatchIndex = batchIndex;
      this.searchResults.set(updatedResults);
    }
  }

  /**
   * Gets the selected batch for a search result
   */
  getSelectedBatch(searchResult: ProductSearchResult): CachedInventoryItem | null {
    if (searchResult.selectedBatchIndex !== undefined && 
        searchResult.selectedBatchIndex >= 0 && 
        searchResult.selectedBatchIndex < searchResult.inventoryItems.length) {
      return searchResult.inventoryItems[searchResult.selectedBatchIndex];
    }
    return searchResult.inventoryItems[0] || null; // Default to first batch
  }
}

// ==================== Interfaces ====================

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number; // Discount amount for this item (max 10% of selling price * quantity)
  lineTotal: number;
  requiresPrescription: boolean;
  inventoryItems: unknown[];
}

interface CachedInventoryItem {
  inventoryId: string;
  productId: string;
  branchId: string;
  quantity: number;
  location: string;
  expiryDate?: string;
  sellingPrice?: number;
  batchNumber?: string;
  manufacturingDate?: string;
}

interface SaleDraft {
  id: string;
  branchId: string;
  branchName: string;
  cartItems: CartItem[];
  customerName: string;
  customerPhone: string;
  notes: string;
  selectedPaymentMethod: PaymentMethod;
  paymentAmount: number;
  showCustomerForm: boolean;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  // Credit form fields
  isCreditSale?: boolean;
  creditLimit?: number;
  expectedPaymentDate?: string;
  creditNotes?: string;
  remainingBalance?: number;
  createdAt: string;
  updatedAt: string;
  isAutoSaved: boolean;
}
