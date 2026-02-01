import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CreateUserDialog } from './create-user.dialog';
import { environment } from '../../../environments/environment';
import { UsersService, UserManagementDto } from '../../core/services/users.service';
import { ErrorService } from '../../core/services/error.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule],
  templateUrl: './users.component.html',
  styleUrls: []
})
export class UsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);
  private readonly usersService = inject(UsersService);
  private readonly errorSvc = inject(ErrorService);
  users: UserManagementDto[] = [];
  loading = true;
  error: string | null = null;
  currentUsername = JSON.parse(localStorage.getItem('auth_user') || '{}')?.username || '';

  ngOnInit(): void {
    this.usersService.users$.subscribe(list => { if (list) { this.users = list; this.loading = false; } });
    this.usersService.loadUsers();
  }

  editUser(user: UserManagementDto): void {
    const makeAdmin = confirm(`Toggle role for ${user.username}?\nOK = make ADMIN, Cancel = make USER`);
    const role = makeAdmin ? 'ADMIN' : 'USER';
    this.usersService.updateUser(user.id, { role }).subscribe({
      next: () => {},
      error: (e) => this.errorSvc.show(e?.error?.message || 'Failed to update user')
    });
  }

  deleteUser(user: UserManagementDto): void {
    if (!confirm(`Delete ${user.username}?`)) return;
    this.usersService.deleteUser(user.id).subscribe({
      next: () => {},
      error: (e) => this.errorSvc.show(e?.error?.message || 'Failed to delete user')
    });
  }

  isSelf(u: UserManagementDto): boolean { return u.username === this.currentUsername; }

  createUser(form: { username: string; email: string; password: string; role: 'USER'|'ADMIN' }): void {
    this.usersService.createUser({
      username: form.username,
      email: form.email,
      password: form.password,
      role: form.role
    }).subscribe({
      next: () => {},
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


