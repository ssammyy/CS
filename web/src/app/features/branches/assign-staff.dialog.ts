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
  <div class="max-w-[560px] w-full max-h-[90vh] flex flex-col">
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

          <!-- Primary Branch: show when assigned or when there is a pending assign (so user can set primary while assigning) -->
          <div *ngIf="isUserAssigned(user.id) || hasPendingAssign(user.id)" class="flex items-center gap-2">
            <mat-checkbox
              [checked]="getPrimaryChecked(user.id)"
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

  /** True if there is a pending 'assign' action for this user (so we show Primary checkbox before Apply). */
  hasPendingAssign(userId: string): boolean {
    return this.pendingChanges.some(c => c.userId === userId && c.action === 'assign');
  }

  /** Current primary state: from pending assign if any, otherwise from existing assignment. */
  getPrimaryChecked(userId: string): boolean {
    const pending = this.pendingChanges.find(c => c.userId === userId);
    if (pending?.action === 'assign') return pending.isPrimary ?? false;
    if (pending?.action === 'setPrimary') return pending.isPrimary ?? false;
    return this.currentAssignments.some(a => a.userId === userId && a.isPrimary);
  }

  toggleUserAssignment(user: UserManagementDto, isAssigned: boolean) {
    // Remove any existing pending changes for this user
    this.pendingChanges = this.pendingChanges.filter(change => change.userId !== user.id);

    if (isAssigned) {
      this.pendingChanges.push({
        userId: user.id,
        action: 'assign',
        isPrimary: false
      });
    } else {
      this.pendingChanges.push({
        userId: user.id,
        action: 'remove'
      });
    }
  }

  /** Update primary for this branch: either on the pending assign or add/update setPrimary for already-assigned user. */
  setPrimaryBranch(userId: string, isPrimary: boolean) {
    const pendingAssign = this.pendingChanges.find(c => c.userId === userId && c.action === 'assign');
    if (pendingAssign) {
      pendingAssign.isPrimary = isPrimary;
      return;
    }
    // Already assigned: add or update setPrimary so we call updateUserBranchPrimary on Apply
    this.pendingChanges = this.pendingChanges.filter(c => !(c.userId === userId && c.action === 'setPrimary'));
    if (isPrimary) {
      this.pendingChanges.push({ userId, action: 'setPrimary', isPrimary: true });
    }
  }

  removeUserAssignment(userId: string) {
    const username = this.getUserName(userId);
    if (!confirm(`Are you sure you want to remove ${username} from this branch?`)) return;
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
    if (this.pendingChanges.length === 0) return;

    const observables = this.pendingChanges.map(change => {
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
          return this.branchesService.updateUserBranchPrimary({
            userId: change.userId,
            branchId: this.data.branch.id,
            isPrimary: change.isPrimary ?? true
          });
        default:
          return null;
      }
    }).filter(obs => obs !== null);

    forkJoin(observables).subscribe({
      next: () => this.ref.close(true),
      error: (err) => console.error('Error applying changes:', err)
    });
  }
}
