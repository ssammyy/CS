import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CreateUserDialog } from './create-user.dialog';
import { EditUserDialog } from './edit-user.dialog';
import { ResetPasswordDialog } from './reset-password.dialog';
import { environment } from '../../../environments/environment';
import { UsersService, UserManagementDto } from '../../core/services/users.service';
import { ErrorService } from '../../core/services/error.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule, MatSnackBarModule],
  templateUrl: './users.component.html',
  styleUrls: []
})
export class UsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);
  private readonly usersService = inject(UsersService);
  private readonly errorSvc = inject(ErrorService);
  private readonly snack = inject(MatSnackBar);
  users: UserManagementDto[] = [];
  loading = true;
  error: string | null = null;
  currentUserId = JSON.parse(localStorage.getItem('auth_user') || '{}')?.id || '';

  ngOnInit(): void {
    this.usersService.users$.subscribe(list => { 
      if (list) { 
        // Filter out the current logged-in user from the list
        this.users = list.filter(u => u.id !== this.currentUserId); 
        this.loading = false; 
      } 
    });
    this.usersService.loadUsers();
  }

  editUser(user: UserManagementDto): void {
    this.dialog.open(EditUserDialog, { 
      panelClass: 'mat-elevation-z4',
      data: { user }
    })
      .afterClosed()
      .subscribe((result) => {
        if (result === 'deleted') {
          // User was deleted, list will refresh automatically
          return;
        }
        if (result) {
          // User was updated, refresh the list
          this.usersService.loadUsers(true);
        }
      });
  }

  deleteUser(user: UserManagementDto): void {
    if (!confirm(`Delete ${user.username}?`)) return;
    this.usersService.deleteUser(user.id).subscribe({
      next: () => {},
      error: (e) => this.errorSvc.show(e?.error?.message || 'Failed to delete user')
    });
  }

  /** Open dialog for admin to set a new password for the user (e.g. when they forget their password). */
  resetPassword(user: UserManagementDto): void {
    this.dialog.open(ResetPasswordDialog, {
      panelClass: 'mat-elevation-z4',
      data: { user }
    }).afterClosed().subscribe(() => {
      // Dialog shows its own success message
    });
  }

  isSelf(u: UserManagementDto): boolean { return u.id === this.currentUserId; }

  createUser(form: { username: string; email: string; password: string; phone?: string; role: 'USER'|'ADMIN' }): void {
    this.usersService.createUser({
      username: form.username,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
      role: form.role
    }).subscribe({
      next: () => {
        this.snack.open(
          `User ${form.username} created. Share the temporary password with them—they must change it on first login.`,
          'Dismiss',
          { duration: 8000, horizontalPosition: 'right', verticalPosition: 'bottom' }
        );
      },
      error: (e) => this.errorSvc.show(e?.error?.message || 'Failed to create user')
    });
  }

  openCreateDialog(): void {
    this.dialog.open(CreateUserDialog, { panelClass: 'mat-elevation-z4' })
      .afterClosed()
      .subscribe((value) => {
        if (!value) return;
        this.createUser(value);
      });
  }
}


