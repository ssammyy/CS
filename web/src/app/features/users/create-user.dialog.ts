import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatSelectModule],
  template: `
  <div class="w-[min(92vw,560px)] h-[min(92vh,700px)] overflow-y-auto">
    <div class="px-5 pt-5">
      <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-4"></div>
      <h2 class="text-2xl font-semibold">Create User</h2>
      <p class="text-gray-600 mt-1 text-sm">Add a new user to this tenant</p>
    </div>
    <form #f="ngForm" class="p-5 pt-3 space-y-6" (submit)="$event.preventDefault(); f.valid && submit(f.value)">
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <mat-icon class="text-brand-sky">person</mat-icon>
          User Information
        </h3>
        <div class="space-y-4">
          <mat-form-field class="w-full" color="primary">
            <mat-label>Username</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">person</mat-icon>
            <input matInput name="username" ngModel required />
          </mat-form-field>

          <mat-form-field class="w-full" color="primary">
            <mat-label>Email</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">mail</mat-icon>
            <input matInput type="email" name="email" ngModel required />
          </mat-form-field>

          <mat-form-field class="w-full" color="primary">
            <mat-label>Password</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">lock</mat-icon>
            <input matInput [type]="hidePassword ? 'password' : 'text'" name="password" ngModel required />
            <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword" [attr.aria-label]="hidePassword ? 'Show password' : 'Hide password'">
              <mat-icon>{{ hidePassword ? 'visibility' : 'visibility_off' }}</mat-icon>
            </button>
          </mat-form-field>

          <mat-form-field class="w-full" color="primary">
            <mat-label>Role</mat-label>
            <mat-icon matPrefix class="mr-2 opacity-60">badge</mat-icon>
            <mat-select name="role" ngModel required [panelClass]="'select-on-top'">
              <mat-option *ngFor="let r of roles" [value]="r">{{ r }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <button mat-stroked-button type="button" (click)="close()" class="!py-2.5">Cancel</button>
        <button mat-raised-button color="primary" type="submit" class="!py-2.5" [disabled]="!f.valid">
          <mat-icon>add</mat-icon>
          Create User
        </button>
      </div>
    </form>
  </div>
  `
})
export class CreateUserDialog implements OnInit {
  private readonly ref = inject(MatDialogRef<CreateUserDialog, any>);
  hidePassword = true;
  private readonly http = inject(HttpClient);
  roles: string[] = [];
  
  close(): void { this.ref.close(null); }
  submit(value: any): void { this.ref.close(value); }
  
  ngOnInit(): void {
    // Load roles
    this.http.get<{ roles: string[] }>(`${environment.apiBaseUrl}/users/roles`).subscribe({
      next: (res) => { this.roles = (res.roles || []).filter(r => r !== 'PLATFORM_ADMIN'); if (this.roles.length === 0) this.roles = ['USER']; },
      error: () => {
        console.log('Failed to fetch roles, defaulting to USER');
      }
    });
  }
}


