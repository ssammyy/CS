import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ErrorService {
  private readonly snack = inject(MatSnackBar);

  show(message: string, action = 'Dismiss', durationMs = 5000): void {
    this.snack.open(message, action, {
      duration: durationMs,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-error']
    });
  }
}




