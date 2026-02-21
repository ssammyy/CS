import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, NavigationEnd, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DashboardService, OnboardingStatus, OnboardingStep } from '../../../core/services/dashboard.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-onboarding-bites',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <div *ngIf="shouldShowOnboarding()" class="mb-6">
      <div class="bg-gradient-to-r from-brand-sky/10 via-brand-mint/10 to-brand-coral/10 rounded-lg border border-brand-sky/20 p-5 shadow-sm">
        <div class="flex items-start gap-4">
          <!-- Icon -->
          <div class="flex-shrink-0 p-3 rounded-lg" [ngClass]="getStepColorClass()">
            <mat-icon class="!text-2xl !w-6 !h-6">{{ getCurrentStepIcon() }}</mat-icon>
          </div>
          
          <!-- Content -->
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h3 class="text-lg font-semibold text-gray-900">{{ getCurrentStepTitle() }}</h3>
              <span class="px-2 py-0.5 text-xs font-medium rounded-full" [ngClass]="getStepBadgeClass()">
                Step {{ getCurrentStepNumber() }} of 4
              </span>
            </div>
            <p class="text-sm text-gray-600 mb-4">{{ getCurrentStepDescription() }}</p>
            
            <!-- Action Button -->
            <a
              [routerLink]="getCurrentStepRoute()"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              [ngClass]="getStepButtonClass()">
              <mat-icon class="!text-base !w-4 !h-4">arrow_forward</mat-icon>
              {{ getCurrentStepAction() }}
            </a>
          </div>
          
          <!-- Dismiss button -->
          <button
            type="button"
            (click)="dismissCurrentStep()"
            class="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white/50 transition-colors"
            aria-label="Dismiss">
            <mat-icon class="!text-base !w-4 !h-4">close</mat-icon>
          </button>
        </div>
        
        <!-- Progress indicator -->
        <div class="mt-4 pt-4 border-t border-brand-sky/20">
          <div class="flex items-center gap-2">
            <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-300" [ngClass]="getProgressBarClass()" [style.width.%]="getProgressPercentage()"></div>
            </div>
            <span class="text-xs font-medium text-gray-600">{{ getProgressPercentage() }}%</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class OnboardingBitesComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  private routerSubscription?: Subscription;
  
  readonly onboardingStatus = signal<OnboardingStatus | null>(null);
  readonly dismissedSteps = signal<Set<OnboardingStep>>(new Set());

  ngOnInit(): void {
    this.loadOnboardingStatus();
    
    // Refresh onboarding status when navigating back to dashboard
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.router.url === '/dashboard' || this.router.url.startsWith('/dashboard')) {
          this.loadOnboardingStatus();
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  loadOnboardingStatus(): void {
    this.dashboardService.getOnboardingStatus().subscribe({
      next: (status) => {
        this.onboardingStatus.set(status);
      },
      error: (error) => {
        console.error('Error loading onboarding status:', error);
      }
    });
  }

  getCurrentStep(): OnboardingStep | null {
    return this.onboardingStatus()?.currentStep ?? null;
  }

  getCurrentStepInfo() {
    const status = this.onboardingStatus();
    if (!status) return null;
    return status.steps.find(s => s.step === status.currentStep);
  }

  getCurrentStepTitle(): string {
    return this.getCurrentStepInfo()?.title ?? 'Get Started';
  }

  getCurrentStepDescription(): string {
    return this.getCurrentStepInfo()?.description ?? '';
  }

  getCurrentStepRoute(): string {
    return this.getCurrentStepInfo()?.route ?? '/';
  }

  getCurrentStepIcon(): string {
    return this.getCurrentStepInfo()?.icon ?? 'info';
  }

  getCurrentStepNumber(): number {
    const step = this.getCurrentStep();
    if (!step) return 0;
    const order = ['SETUP_BRANCHES', 'ADD_USERS', 'ADD_PRODUCTS', 'MANAGE_INVENTORY'];
    return order.indexOf(step) + 1;
  }

  getCurrentStepAction(): string {
    const step = this.getCurrentStep();
    const actions: Record<OnboardingStep, string> = {
      [OnboardingStep.SETUP_BRANCHES]: 'Setup Branch',
      [OnboardingStep.ADD_USERS]: 'Add Users',
      [OnboardingStep.ADD_PRODUCTS]: 'Add Products',
      [OnboardingStep.MANAGE_INVENTORY]: 'Manage Inventory',
      [OnboardingStep.COMPLETED]: 'View Dashboard'
    };
    return actions[step as OnboardingStep] ?? 'Get Started';
  }

  getStepColorClass(): string {
    const step = this.getCurrentStep();
    const classes: Record<OnboardingStep, string> = {
      [OnboardingStep.SETUP_BRANCHES]: 'bg-brand-sky/20 text-brand-sky',
      [OnboardingStep.ADD_USERS]: 'bg-brand-mint/20 text-brand-mint',
      [OnboardingStep.ADD_PRODUCTS]: 'bg-brand-coral/20 text-brand-coral',
      [OnboardingStep.MANAGE_INVENTORY]: 'bg-brand-sky/20 text-brand-sky',
      [OnboardingStep.COMPLETED]: 'bg-gray-200 text-gray-600'
    };
    return classes[step as OnboardingStep] ?? 'bg-gray-200 text-gray-600';
  }

  getStepBadgeClass(): string {
    const step = this.getCurrentStep();
    const classes: Record<OnboardingStep, string> = {
      [OnboardingStep.SETUP_BRANCHES]: 'bg-brand-sky/20 text-brand-sky',
      [OnboardingStep.ADD_USERS]: 'bg-brand-mint/20 text-brand-mint',
      [OnboardingStep.ADD_PRODUCTS]: 'bg-brand-coral/20 text-brand-coral',
      [OnboardingStep.MANAGE_INVENTORY]: 'bg-brand-sky/20 text-brand-sky',
      [OnboardingStep.COMPLETED]: 'bg-gray-200 text-gray-600'
    };
    return classes[step as OnboardingStep] ?? 'bg-gray-200 text-gray-600';
  }

  getStepButtonClass(): string {
    const step = this.getCurrentStep();
    const classes: Record<OnboardingStep, string> = {
      [OnboardingStep.SETUP_BRANCHES]: 'bg-brand-sky text-white hover:bg-brand-sky/90',
      [OnboardingStep.ADD_USERS]: 'bg-brand-mint text-gray-900 hover:bg-brand-mint/90',
      [OnboardingStep.ADD_PRODUCTS]: 'bg-brand-coral text-white hover:bg-brand-coral/90',
      [OnboardingStep.MANAGE_INVENTORY]: 'bg-brand-sky text-white hover:bg-brand-sky/90',
      [OnboardingStep.COMPLETED]: 'bg-gray-200 text-gray-600'
    };
    return classes[step as OnboardingStep] ?? 'bg-gray-200 text-gray-600';
  }

  getProgressBarClass(): string {
    const step = this.getCurrentStep();
    const classes: Record<OnboardingStep, string> = {
      [OnboardingStep.SETUP_BRANCHES]: 'bg-brand-sky',
      [OnboardingStep.ADD_USERS]: 'bg-brand-mint',
      [OnboardingStep.ADD_PRODUCTS]: 'bg-brand-coral',
      [OnboardingStep.MANAGE_INVENTORY]: 'bg-brand-sky',
      [OnboardingStep.COMPLETED]: 'bg-green-500'
    };
    return classes[step as OnboardingStep] ?? 'bg-gray-400';
  }

  getProgressPercentage(): number {
    const status = this.onboardingStatus();
    if (!status) return 0;
    
    let completed = 0;
    if (status.hasBranches) completed++;
    if (status.hasUsers) completed++;
    if (status.hasProducts) completed++;
    if (status.hasInventory) completed++;
    
    return (completed / 4) * 100;
  }

  dismissCurrentStep(): void {
    const step = this.getCurrentStep();
    if (step) {
      this.dismissedSteps.update(steps => {
        const newSet = new Set(steps);
        newSet.add(step);
        return newSet;
      });
    }
  }

  isDismissed(step: OnboardingStep): boolean {
    return this.dismissedSteps().has(step);
  }

  shouldShowOnboarding(): boolean {
    const status = this.onboardingStatus();
    if (!status) return false;
    if (status.currentStep === OnboardingStep.COMPLETED) return false;
    const currentStep = this.getCurrentStep();
    return currentStep !== null && !this.isDismissed(currentStep);
  }
}
