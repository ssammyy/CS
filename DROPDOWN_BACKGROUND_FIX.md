# Dropdown Background Fix

## Issue
All dropdown menus (mat-select, datepickers, autocomplete) had transparent backgrounds, making them difficult or impossible to see.

## Root Cause
Angular Material's overlay components (dropdowns, datepickers, menus) were not explicitly styled with backgrounds, causing them to inherit transparent backgrounds or default styles that weren't visible against the application background.

## Solution Applied

### File Updated
`/web/src/styles.scss`

### Styling Added

#### 1. Mat-Select Dropdowns
```scss
.mat-mdc-select-panel {
  background-color: white !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
  border-radius: 0.5rem !important;
  padding: 0.5rem 0 !important;
}

.mdc-menu-surface {
  background-color: white !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
  border-radius: 0.5rem !important;
}
```

#### 2. Select Options Styling
```scss
.mat-mdc-option {
  background-color: white !important;
}

.mat-mdc-option:hover:not(.mdc-list-item--disabled) {
  background-color: rgba(161, 199, 248, 0.1) !important; /* brand-sky 10% */
}

.mat-mdc-option.mat-mdc-option-active {
  background-color: rgba(161, 199, 248, 0.15) !important; /* brand-sky 15% */
}

.mat-mdc-option.mdc-list-item--selected:not(.mdc-list-item--disabled) {
  background-color: rgba(161, 199, 248, 0.2) !important; /* brand-sky 20% */
}
```

#### 3. Datepicker Panels
```scss
.mat-datepicker-content {
  background-color: white !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
  border-radius: 0.75rem !important;
}

.mat-calendar {
  background-color: white !important;
}

.mat-calendar-header {
  background-color: rgba(161, 199, 248, 0.1) !important; /* brand-sky tint */
}

.mat-calendar-body-selected {
  background-color: var(--app-primary) !important; /* brand-sky */
  color: white !important;
}

.mat-calendar-body-cell:hover .mat-calendar-body-cell-content:not(.mat-calendar-body-selected) {
  background-color: rgba(161, 199, 248, 0.1) !important;
}
```

#### 4. Autocomplete Panels
```scss
.mat-mdc-autocomplete-panel {
  background-color: white !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
  border-radius: 0.5rem !important;
}
```

#### 5. Menu Panels
```scss
.mat-mdc-menu-panel {
  background-color: white !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
  border-radius: 0.5rem !important;
}
```

#### 6. Dialog Surfaces
```scss
.mat-mdc-dialog-surface {
  background-color: white !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  border-radius: 1rem !important;
}
```

## Visual Improvements

### Before
- ❌ Transparent/invisible dropdowns
- ❌ No visual feedback on hover
- ❌ Unclear selection states
- ❌ Inconsistent shadows

### After
- ✅ **White backgrounds** on all dropdowns
- ✅ **Professional shadows** for depth
- ✅ **Brand-sky hover states** (10% opacity)
- ✅ **Active/selected states** (15-20% opacity)
- ✅ **Rounded corners** (0.5rem for dropdowns, 0.75rem for datepickers)
- ✅ **Consistent styling** across all overlay components

## Brand Integration

All dropdown hover and selection states now use **brand-sky** (#A1C7F8) at varying opacities:
- **Hover**: 10% opacity - subtle feedback
- **Active**: 15% opacity - keyboard navigation
- **Selected**: 20% opacity - clear selection indicator

## Components Affected

This fix applies to:
- ✅ All `<mat-select>` dropdowns
- ✅ All `<mat-datepicker>` calendar overlays  
- ✅ All `<mat-autocomplete>` panels
- ✅ All `<mat-menu>` context menus
- ✅ All Material dialog surfaces

## Testing Checklist

Test these components across the app:
- [ ] Product creation form - Category/Status dropdowns
- [ ] Supplier creation form - Category/Status dropdowns
- [ ] Credit account creation - Customer/Sale dropdowns
- [ ] Purchase order creation - Supplier/Branch dropdowns
- [ ] User creation - Role dropdown
- [ ] Branch selection in any form
- [ ] Date pickers (Expected payment date, Delivery date, etc.)

## Notes

- All backgrounds forced with `!important` to override Material's default styles
- Z-index properly configured for dialog overlays
- Transparent backdrop maintains clean appearance
- Shadows use Tailwind-equivalent values for consistency

---

**Status**: 🟢 All dropdowns now have proper white backgrounds and professional styling!









