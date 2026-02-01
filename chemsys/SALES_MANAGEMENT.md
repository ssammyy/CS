
# Sales Management Module – Implementation Summary

## Overview

The Sales Management module is designed to enable pharmacies to process transactions efficiently, manage prescriptions, ensure real-time stock deductions, and provide customers with accurate billing. It supports both over-the-counter (OTC) and prescription-based sales, integrating tightly with inventory and audit systems to maintain data consistency and compliance.

---

## Features

### 1. Point of Sale (POS)

- **Quick Transaction Processing:**  
  - Add products to cart via barcode scanning or product search/autocomplete.
  - Support for multiple payment methods: Cash, MPesa, Card, Insurance, Credit.
  - Apply discounts (percentage or fixed).
  - Print or email receipts with pharmacy branding.
  - Suspend/Resume transactions (e.g., if a customer is not ready to pay yet).



### 2. Sales Transactions

- **Sales Entity Includes:**  
  - Sale ID
  - Date/Time
  - Customer (optional; for walk-ins, default to "General Customer")
  - Branch ID
  - Items sold (linked to inventory batch: product, quantity, unit price, tax, discount)
  - Payment info (method, amount, balance if on credit)
  - Automatic stock deduction from inventory upon sale

---
### 4. Returns & Refunds

Process returns for expired/damaged goods or customer dissatisfaction.
Returns linked to original sales invoice.
Inventory automatically updated if goods are returned to stock.


## Data Consistency & Backend Rules

> **Backend Data Consistency Rule:**  
> All backend service methods that mutate inventory or stock levels (such as those in SalesService or InventoryService) must:
> - Be fully transactional (`@Transactional` at the service method level).
> - Be idempotent (use unique transaction references to prevent duplicate stock deductions).
> - Log every inventory mutation with product, branch, quantity, source reference (e.g., sale number), user, and timestamp in an audit log.
> - Update all related entities (e.g., inventory, sales, audit log) atomically.
> - Roll back the entire transaction on any error, and log exceptions with context.
> - Include documentation in service methods describing how these rules are enforced.

---

## Security and Access Control


- **Tenant Isolation:**  
  - All operations are filtered by current tenant and branch context.
  - No cross-tenant data access is possible.

---

## Business Rules

- **Stock Deduction:**  
  - Inventory is decremented in real time upon sale completion.
  - If stock is insufficient, the sale is blocked and a clear error is returned.
- **Idempotency:**  
  - Each sale transaction uses a unique reference to prevent duplicate stock deductions.
- **Audit Trail:**  
  - All sales and inventory mutations are logged for traceability and compliance.
- **Prescription Validation:**  
  - Controlled substances require a valid prescription before sale.

---

## UI/UX Guidelines

> **UI Design Language Rule:**  
> - Use only the approved color palette:  
>   - Mint Green (`#CBEBD0`) for backgrounds and secondary elements  
>   - Light Blue (`#A1C7F8`) for primary backgrounds and highlights  
>   - Soft Coral (`#F99E98`) for call-to-action, errors, and accents  
> - Input fields, buttons, and typography must follow the design system for consistency and accessibility.
> - All new UI components must include documentation referencing this rule.

---

## State Caching (Frontend)

> **Frontend State Caching Rule:**  
> - Use Angular services to cache sales and inventory data in memory.
> - Before making API calls, check for valid cached data.
> - Invalidate or refresh cache after mutations (e.g., new sale, refund).
> - Document caching logic and invalidation strategy in the service.

---
