import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  PrimaryButtonComponent,
  SecondaryButtonComponent,
  AccentButtonComponent,
  DangerButtonComponent,
  IconButtonComponent,
  TextButtonComponent
} from '../../shared/components';

import { TaxSettingsService, TenantTaxSettingsDto } from './services/tax-settings.service';
import { MpesaService, MpesaConfiguration, BranchMpesaTill } from '../../core/services/mpesa.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatDividerModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    PrimaryButtonComponent,
    SecondaryButtonComponent,
    AccentButtonComponent,
    DangerButtonComponent,
    IconButtonComponent,
    TextButtonComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-coral to-brand-coral/80 flex items-center justify-center">
            <mat-icon class="text-white">settings</mat-icon>
          </div>
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
            <p class="text-gray-600 mt-1">Configure your business system settings</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <mat-tab-group class="bg-white rounded-lg shadow">
        <!-- Tax Settings Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-2">local_atm</mat-icon>
            <span>Tax Settings</span>
          </ng-template>

          <div class="p-8 space-y-8">
            <!-- Section Header -->
            <div>
              <h2 class="text-xl font-semibold text-gray-900 mb-2">VAT Configuration</h2>
              <p class="text-gray-600">Configure how Value Added Tax (VAT) is calculated and applied in your business</p>
            </div>

            <!-- Charge VAT Toggle -->
            <div class="border border-gray-200 rounded-lg p-6 bg-white">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-gray-900">Charge VAT</h3>
                  <p class="text-gray-600 mt-1">Enable or disable VAT (Value Added Tax) charges on all sales</p>
                  <div class="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full" [ngClass]="taxSettings?.chargeVat ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'">
                    <span class="h-2 w-2 rounded-full" [ngClass]="taxSettings?.chargeVat ? 'bg-green-500' : 'bg-gray-500'"></span>
                    <span class="text-sm font-medium">{{ taxSettings?.chargeVat ? 'Enabled' : 'Disabled' }}</span>
                  </div>
                </div>
                <mat-slide-toggle
                  [(ngModel)]="chargeVat"
                  color="primary"
                  (change)="onChargeVatChange()">
                </mat-slide-toggle>
              </div>
            </div>

            <!-- Default VAT Rate -->
            <div class="border border-gray-200 rounded-lg p-6 bg-white">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="flex flex-col justify-center">
                  <h3 class="text-lg font-semibold text-gray-900">Default VAT Rate</h3>
                  <p class="text-gray-600 mt-1">The standard VAT rate applied to products unless overridden</p>
                  <p class="text-gray-500 text-sm mt-2">Current rate: <span class="font-semibold text-brand-coral">{{ defaultVatRate }}%</span></p>
                </div>
                <div>
                  <mat-form-field class="w-full">
                    <mat-label>VAT Rate (%)</mat-label>
                    <input
                      matInput
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      [(ngModel)]="defaultVatRate"
                      (change)="onDefaultVatRateChange()"
                      [disabled]="!chargeVat">
                    <mat-hint>Enter percentage (0-100)</mat-hint>
                  </mat-form-field>
                </div>
              </div>
            </div>

            <!-- Pricing Mode -->
            <div class="border border-gray-200 rounded-lg p-6 bg-white">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="flex flex-col justify-center">
                  <h3 class="text-lg font-semibold text-gray-900">Price Handling Mode</h3>
                  <p class="text-gray-600 mt-1">How product prices are treated in relation to VAT</p>
                  <div class="mt-4 space-y-2">
                    <div class="p-3 rounded-lg" [ngClass]="pricingMode === 'EXCLUSIVE' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'">
                      <p class="font-medium" [ngClass]="pricingMode === 'EXCLUSIVE' ? 'text-blue-900' : 'text-gray-700'">Exclusive (VAT Added)</p>
                      <p class="text-sm" [ngClass]="pricingMode === 'EXCLUSIVE' ? 'text-blue-700' : 'text-gray-600'">Price: KES100 → Total: KES116 (with 16% VAT)</p>
                    </div>
                    <div class="p-3 rounded-lg" [ngClass]="pricingMode === 'INCLUSIVE' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'">
                      <p class="font-medium" [ngClass]="pricingMode === 'INCLUSIVE' ? 'text-blue-900' : 'text-gray-700'">Inclusive (VAT Included)</p>
                      <p class="text-sm" [ngClass]="pricingMode === 'INCLUSIVE' ? 'text-blue-700' : 'text-gray-600'">Price: KES116 → Base: KES100 (16% VAT included)</p>
                    </div>
                  </div>
                </div>
                <div class="flex flex-col justify-center">
                  <mat-form-field class="w-full">
                    <mat-label>Pricing Mode</mat-label>
                    <mat-select [(ngModel)]="pricingMode" (change)="onPricingModeChange()" [disabled]="!chargeVat">
                      <mat-option value="EXCLUSIVE">
                        Exclusive (Price + VAT)
                      </mat-option>
                      <mat-option value="INCLUSIVE">
                        Inclusive (Price includes VAT)
                      </mat-option>
                    </mat-select>
                    <mat-hint>Choose how your product prices are structured</mat-hint>
                  </mat-form-field>
                </div>
              </div>
            </div>

            <!-- Tax Classifications Info -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div class="flex gap-4">
                <mat-icon class="text-blue-600 text-2xl">info</mat-icon>
                <div>
                  <h4 class="font-semibold text-blue-900">Tax Classifications</h4>
                  <p class="text-blue-800 text-sm mt-2">Your business supports the following tax categories:</p>
                  <ul class="mt-3 space-y-2 text-sm text-blue-800">
                    <li>
                      <strong>Standard Rate:</strong> Most products (default {{ defaultVatRate }}%)
                    </li>
                    <li>
                      <strong>Reduced Rate:</strong> Selected items that qualify for a lower tax rate (usually 8%)
                    </li>
                    <li>
                      <strong>Zero Rate:</strong> Essential products and supplies (0% but VAT recoverable)
                    </li>
                    <li>
                      <strong>Exempt:</strong> Certain services where VAT is not charged (0% and VAT not recoverable)
                    </li>
                  </ul>
                  <p class="text-blue-800 text-sm mt-3">You can set product-specific tax rates in the product catalog.</p>
                </div>
              </div>
            </div>

            <!-- Save Button -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <app-secondary-button
                label="Cancel"
                (click)="onCancel()">
              </app-secondary-button>
              <app-primary-button
                label="Save Tax Settings"
                icon="save"
                (click)="saveTaxSettings()"
                [disabled]="!isModified">
              </app-primary-button>
            </div>
          </div>
        </mat-tab>

        <!-- M-Pesa Settings Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-2">payment</mat-icon>
            <span>M-Pesa Settings</span>
          </ng-template>

          <div class="p-8 space-y-8">
            <!-- Loading State -->
            <div *ngIf="mpesaLoading" class="flex justify-center py-12">
              <mat-spinner diameter="50"></mat-spinner>
            </div>

            <!-- Content -->
            <div *ngIf="!mpesaLoading && mpesaConfig">
              <!-- Section Header -->
              <div>
                <h2 class="text-xl font-semibold text-gray-900 mb-2">M-Pesa Payment Configuration</h2>
                <p class="text-gray-600">Configure M-Pesa STK Push payments for your business</p>
              </div>

              <!-- Tier Availability Info -->
              <div *ngIf="!mpesaConfig.tierEnabled" class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div class="flex gap-4">
                  <mat-icon class="text-yellow-600 text-2xl">info</mat-icon>
                  <div>
                    <h4 class="font-semibold text-yellow-900">Feature Not Available</h4>
                    <p class="text-yellow-800 text-sm mt-2">M-Pesa payments are not available in your current pricing tier. Please upgrade to enable this feature.</p>
                  </div>
                </div>
              </div>

              <!-- Enable M-Pesa Toggle -->
              <div class="border border-gray-200 rounded-lg p-6 bg-white" [class.opacity-50]="!mpesaConfig.tierEnabled" [class.pointer-events-none]="!mpesaConfig.tierEnabled">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-900">Enable M-Pesa Payments</h3>
                    <p class="text-gray-600 mt-1">Allow customers to pay using M-Pesa STK Push</p>
                    <div class="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full" [ngClass]="mpesaEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'">
                      <span class="h-2 w-2 rounded-full" [ngClass]="mpesaEnabled ? 'bg-green-500' : 'bg-gray-500'"></span>
                      <span class="text-sm font-medium">{{ mpesaEnabled ? 'Enabled' : 'Disabled' }}</span>
                    </div>
                  </div>
                  <mat-slide-toggle
                    [(ngModel)]="mpesaEnabled"
                    color="primary"
                    (change)="onMpesaEnabledChange()"
                    [disabled]="!mpesaConfig.tierEnabled">
                  </mat-slide-toggle>
                </div>
              </div>

              <!-- Default Till Number -->
              <div class="border border-gray-200 rounded-lg p-6 bg-white" [class.opacity-50]="!mpesaEnabled" [class.pointer-events-none]="!mpesaEnabled">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="flex flex-col justify-center">
                    <h3 class="text-lg font-semibold text-gray-900">Default Till Number</h3>
                    <p class="text-gray-600 mt-1">The till number used by default for M-Pesa payments across all branches</p>
                  </div>
                  <div>
                    <mat-form-field class="w-full">
                      <mat-label>Till Number</mat-label>
                      <input
                        matInput
                        [(ngModel)]="defaultTillNumber"
                        (change)="onDefaultTillChange()"
                        placeholder="e.g., 174379"
                        [disabled]="!mpesaEnabled">
                      <mat-hint>Enter your M-Pesa till number</mat-hint>
                    </mat-form-field>
                  </div>
                </div>
              </div>

              <!-- Branch-Specific Till Numbers -->
              <div class="border border-gray-200 rounded-lg p-6 bg-white" [class.opacity-50]="!mpesaEnabled" [class.pointer-events-none]="!mpesaEnabled">
                <div class="mb-6">
                  <h3 class="text-lg font-semibold text-gray-900">Branch-Specific Till Numbers</h3>
                  <p class="text-gray-600 mt-1">Override the default till number for specific branches</p>
                </div>

                <div *ngIf="branchTills && branchTills.length > 0; else noBranches" class="space-y-4">
                  <div *ngFor="let branch of branchTills" class="border border-gray-100 rounded-lg p-4 bg-gray-50">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="flex flex-col justify-center">
                        <p class="text-sm font-medium text-gray-900">{{ branch.branchName }}</p>
                        <p class="text-xs text-gray-600 mt-1">Current till: <span class="font-semibold">{{ branch.tillNumber || 'Not set' }}</span></p>
                      </div>
                      <div>
                        <mat-form-field class="w-full">
                          <mat-label>Till Number</mat-label>
                          <input
                            matInput
                            [(ngModel)]="branch.tillNumber"
                            (change)="onBranchTillChange(branch)"
                            placeholder="Leave empty to use default"
                            [disabled]="!mpesaEnabled">
                        </mat-form-field>
                      </div>
                    </div>
                  </div>
                </div>

                <ng-template #noBranches>
                  <div class="bg-gray-100 rounded-lg p-6 text-center">
                    <mat-icon class="text-4xl text-gray-400 mb-2">location_on</mat-icon>
                    <p class="text-gray-600">No branches available</p>
                  </div>
                </ng-template>
              </div>

              <!-- Information Box -->
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div class="flex gap-4">
                  <mat-icon class="text-blue-600 text-2xl">info</mat-icon>
                  <div>
                    <h4 class="font-semibold text-blue-900">How M-Pesa STK Push Works</h4>
                    <ul class="mt-3 space-y-2 text-sm text-blue-800">
                      <li>✓ Customer initiates payment from Saam POS interface</li>
                      <li>✓ M-Pesa prompt appears automatically on customer's phone</li>
                      <li>✓ Customer enters their M-Pesa PIN to confirm</li>
                      <li>✓ Payment is confirmed in real-time in the system</li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- Save Button -->
              <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <app-secondary-button
                  label="Cancel"
                  (click)="onCancelMpesa()"
                  [disabled]="mpesaSaving">
                </app-secondary-button>
                <app-primary-button
                  label="Save M-Pesa Settings"
                  icon="save"
                  (click)="saveMpesaSettings()"
                  [disabled]="!mpesaIsModified || mpesaSaving">
                </app-primary-button>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- General Settings Tab (Placeholder) -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-2">tune</mat-icon>
            <span>General</span>
          </ng-template>

          <div class="p-8">
            <div class="bg-gray-50 rounded-lg p-8 text-center">
              <mat-icon class="text-6xl text-gray-400 mb-4">settings</mat-icon>
              <h3 class="text-lg font-semibold text-gray-900">General Settings</h3>
              <p class="text-gray-600 mt-2">Additional settings coming soon...</p>
            </div>
          </div>
        </mat-tab>

        <!-- User Preferences Tab (Placeholder) -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-2">person</mat-icon>
            <span>Preferences</span>
          </ng-template>

          <div class="p-8">
            <div class="bg-gray-50 rounded-lg p-8 text-center">
              <mat-icon class="text-6xl text-gray-400 mb-4">person</mat-icon>
              <h3 class="text-lg font-semibold text-gray-900">User Preferences</h3>
              <p class="text-gray-600 mt-2">User preferences coming soon...</p>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  // Tax Settings
  taxSettings: TenantTaxSettingsDto | null = null;
  chargeVat = true;
  defaultVatRate: number = 16;
  pricingMode: 'INCLUSIVE' | 'EXCLUSIVE' = 'EXCLUSIVE';
  isModified = false;

  // M-Pesa Settings
  mpesaConfig: MpesaConfiguration | null = null;
  mpesaEnabled = false;
  defaultTillNumber = '';
  branchTills: BranchMpesaTill[] = [];
  mpesaLoading = false;
  mpesaSaving = false;
  mpesaIsModified = false;
  originalMpesaState: any = null;

  constructor(
    private taxSettingsService: TaxSettingsService,
    private mpesaService: MpesaService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadTaxSettings();
    this.loadMpesaSettings();
  }

  loadTaxSettings(): void {
    this.taxSettingsService.getTaxSettings().subscribe({
      next: (settings) => {
        this.taxSettings = settings;
        this.chargeVat = settings.chargeVat;
        this.defaultVatRate = settings.defaultVatRate;
        this.pricingMode = settings.pricingMode;
        this.isModified = false;
      },
      error: (err) => {
        console.error('Error loading tax settings:', err);
        this.snackBar.open('Failed to load tax settings', 'Close', { duration: 3000, panelClass: 'error-snackbar' });
      }
    });
  }

  onChargeVatChange(): void {
    this.isModified = true;
  }

  onDefaultVatRateChange(): void {
    this.isModified = true;
  }

  onPricingModeChange(): void {
    this.isModified = true;
  }

  saveTaxSettings(): void {
    const updatedSettings: Partial<TenantTaxSettingsDto> = {
      chargeVat: this.chargeVat,
      defaultVatRate: this.defaultVatRate,
      pricingMode: this.pricingMode
    };

    this.taxSettingsService.updateTaxSettings(updatedSettings).subscribe({
      next: (settings) => {
        this.taxSettings = settings;
        this.isModified = false;
        this.snackBar.open('Tax settings saved successfully!', 'Close', {
          duration: 3000,
          panelClass: 'success-snackbar',
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
      },
      error: (err) => {
        console.error('Error saving tax settings:', err);
        this.snackBar.open('Failed to save tax settings', 'Close', {
          duration: 3000,
          panelClass: 'error-snackbar',
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
      }
    });
  }

  onCancel(): void {
    this.loadTaxSettings();
  }

  // M-Pesa Settings Methods

  loadMpesaSettings(): void {
    this.mpesaLoading = true;
    this.mpesaService.getMpesaConfiguration().subscribe({
      next: (config) => {
        this.mpesaConfig = config;
        this.mpesaEnabled = config.enabled;
        this.defaultTillNumber = config.defaultTillNumber || '';
        this.branchTills = config.branchTillNumbers || [];
        this.saveOriginalMpesaState();
        this.mpesaLoading = false;
      },
      error: (err) => {
        console.error('Error loading M-Pesa settings:', err);
        this.snackBar.open('Failed to load M-Pesa settings', 'Close', {
          duration: 3000,
          panelClass: 'error-snackbar'
        });
        this.mpesaLoading = false;
      }
    });
  }

  saveOriginalMpesaState(): void {
    this.originalMpesaState = {
      enabled: this.mpesaEnabled,
      defaultTillNumber: this.defaultTillNumber,
      branchTills: JSON.parse(JSON.stringify(this.branchTills))
    };
  }

  onMpesaEnabledChange(): void {
    this.mpesaIsModified = true;
  }

  onDefaultTillChange(): void {
    this.mpesaIsModified = true;
  }

  onBranchTillChange(branch: BranchMpesaTill): void {
    this.mpesaIsModified = true;
  }

  saveMpesaSettings(): void {
    if (!this.mpesaConfig) return;

    this.mpesaSaving = true;

    const updateRequest = {
      enabled: this.mpesaEnabled,
      defaultTillNumber: this.defaultTillNumber || undefined,
      branchTillNumbers: this.branchTills
        .filter(b => b.tillNumber) // Only include branches with till numbers
        .map(b => ({
          branchId: b.branchId,
          tillNumber: b.tillNumber
        }))
    };

    this.mpesaService.updateMpesaConfiguration(updateRequest).subscribe({
      next: (config) => {
        this.mpesaConfig = config;
        this.mpesaEnabled = config.enabled;
        this.defaultTillNumber = config.defaultTillNumber || '';
        this.branchTills = config.branchTillNumbers || [];
        this.saveOriginalMpesaState();
        this.mpesaIsModified = false;
        this.mpesaSaving = false;
        this.snackBar.open('M-Pesa settings saved successfully!', 'Close', {
          duration: 3000,
          panelClass: 'success-snackbar',
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
      },
      error: (err) => {
        console.error('Error saving M-Pesa settings:', err);
        this.snackBar.open('Failed to save M-Pesa settings', 'Close', {
          duration: 3000,
          panelClass: 'error-snackbar',
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        this.mpesaSaving = false;
      }
    });
  }

  onCancelMpesa(): void {
    if (this.originalMpesaState) {
      this.mpesaEnabled = this.originalMpesaState.enabled;
      this.defaultTillNumber = this.originalMpesaState.defaultTillNumber;
      this.branchTills = JSON.parse(JSON.stringify(this.originalMpesaState.branchTills));
      this.mpesaIsModified = false;
    }
  }
}
