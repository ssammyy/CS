# Modal Design System

## Overview
This document describes the consistent design pattern applied to all modal/dialog components across the frontend application.

## Design Elements

### 1. Container Structure
```html
<div class="h-[min(92vh,800px)] overflow-y-auto">
```
- Fixed max height responsive to viewport
- Auto scroll for content overflow
- Prevents modals from exceeding screen bounds

### 2. Header Section
```html
<div class="px-5 pt-5">
  <div class="h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-sky to-brand-coral mb-4"></div>
  <h2 class="text-2xl font-semibold">{Title}</h2>
  <p class="text-gray-600 mt-1 text-sm">{Subtitle}</p>
</div>
```
- Decorative gradient bar (brand-sky to brand-coral)
- Consistent typography (2xl semibold for title)
- Descriptive subtitle in smaller text

### 3. Content Section
```html
<div class="p-5 pt-3 space-y-6">
  <!-- Content sections -->
</div>
```
- Consistent padding (p-5, reduced top padding)
- Vertical spacing between sections (space-y-6)

### 4. Section Cards
```html
<div class="bg-white rounded-lg shadow p-6">
  <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
    <mat-icon class="text-brand-sky">{icon}</mat-icon>
    {Section Title}
  </h3>
  <!-- Section content -->
</div>
```
- White background with shadow
- Icon-based section headers in brand-sky color
- Consistent padding and spacing

### 5. Gradient Header Cards (for details views)
```html
<div class="bg-gradient-to-r from-brand-sky/10 to-brand-coral/10 p-6 rounded-lg border border-brand-sky/20">
  <!-- Key information display -->
</div>
```
- Used for primary subject information
- Gradient background with brand colors
- Subtle border

### 6. Information Display
```html
<div class="space-y-4">
  <div>
    <label class="text-sm font-medium text-gray-600">{Label}</label>
    <p class="text-gray-900">{Value}</p>
  </div>
</div>
```
- Consistent label styling (gray-600, small, medium weight)
- Value in gray-900 for readability
- Vertical spacing between items

### 7. Footer Actions
```html
<div class="flex justify-end gap-3 pt-4">
  <button mat-stroked-button class="!py-2.5">Cancel/Close</button>
  <button mat-raised-button color="primary" class="!py-2.5">Primary Action</button>
</div>
```
- Right-aligned buttons
- Consistent padding (!py-2.5)
- Gap between buttons

## Brand Colors

- **brand-sky**: `#A1C7F8` - Primary blue (headers, icons, accents)
- **brand-coral**: `#F99E98` - Accent red (calls-to-action, highlights)
- **brand-mint**: `#CBEBD0` - Secondary green (success states, backgrounds)

## Status Indicators

### Status Chips
```html
<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {color-classes}">
  {Status Text}
</span>
```

Color mapping:
- **Active/Success**: `bg-green-100 text-green-800`
- **Pending**: `bg-yellow-100 text-yellow-800`
- **Warning**: `bg-orange-100 text-orange-800`
- **Error/Inactive**: `bg-red-100 text-red-800`
- **Info**: `bg-blue-100 text-blue-800`
- **Special**: `bg-purple-100 text-purple-800`

## Layout Patterns

### Two-Column Grid
```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div class="space-y-4"><!-- Left column --></div>
  <div class="space-y-4"><!-- Right column --></div>
</div>
```

### Three-Column Stats
```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div class="text-center p-4 bg-gray-50 rounded-lg">
    <div class="text-3xl font-bold {color}">{Value}</div>
    <div class="text-sm text-gray-600 mt-1">{Label}</div>
  </div>
  <!-- Repeat for other stats -->
</div>
```

## Dialogs Updated

### Completed ✅
1. **create-credit-account.dialog.ts** - Form dialog
2. **supplier-details.dialog.ts** - Details view dialog
3. **purchase-order-details.dialog.ts** - Details view dialog
4. **product-details.dialog.ts** - Reference implementation

### Pending (Following Same Pattern)
5. create-user.dialog.ts
6. edit-product.dialog.ts
7. create-product.dialog.ts
8. create-supplier.dialog.ts
9. edit-supplier.dialog.ts
10. create-branch.dialog.ts
11. Inventory dialogs (create, transfer, adjust, alerts)

## Implementation Checklist

For each dialog, ensure:
- [ ] Container has `h-[min(92vh,800px)] overflow-y-auto`
- [ ] Header includes gradient bar, title, and subtitle
- [ ] Content wrapped in `p-5 pt-3 space-y-6`
- [ ] Sections use white cards with shadows
- [ ] Section headers have icons in brand-sky
- [ ] Labels use consistent gray-600 small text
- [ ] Buttons use consistent padding (!py-2.5)
- [ ] Gradient header cards for main subject (details views)
- [ ] Status chips use consistent color mapping
- [ ] Grid layouts responsive (cols-1 on mobile, cols-2/3 on desktop)

## Example Files

Reference these files for implementation examples:
- **Details View**: `/web/src/app/features/products/product-details.dialog.ts`
- **Form Dialog**: `/web/src/app/features/credit/create-credit-account.dialog.ts`
- **Complex Details**: `/web/src/app/features/purchase-orders/purchase-order-details.dialog.ts`









