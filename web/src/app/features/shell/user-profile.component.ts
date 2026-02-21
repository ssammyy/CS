import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthService, UserDto } from '../../core/services/auth.service';
import { UsersService, UserManagementDto } from '../../core/services/users.service';
import { EditProfileDialog } from './edit-profile.dialog';
import { ChangePasswordDialog } from './change-password.dialog';

/**
 * UserProfileComponent displays the logged-in user's information in the shell header.
 * Shows user avatar, name, and role with a menu to edit profile.
 */
@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule],
  template: `
    <div class="flex items-center gap-3">
      <div class="relative" [matMenuTriggerFor]="userMenu">
        <button class="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 transition-colors cursor-pointer">
          <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-sky to-brand-coral flex items-center justify-center text-white font-semibold text-xs">
            {{ getInitials() }}
          </div>
          <div class="hidden sm:block text-left">
            <div class="font-medium text-gray-900 text-xs">{{ currentUser()?.username || 'User' }}</div>
            <div class="text-xs text-gray-500">{{ currentUser()?.role || '' }}</div>
          </div>
          <mat-icon class="text-gray-500 text-sm">expand_more</mat-icon>
        </button>
      </div>

      <mat-menu #userMenu="matMenu" class="min-w-64">
        <!-- Menu Header -->
        <div class="px-4 py-3 border-b border-gray-200">
          <div class="flex items-center gap-3">
            <div class="h-12 w-12 rounded-lg bg-gradient-to-br from-brand-sky to-brand-coral flex items-center justify-center text-white font-semibold">
              {{ getInitials() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-gray-900 truncate">{{ currentUser()?.username || 'User' }}</div>
              <div class="text-xs text-gray-500 truncate">{{ currentUser()?.email || '' }}</div>
              <div class="text-xs text-gray-400 mt-0.5">{{ currentUser()?.role || '' }}</div>
            </div>
          </div>
        </div>

        <!-- User Details -->
        <div class="px-4 py-3 space-y-2">
          <div *ngIf="userDetails()" class="space-y-1.5">
            <div *ngIf="userDetails()?.phone" class="flex items-center gap-2 text-sm">
              <mat-icon class="text-gray-400 text-base">phone</mat-icon>
              <span class="text-gray-600">{{ userDetails()?.phone }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <mat-icon class="text-gray-400 text-base">business</mat-icon>
              <span class="text-gray-600">{{ userDetails()?.tenantName || '' }}</span>
            </div>
            <div *ngIf="userDetails()?.branches && userDetails()!.branches.length > 0" class="flex items-start gap-2 text-sm">
              <mat-icon class="text-gray-400 text-base mt-0.5">store</mat-icon>
              <div class="flex-1">
                <div class="text-gray-600 font-medium mb-1">Branches:</div>
                <div class="flex flex-wrap gap-1">
                  <span 
                    *ngFor="let branch of userDetails()!.branches" 
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                    [ngClass]="branch === userDetails()!.primaryBranch ? 'bg-brand-sky/20 text-brand-sky border border-brand-sky/30' : 'bg-gray-100 text-gray-600'">
                    {{ branch }}
                    <mat-icon *ngIf="branch === userDetails()!.primaryBranch" fontIcon="star" class="text-xs"></mat-icon>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="px-2 py-2 border-t border-gray-200 space-y-0.5">
          <button 
            mat-menu-item
            (click)="openEditProfile()"
            class="flex items-center gap-2">
            <mat-icon>edit</mat-icon>
            <span>Edit Profile</span>
          </button>
          <button 
            mat-menu-item
            (click)="openChangePassword()"
            class="flex items-center gap-2">
            <mat-icon>lock</mat-icon>
            <span>Change Password</span>
          </button>
          <button 
            mat-menu-item
            (click)="onLogout()"
            class="flex items-center gap-2 text-gray-700">
            <mat-icon>logout</mat-icon>
            <span>Log out</span>
          </button>
        </div>
      </mat-menu>
    </div>
  `
})
export class UserProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  currentUser = signal<UserDto | null>(null);
  userDetails = signal<UserManagementDto | null>(null);

  ngOnInit(): void {
    // Get current user from auth service
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUser.set(user);
      // Fetch full user details including phone and branches
      this.loadUserDetails(user.id);
    }
  }

  /**
   * Loads full user details from the users service
   */
  private loadUserDetails(userId: string): void {
    // Subscribe to users$ to get updates
    this.usersService.users$.subscribe(users => {
      if (users) {
        const user = users.find(u => u.id === userId);
        if (user) {
          this.userDetails.set(user);
        }
      }
    });

    // Load users if not already loaded
    this.usersService.loadUsers();
  }

  /**
   * Gets user initials for avatar display
   */
  getInitials(): string {
    const user = this.currentUser();
    if (!user?.username) return 'U';
    const parts = user.username.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  }

  /**
   * Opens the change password dialog
   */
  openChangePassword(): void {
    this.dialog.open(ChangePasswordDialog, {
      panelClass: 'mat-elevation-z4'
    });
  }

  /**
   * Opens the edit profile dialog
   */
  openEditProfile(): void {
    const user = this.currentUser();
    if (!user) return;

    // Fetch full user details if not already loaded
    if (!this.userDetails()) {
      this.usersService.loadUsers(true);
      this.usersService.users$.subscribe(users => {
        if (users) {
          const fullUser = users.find(u => u.id === user.id);
          if (fullUser) {
            this.userDetails.set(fullUser);
            this.openDialog(fullUser);
          }
        }
      });
    } else {
      this.openDialog(this.userDetails()!);
    }
  }

  /**
   * Logs out the current user and redirects to login.
   */
  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private openDialog(user: UserManagementDto): void {
    this.dialog.open(EditProfileDialog, {
      panelClass: 'mat-elevation-z4',
      data: { user }
    })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          // Refresh user details after update
          this.usersService.loadUsers(true);
          // Update current user in localStorage if email changed
          const updatedUser = this.authService.getCurrentUser();
          if (updatedUser && result.email) {
            updatedUser.email = result.email;
            localStorage.setItem('auth_user', JSON.stringify(updatedUser));
            this.currentUser.set(updatedUser);
          }
        }
      });
  }
}
