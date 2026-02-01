import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Professional button component system using our brand colors.
 * Provides consistent button styling across the entire application.
 * 
 * Brand Colors:
 * - Primary (Light Blue): #A1C7F8 - For main actions, primary buttons
 * - Secondary (Mint Green): #CBEBD0 - For secondary actions, outline buttons  
 * - Accent (Soft Coral): #F99E98 - For call-to-action, danger, or highlight buttons
 */

@Component({
  selector: 'app-primary-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <button 
      mat-raised-button 
      color="primary"
      [disabled]="disabled"
      [type]="type"
      class="!py-2.5 !px-4 !font-medium !text-white !bg-brand-sky hover:!bg-brand-sky/90 focus:!bg-brand-sky/90 active:!bg-brand-sky/95 disabled:!bg-gray-300 disabled:!text-gray-500 !shadow-sm hover:!shadow-md transition-all duration-200 !rounded-lg !min-h-[44px] !flex !items-center !justify-center !gap-2"
      [ngClass]="size === 'small' ? '!py-2 !px-3 !text-sm !min-h-[36px]' : size === 'large' ? '!py-3 !px-6 !text-lg !min-h-[52px]' : ''">
      <mat-icon *ngIf="icon && iconPosition !== 'right'" class="!text-inherit" [ngClass]="size === 'small' ? '!text-sm' : size === 'large' ? '!text-lg' : ''">
        {{ icon }}
      </mat-icon>
      <span *ngIf="label">{{ label }}</span>
      <mat-icon *ngIf="icon && iconPosition === 'right'" class="!text-inherit" [ngClass]="size === 'small' ? '!text-sm' : size === 'large' ? '!text-lg' : ''">
        {{ icon }}
      </mat-icon>
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class PrimaryButtonComponent {
  @Input() label?: string;
  @Input() icon?: string;
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
}

@Component({
  selector: 'app-secondary-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <button 
      mat-stroked-button
      [disabled]="disabled"
      [type]="type"
      class="!py-2.5 !px-4 !font-medium !text-gray-700 !border-brand-mint !bg-white hover:!bg-brand-mint/5 focus:!bg-brand-mint/10 active:!bg-brand-mint/20 disabled:!bg-gray-50 disabled:!text-gray-400 disabled:!border-gray-200 !shadow-sm hover:!shadow-md transition-all duration-200 !rounded-lg !min-h-[44px] !flex !items-center !justify-center !gap-2"
      [ngClass]="size === 'small' ? '!py-2 !px-3 !text-sm !min-h-[36px]' : size === 'large' ? '!py-3 !px-6 !text-lg !min-h-[52px]' : ''">
      <mat-icon *ngIf="icon && iconPosition !== 'right'" class="!text-inherit" [ngClass]="size === 'small' ? '!text-sm' : size === 'large' ? '!text-lg' : ''">
        {{ icon }}
      </mat-icon>
      <span *ngIf="label">{{ label }}</span>
      <mat-icon *ngIf="icon && iconPosition === 'right'" class="!text-inherit" [ngClass]="size === 'small' ? '!text-sm' : size === 'large' ? '!text-lg' : ''">
        {{ icon }}
      </mat-icon>
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class SecondaryButtonComponent {
  @Input() label?: string;
  @Input() icon?: string;
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
}

@Component({
  selector: 'app-accent-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <button 
      mat-raised-button
      [disabled]="disabled"
      [type]="type"
      class="!py-2.5 !px-4 !font-medium !text-white !bg-brand-coral hover:!bg-brand-coral/90 focus:!bg-brand-coral/90 active:!bg-brand-coral/95 disabled:!bg-gray-300 disabled:!text-gray-500 !shadow-sm hover:!shadow-md transition-all duration-200 !rounded-lg !min-h-[44px] !flex !items-center !justify-center !gap-2"
      [ngClass]="size === 'small' ? '!py-2 !px-3 !text-sm !min-h-[36px]' : size === 'large' ? '!py-3 !px-6 !text-lg !min-h-[52px]' : ''">
      <mat-icon *ngIf="icon && iconPosition !== 'right'" class="!text-inherit" [ngClass]="size === 'small' ? '!text-sm' : size === 'large' ? '!text-lg' : ''">
        {{ icon }}
      </mat-icon>
      <span *ngIf="label">{{ label }}</span>
      <mat-icon *ngIf="icon && iconPosition === 'right'" class="!text-inherit" [ngClass]="size === 'small' ? '!text-sm' : size === 'large' ? '!text-lg' : ''">
        {{ icon }}
      </mat-icon>
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class AccentButtonComponent {
  @Input() label?: string;
  @Input() icon?: string;
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
}

@Component({
  selector: 'app-danger-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <button 
      mat-stroked-button
      [disabled]="disabled"
      [type]="type"
      class="!py-2.5 !px-4 !font-medium !text-red-600 !border-red-300 !bg-white hover:!bg-red-50 focus:!bg-red-100 active:!bg-red-200 disabled:!bg-gray-50 disabled:!text-gray-400 disabled:!border-gray-200 !shadow-sm hover:!shadow-md transition-all duration-200 !rounded-lg !min-h-[44px] !flex !items-center !justify-center !gap-2"
      [ngClass]="size === 'small' ? '!py-2 !px-3 !text-sm !min-h-[36px]' : size === 'large' ? '!py-3 !px-6 !text-lg !min-h-[52px]' : ''">
      <mat-icon *ngIf="icon && iconPosition !== 'right'" class="!text-inherit" [ngClass]="size === 'small' ? '!text-sm' : size === 'large' ? '!text-lg' : ''">
        {{ icon }}
      </mat-icon>
      <span *ngIf="label">{{ label }}</span>
      <mat-icon *ngIf="icon && iconPosition === 'right'" class="!text-inherit" [ngClass]="size === 'small' ? '!text-sm' : size === 'large' ? '!text-lg' : ''">
        {{ icon }}
      </mat-icon>
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class DangerButtonComponent {
  @Input() label?: string;
  @Input() icon?: string;
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
}

@Component({
  selector: 'app-icon-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <button 
      mat-icon-button
      [disabled]="disabled"
      [type]="type"
      class="!w-10 !h-10 !text-gray-600 hover:!bg-gray-100 focus:!bg-gray-200 active:!bg-gray-300 disabled:!text-gray-400 disabled:!bg-transparent !rounded-lg transition-all duration-200 !flex !items-center !justify-center"
      [ngClass]="size === 'small' ? '!w-8 !h-8' : size === 'large' ? '!w-12 !h-12' : ''">
      <mat-icon [ngClass]="size === 'small' ? '!text-sm' : size === 'large' ? '!text-lg' : ''">
        {{ icon }}
      </mat-icon>
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class IconButtonComponent {
  @Input() icon!: string;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
}

@Component({
  selector: 'app-text-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <button 
      mat-button
      [disabled]="disabled"
      [type]="type"
      class="!py-2 !px-3 !font-medium !text-brand-sky hover:!bg-brand-sky/10 focus:!bg-brand-sky/20 active:!bg-brand-sky/30 disabled:!text-gray-400 disabled:!bg-transparent !rounded-lg transition-all duration-200 !min-h-[40px] !flex !items-center !justify-center !gap-2"
      [ngClass]="size === 'small' ? '!py-1.5 !px-2 !text-sm !min-h-[32px]' : size === 'large' ? '!py-2.5 !px-4 !text-lg !min-h-[48px]' : ''">
      <mat-icon *ngIf="icon && iconPosition !== 'right'" class="!text-inherit" [ngClass]="size === 'small' ? '!text-sm' : size === 'large' ? '!text-lg' : ''">
        {{ icon }}
      </mat-icon>
      <span *ngIf="label">{{ label }}</span>
      <mat-icon *ngIf="icon && iconPosition === 'right'" class="!text-inherit" [ngClass]="size === 'small' ? '!text-sm' : size === 'large' ? '!text-lg' : ''">
        {{ icon }}
      </mat-icon>
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class TextButtonComponent {
  @Input() label?: string;
  @Input() icon?: string;
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
}
