import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard, platformAdminGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { ShellComponent } from './features/shell/shell.component';
import { DashboardComponent } from './features/dashboard/dashboard/dashboard.component';
import { BranchesComponent } from './features/branches/branches.component';
import { UsersComponent } from './features/users/users.component';
import { ProductsComponent } from './features/products/products.component';
import { InventoryComponent } from './features/inventory/inventory.component';
import { SuppliersComponent } from './features/suppliers/suppliers.component';
import { PurchaseOrdersComponent } from './features/purchase-orders/purchase-orders.component';
import { PosComponent } from './features/sales/pos/pos.component';
import { SalesListComponent } from './features/sales/sales-list/sales-list.component';
import { CustomersComponent } from './features/sales/customers/customers.component';
import { CreditManagementComponent } from './features/credit/credit-management.component';
import { ReportsLayoutComponent } from './features/reports/reports-layout/reports-layout.component';
import { SettingsComponent } from './features/settings/settings.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [platformAdminGuard] },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
      { path: 'branches', component: BranchesComponent, canActivate: [authGuard] },
      { path: 'users', component: UsersComponent, canActivate: [authGuard] },
      { path: 'products', component: ProductsComponent, canActivate: [authGuard] },
      { path: 'suppliers', component: SuppliersComponent, canActivate: [authGuard] },
      { path: 'purchase-orders', component: PurchaseOrdersComponent, canActivate: [authGuard] },
      { path: 'inventory', component: InventoryComponent, canActivate: [authGuard] },
      { path: 'pos', component: PosComponent, canActivate: [authGuard] },
      { path: 'sales', component: SalesListComponent, canActivate: [authGuard] },
      { path: 'customers', component: CustomersComponent, canActivate: [authGuard] },
      { path: 'credit-management', component: CreditManagementComponent, canActivate: [authGuard] },
      { path: 'reports', component: ReportsLayoutComponent, canActivate: [authGuard] },
      { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ]
  }
];
