import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BranchDto, UserBranchAssignmentDto } from '../../core/services/branches.service';
import { BranchesService } from '../../core/services/branches.service';

export interface ViewStaffDialogData {
  branch: BranchDto;
}

@Component({
  selector: 'app-view-staff-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatChipsModule, MatProgressSpinnerModule],
  template: `
  <div class="w-[min(92vw,560px)]">
    <div class="px-5 pt-5">
      <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-coral to-brand-sky mb-4"></div>
      <h2 class="text-2xl font-semibold">Staff at {{ data.branch.name }}</h2>
      <p class="text-gray-600 mt-1 text-sm">Current staff assignments for this branch.</p>
    </div>

    <div class="p-5 pt-3 space-y-4">
      <!-- Loading State -->
      <div *ngIf="loading" class="text-center py-12">
        <mat-spinner diameter="40" class="mx-auto mb-4"></mat-spinner>
        <p class="text-gray-600">Loading staff assignments...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="text-center py-12 text-red-500">
        <mat-icon class="text-6xl text-red-300 mb-4">error</mat-icon>
        <h3 class="text-xl font-semibold text-red-800 mb-2">Error Loading Staff</h3>
        <p class="text-red-600">{{ error }}</p>
        <button mat-stroked-button class="mt-4" (click)="loadStaff()">Retry</button>
      </div>

      <!-- No Staff State -->
      <div *ngIf="!loading && !error && assignments.length === 0" class="text-center py-12 text-gray-500">
        <mat-icon class="text-6xl text-brand-sky mb-4">people</mat-icon>
        <h3 class="text-xl font-semibold text-gray-800 mb-2">No staff assigned</h3>
        <p class="text-gray-600">This branch currently has no staff members assigned.</p>
      </div>

      <!-- Staff List -->
      <div *ngIf="!loading && !error && assignments.length > 0" class="space-y-3">
        <div *ngFor="let assignment of assignments" 
             class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-brand-sky/20 rounded-full flex items-center justify-center">
              <mat-icon class="text-brand-sky">person</mat-icon>
            </div>
            <div>
              <div class="font-medium text-gray-900">{{ assignment.username }}</div>
              <div class="text-sm text-gray-600">{{ assignment.email }}</div>
              <div class="text-xs text-gray-500">
                Assigned: {{ assignment.assignedAt | date:'short' }}
                <span *ngIf="assignment.isPrimary" class="ml-2 text-brand-sky">• Primary Branch</span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <span *ngIf="assignment.isPrimary" 
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-brand-sky/20 text-brand-sky border border-brand-sky/30">
              <mat-icon class="text-xs">star</mat-icon>
              Primary
            </span>
          </div>
        </div>
      </div>

      <div class="pt-2 flex justify-end">
        <button mat-stroked-button type="button" (click)="close()">Close</button>
      </div>
    </div>
  </div>
  `
})
export class ViewStaffDialogComponent implements OnInit {
  private readonly ref = inject(MatDialogRef<ViewStaffDialogComponent, any>);
  private readonly branchesService = inject(BranchesService);
  readonly data: ViewStaffDialogData = inject(MAT_DIALOG_DATA);

  assignments: UserBranchAssignmentDto[] = [];
  loading = true;
  error: string | null = null;

  ngOnInit() {
    this.loadStaff();
  }

  loadStaff(): void {
    this.loading = true;
    this.error = null;
    
    this.branchesService.getBranchUsers(this.data.branch.id).subscribe({
      next: (staff) => {
        this.assignments = staff;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load staff assignments';
        this.loading = false;
        console.error('Error loading branch staff:', err);
      }
    });
  }

  close(): void { 
    this.ref.close(); 
  }
}
