import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard, platformAdminGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ChangePasswordComponent } from './features/auth/change-password/change-password.component';
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
import { ExpensesComponent } from './features/expenses/expenses.component';
import { SettingsComponent } from './features/settings/settings.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { AiChatComponent } from './features/ai-chat/ai-chat.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'change-password', component: ChangePasswordComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [platformAdminGuard] },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard, roleGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'branches', component: BranchesComponent },
      { path: 'users', component: UsersComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'suppliers', component: SuppliersComponent },
      { path: 'purchase-orders', component: PurchaseOrdersComponent },
      { path: 'inventory', component: InventoryComponent },
      { path: 'pos', component: PosComponent },
      { path: 'sales', component: SalesListComponent },
      { path: 'customers', component: CustomersComponent },
      { path: 'credit-management', component: CreditManagementComponent },
      { path: 'expenses', component: ExpensesComponent },
      { path: 'reports', loadComponent: () => import('./features/reports/reports-layout/reports-layout.component').then(m => m.ReportsLayoutComponent) },
      { path: 'settings', component: SettingsComponent },
      { path: 'ai-chat', component: AiChatComponent },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ]
  }
];
