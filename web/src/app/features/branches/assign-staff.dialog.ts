import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { forkJoin } from 'rxjs';
import { BranchDto, UserBranchDto, BranchesService } from '../../core/services/branches.service';
import { UsersService, UserManagementDto } from '../../core/services/users.service';

export interface AssignStaffDialogData {
  branch: BranchDto;
}

@Component({
  selector: 'app-assign-staff-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  template: `
  <div class="">
    <div class="px-5 pt-5">
      <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-coral to-brand-sky mb-4"></div>
      <h2 class="text-2xl font-semibold">Assign Staff to {{ data.branch.name }}</h2>
      <p class="text-gray-600 mt-1 text-sm">Select users to assign to this branch.</p>
    </div>

    <div class="p-5 pt-3 space-y-4">
      <!-- Search Users -->
      <mat-form-field class="w-full" color="primary">
        <mat-label>Search Users</mat-label>
        <mat-icon matPrefix class="mr-2 opacity-60">search</mat-icon>
        <input matInput
               name="searchQuery"
               [(ngModel)]="searchQuery"
               (input)="filterUsers()"
               placeholder="Search by name or email..." />
      </mat-form-field>

      <!-- Users List -->
      <div class="space-y-2 max-h-96 overflow-y-auto">
        <div *ngFor="let user of filteredUsers"
             class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
          <div class="flex items-center gap-3">
            <mat-checkbox
              [checked]="isUserAssigned(user.id)"
              (change)="toggleUserAssignment(user, $event.checked)"
              color="primary">
            </mat-checkbox>
            <div>
              <div class="font-medium text-gray-900">{{ user.username }}</div>
              <div class="text-sm text-gray-600">{{ user.email }}</div>
              <div class="text-xs text-gray-500">{{ user.role }}</div>
            </div>
          </div>

          <!-- Primary Branch Selection -->
          <div *ngIf="isUserAssigned(user.id)" class="flex items-center gap-2">
            <mat-checkbox
              [checked]="isUserPrimaryBranch(user.id)"
              (change)="setPrimaryBranch(user.id, $event.checked)"
              color="primary">
            </mat-checkbox>
            <span class="text-xs text-gray-600">Primary</span>
          </div>
        </div>

        <div *ngIf="filteredUsers.length === 0" class="text-center py-8 text-gray-500">
          <mat-icon class="text-4xl mb-2">people</mat-icon>
          <p>No users found</p>
        </div>
      </div>

      <!-- Current Assignments -->
      <div *ngIf="currentAssignments.length > 0" class="border-t pt-4">
        <h3 class="font-medium text-gray-900 mb-3">Currently Assigned Staff</h3>
        <div class="space-y-2">
          <div *ngFor="let assignment of currentAssignments"
               class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ getUserName(assignment.userId) }}</span>
              <span *ngIf="assignment.isPrimary"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-brand-sky/20 text-brand-sky">
                <mat-icon class="text-xs">star</mat-icon>
                Primary
              </span>
            </div>
            <button
              mat-icon-button
              (click)="removeUserAssignment(assignment.userId)"
              class="text-brand-coral hover:bg-brand-coral/10">
              <mat-icon>remove_circle</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <div class="pt-2 grid grid-cols-2 gap-3">
        <button mat-stroked-button type="button" (click)="close()">Cancel</button>
        <button mat-raised-button
                color="primary"
                class="!py-2.5 bg-brand-coral text-white hover:opacity-95"
                [disabled]="pendingChanges.length === 0"
                (click)="applyChanges()">
          Apply Changes
        </button>
      </div>
    </div>
  </div>
  `
})
export class AssignStaffDialogComponent implements OnInit {
  private readonly ref = inject(MatDialogRef<AssignStaffDialogComponent, any>);
  readonly data: AssignStaffDialogData = inject(MAT_DIALOG_DATA);
  private readonly usersService = inject(UsersService);
  private readonly branchesService = inject(BranchesService);

  searchQuery = '';
  allUsers: UserManagementDto[] = [];
  filteredUsers: UserManagementDto[] = [];
  currentAssignments: UserBranchDto[] = [];
  pendingChanges: {
    userId: string;
    action: 'assign' | 'remove' | 'setPrimary';
    isPrimary?: boolean;
  }[] = [];

  ngOnInit() {
    this.loadUsers();
    this.loadCurrentAssignments();
  }

  private loadUsers() {
    this.usersService.loadUsers();
    this.usersService.users$.subscribe(users => {
      if (users) {
        this.allUsers = users;
        this.filterUsers();
      }
    });
  }

  private loadCurrentAssignments() {
    this.branchesService.getUsersByBranch(this.data.branch.id).subscribe((assignments: UserBranchDto[]) => {
      this.currentAssignments = assignments;
    });
  }

  filterUsers() {
    if (!this.searchQuery.trim()) {
      this.filteredUsers = this.allUsers;
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredUsers = this.allUsers.filter(user =>
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }
  }

  isUserAssigned(userId: string): boolean {
    return this.currentAssignments.some(a => a.userId === userId);
  }

  isUserPrimaryBranch(userId: string): boolean {
    return this.currentAssignments.some(a => a.userId === userId && a.isPrimary);
  }

  toggleUserAssignment(user: UserManagementDto, isAssigned: boolean) {
    console.log('Toggling user assignment:', user.username, 'isAssigned:', isAssigned);

    // Remove any existing pending changes for this user
    this.pendingChanges = this.pendingChanges.filter(change => change.userId !== user.id);

    if (isAssigned) {
      // Assign user to branch
      this.pendingChanges.push({
        userId: user.id,
        action: 'assign',
        isPrimary: this.isUserPrimaryBranch(user.id)
      });
      console.log('Added assign action for user:', user.username);
    } else {
      // Remove user from branch
      this.pendingChanges.push({
        userId: user.id,
        action: 'remove'
      });
      console.log('Added remove action for user:', user.username);
    }

    console.log('Current pending changes:', this.pendingChanges);
  }

  setPrimaryBranch(userId: string, isPrimary: boolean) {
    // Remove any existing pending changes for this user
    this.pendingChanges = this.pendingChanges.filter(change => change.userId !== userId);

    // If setting as primary, we need to reassign
    if (isPrimary) {
      this.pendingChanges.push({
        userId,
        action: 'setPrimary',
        isPrimary: true
      });
    }
  }

  removeUserAssignment(userId: string) {
    this.pendingChanges.push({
      userId,
      action: 'remove'
    });
  }

  getUserName(userId: string): string {
    const user = this.allUsers.find(u => u.id === userId);
    return user ? user.username : 'Unknown User';
  }

  close(): void {
    this.ref.close(null);
  }

  applyChanges(): void {
    console.log('Applying changes:', this.pendingChanges);

    if (this.pendingChanges.length === 0) {
      console.log('No changes to apply');
      return;
    }

    // Process all pending changes
    const observables = this.pendingChanges.map(change => {
      console.log('Processing change:', change);
      switch (change.action) {
        case 'assign':
          return this.branchesService.assignUserToBranch({
            userId: change.userId,
            branchId: this.data.branch.id,
            isPrimary: change.isPrimary || false
          });
        case 'remove':
          return this.branchesService.removeUserFromBranch({
            userId: change.userId,
            branchId: this.data.branch.id
          });
        case 'setPrimary':
          // For setting primary, we need to reassign with the new primary status
          return this.branchesService.assignUserToBranch({
            userId: change.userId,
            branchId: this.data.branch.id,
            isPrimary: change.isPrimary || false
          });
        default:
          console.warn('Unknown action:', change.action);
          return null;
      }
    }).filter(obs => obs !== null);

    console.log('Observables to execute:', observables.length);

    forkJoin(observables).subscribe({
      next: () => {
        console.log('All changes applied successfully');
        this.ref.close(true); // Indicate success
      },
      error: (error) => {
        console.error('Error applying changes:', error);
        // You could show an error message here
      }
    });
  }
}
