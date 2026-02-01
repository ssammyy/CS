import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BranchesService, BranchDto, CreateBranchRequest } from '../../core/services/branches.service';
import { CreateBranchDialogComponent } from './create-branch.dialog';
import { AssignStaffDialogComponent } from './assign-staff.dialog';
import { ViewStaffDialogComponent } from './view-staff.dialog';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

// Professional Button Components
import { 
  PrimaryButtonComponent, 
  SecondaryButtonComponent, 
  AccentButtonComponent, 
  DangerButtonComponent, 
  IconButtonComponent,
  TextButtonComponent 
} from '../../shared/components';

/**
 * BranchesComponent displays a list of all branches for the current tenant.
 * It provides functionality to create, edit, and delete branches.
 */
@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    // Professional Button Components
    PrimaryButtonComponent,
    SecondaryButtonComponent,
    AccentButtonComponent,
    DangerButtonComponent,
    IconButtonComponent,
    TextButtonComponent
  ],
  templateUrl: './branches.component.html'
})
export class BranchesComponent implements OnInit {
  private readonly branchesService = inject(BranchesService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  branches: BranchDto[] = [];

  branches$ = this.branchesService.branches$;
  displayedColumns: string[] = ['name', 'location', 'contactEmail', 'contactPhone', 'userCount', 'status', 'actions'];

  ngOnInit(): void {
    this.branchesService.loadBranches();
  }


  /**
   * Opens the create branch dialog and handles the result.
   */
  openCreateBranchDialog(): void {
    const dialogRef = this.dialog.open(CreateBranchDialogComponent, {
      panelClass: 'mat-elevation-z4'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.branchesService.createBranch(result).subscribe({
          next: () => {
            this.snackBar.open('Branch created successfully', 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error creating branch:', error);
            this.snackBar.open('Failed to create branch', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  /**
   * Deletes a branch after confirmation.
   */
  deleteBranch(branch: BranchDto): void {
    if (confirm(`Are you sure you want to delete the branch "${branch.name}"?`)) {
      this.branchesService.deleteBranch(branch.id).subscribe({
        next: () => {
          this.snackBar.open('Branch deleted successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deleting branch:', error);
          this.snackBar.open('Failed to delete branch', 'Close', { duration: 3000 });
        }
      });
    }
  }

  /**
   * Refreshes the branch list from the server.
   */
  refreshBranches(): void {
    this.branchesService.loadBranches(true);
  }

  /**
   * Opens the edit branch dialog.
   */
  editBranch(branch: BranchDto): void {
    // TODO: Implement edit branch functionality
    console.log('Edit branch:', branch);
  }

  /**
   * Opens the view branch users dialog.
   */
  viewBranchUsers(branch: BranchDto): void {
    const dialogRef = this.dialog.open(ViewStaffDialogComponent, {
      data: { branch },
      panelClass: 'mat-elevation-z4'
    });
  }

  /**
   * Opens the assign users to branch dialog.
   */
  assignUsersToBranch(branch: BranchDto): void {
    const dialogRef = this.dialog.open(AssignStaffDialogComponent, {
      data: { branch },
      panelClass: 'mat-elevation-z4'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh the branches to show updated user counts
        this.branchesService.loadBranches(true);
        this.snackBar.open('Staff assignments updated successfully', 'Close', { duration: 3000 });
      }
    });
  }
}
