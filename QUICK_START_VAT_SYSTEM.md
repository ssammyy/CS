# Quick Start: VAT System is Now Active

## 🚀 What Changed

Your pharmacy now has **automatic VAT calculation**. No more zero VAT in reports!

---

## How It Works Now

### Before You Make a Sale
The system checks:
```
1. Does your tenant have VAT enabled? (YES - by default)
2. What's your default VAT rate? (16% - by default for Kenya)
3. What's the product's tax classification? (STANDARD - by default)
4. What's your pricing mode? (EXCLUSIVE - prices don't include VAT)
```

### When You Create a Sale
```
For each product:
  Unit Price: KES100
  Quantity: 2
  Tax Rate: 16% (from tenant settings)

AUTOMATIC CALCULATION:
  Net Amount = 100 × 2 = KES200
  VAT = 200 × 16% = KES32
  Gross Total = 200 + 32 = KES232

STORED IN DATABASE:
  sale.subtotal = 200 (net)
  sale.taxAmount = 32 (VAT)
  sale.totalAmount = 232 (gross)
```

### VAT Report Now Shows
```
Output VAT = Sum of all VAT collected from sales
Input VAT = Sum of all VAT paid on purchases
Net VAT Payable = Output - Input
```

---

## What You Need to Do

### 1. Restart Backend
```bash
mvn spring-boot:run
```
This will:
- Apply new database columns
- Create tenant tax settings for all tenants
- Start automatic VAT calculation

### 2. Create a Test Sale
1. Go to POS
2. Add a product
3. Confirm quantity
4. Complete the sale

### 3. Check the VAT Report
1. Go to **Reports** → **VAT Report**
2. Select a date range
3. **You should now see non-zero VAT values!** ✅

---

## Customization (Optional)

### Change Default VAT Rate
1. Database direct:
```sql
UPDATE tenant_tax_settings
SET default_vat_rate = 18.00
WHERE tenant_id = 'your-tenant-id';
```

### Disable VAT (for testing)
```sql
UPDATE tenant_tax_settings
SET charge_vat = FALSE
WHERE tenant_id = 'your-tenant-id';
```

### Change Pricing Mode
```sql
-- If prices INCLUDE VAT already
UPDATE tenant_tax_settings
SET pricing_mode = 'INCLUSIVE'
WHERE tenant_id = 'your-tenant-id';

-- If prices EXCLUDE VAT (default)
UPDATE tenant_tax_settings
SET pricing_mode = 'EXCLUSIVE'
WHERE tenant_id = 'your-tenant-id';
```

### Set Product-Specific Tax Rate
```sql
UPDATE products
SET tax_rate = 0.00
WHERE id = 'product-id' AND name = 'Exempt Medicine';
```

---

## Tax Classifications

| Classification | Rate | Use Case | Input VAT |
|---|---|---|---|
| STANDARD | 16% (default) | Regular medicines | Recoverable |
| REDUCED | 8% (default) | Select items | Recoverable |
| ZERO | 0% | Essential medicines | Recoverable |
| EXEMPT | 0% | Certain services | NOT Recoverable |

---

## Database Changes

### Products Table
```sql
NEW COLUMN: tax_rate NUMERIC(5,2)
```

### New Table: tenant_tax_settings
```sql
- charge_vat (TRUE/FALSE)
- default_vat_rate (16.00)
- pricing_mode ('EXCLUSIVE' or 'INCLUSIVE')
```

---

## Example: VAT Report Now Works

### Before (Problem)
```
Output VAT:     KES0.00 ❌
Input VAT:      KES0.00 ❌
Net Payable:    KES0.00 ❌
```

### After (Fixed)
```
Output VAT:     KES5,200.00 ✅
Input VAT:      KES1,800.00 ✅
Net Payable:    KES3,400.00 ✅
```

---

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Database migrations applied (check for tenant_tax_settings table)
- [ ] Create a sale with a product
- [ ] Check sale in database shows VAT
- [ ] Go to VAT Report → see non-zero values
- [ ] Date range filtering works
- [ ] Branch filtering works

---

## Support

If VAT is still showing 0:
1. Restart backend: `mvn spring-boot:run`
2. Check database for tenant_tax_settings:
   ```sql
   SELECT * FROM tenant_tax_settings;
   ```
3. Ensure charge_vat = TRUE
4. Create a NEW sale (old sales won't recalculate)

---

## Next Phase: Frontend Admin UI

You can add a settings page for:
- Enable/disable VAT
- Set default VAT rate
- Choose pricing mode
- Set product-specific rates

But for now, the system works with defaults!

---

## You're All Set! 🎉

Your pharmacy now has **professional-grade VAT management**.

**No manual tax entry**
**Automatic calculations**
**Accurate reporting**
**Compliance-ready**

Ready to file VAT returns!
