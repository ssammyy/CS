import { Component, OnInit, AfterViewInit, signal } from '@angular/core';
import { RouterOutlet, NavigationEnd, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

/**
 * AppComponent is the root component of the application.
 * It manages the universal loader that displays during initial app load.
 * 
 * This component follows the UI Design Language Rule by:
 * - Using the approved color palette for the loader
 * - Ensuring the loader is visually consistent with the brand
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'web';
  readonly isLoading = signal(true);
  private loaderHidden = false;

  constructor(private router: Router) {}

  /**
   * Initializes the component and sets up the loader visibility.
   * The loader will hide once the app and all resources are fully loaded.
   */
  ngOnInit(): void {
    // Hide loader once the window and all resources are fully loaded
    if (document.readyState === 'complete') {
      // If already loaded, hide after a short delay
      setTimeout(() => this.hideLoader(), 500);
    } else {
      // Wait for window load event (all resources loaded)
      window.addEventListener('load', () => {
        setTimeout(() => this.hideLoader(), 500);
      });
    }

    // Listen for router navigation to ensure app is initialized
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Hide loader after first navigation completes
        setTimeout(() => this.hideLoader(), 300);
      });
  }

  /**
   * Called after the view is initialized.
   * Ensures the loader hides once Angular has fully rendered.
   */
  ngAfterViewInit(): void {
    // Hide loader after view initialization
    setTimeout(() => this.hideLoader(), 800);
  }

  /**
   * Hides the loader with a smooth fade-out transition.
   * Uses a flag to prevent multiple calls.
   */
  private hideLoader(): void {
    if (this.loaderHidden) return;
    
    this.loaderHidden = true;
    // Small delay to ensure smooth transition
    setTimeout(() => {
      this.isLoading.set(false);
    }, 200);
  }
}
