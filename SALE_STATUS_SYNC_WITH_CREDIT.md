# Sale Status Synchronization with Credit Accounts

## Overview
This document explains how sale statuses are automatically synchronized with credit account payment status to maintain data consistency.

---

## Sale Status Lifecycle for Credit Sales

```
Sale Created (isCreditSale = true)
        ↓
  Status: COMPLETED
        ↓
Credit Account Created
        ↓
    ┌──────────────┬────────────────┐
    ↓              ↓                ↓
Full Payment   Partial Payment   No Payment
    ↓              ↓                ↓
COMPLETED       PENDING          PENDING
(stays)       (updated)        (updated)
    ↓              ↓                ↓
                [Customer Makes Payments]
                        ↓
                 All Payments Complete
                        ↓
                    COMPLETED
                   (auto-updated)
```

---

## Implementation Details

### 1. On Credit Account Creation (`createCreditAccount`)

**Location:** `CreditService.kt` lines 159-176

**Logic:**
```kotlin
// Update sale status based on payment status
if (sale.status == SaleStatus.COMPLETED) {
    val newSaleStatus = when {
        // If fully paid upfront, keep sale as COMPLETED
        paidAmount.compareTo(request.totalAmount) >= 0 -> SaleStatus.COMPLETED
        // If partially paid or no payment, set to PENDING (awaiting full payment)
        else -> SaleStatus.PENDING
    }
    
    if (newSaleStatus != sale.status) {
        saleRepository.save(sale.copy(
            status = newSaleStatus,
            updatedAt = OffsetDateTime.now()
        ))
    }
}
```

**Scenarios:**

| Upfront Payment | Sale Status After Credit Creation |
|----------------|----------------------------------|
| KES 0 (none) | PENDING |
| KES 200 (partial of KES 600) | PENDING |
| KES 600 (full) | COMPLETED |

---

### 2. On Payment Recording (`makePayment`)

**Location:** `CreditService.kt` lines 253-265

**Logic:**
```kotlin
// Update the associated sale record when credit account is fully paid
if (updatedStatus == CreditStatus.PAID && creditAccount.status != CreditStatus.PAID) {
    // Credit account just became fully paid - update the sale status
    val sale = creditAccount.sale
    val updatedSale = sale.copy(
        status = SaleStatus.COMPLETED,  // Mark sale as completed when fully paid
        updatedAt = OffsetDateTime.now()
    )
    saleRepository.save(updatedSale)
    
    println("INFO: Updated sale ${sale.saleNumber} status to COMPLETED after credit account fully paid")
}
```

**Trigger:** Credit account status changes from ACTIVE/OVERDUE to PAID

**Effect:** Sale status updated from PENDING to COMPLETED

---

## Complete Example Flow

### Scenario: Zero Payment → Multiple Partial Payments → Fully Paid

#### Step 1: Create Sale (Zero Payment)
```
Sale Created:
  - saleNumber: SAL00001234
  - totalAmount: 600
  - payments: []
  - isCreditSale: true
  - status: COMPLETED  ← Initially
```

#### Step 2: Create Credit Account (No Upfront Payment)
```
Credit Account Created:
  - creditNumber: CR-71B7-000001
  - totalAmount: 600
  - paidAmount: 0
  - remainingAmount: 600
  - status: ACTIVE

Sale Updated:
  - saleNumber: SAL00001234
  - status: PENDING  ← Updated from COMPLETED
  - updatedAt: [timestamp]
```

#### Step 3: First Partial Payment (KES 200)
```
Payment Created:
  - paymentNumber: PAY-1728728881000-A1B2C3D4
  - amount: 200
  - paymentMethod: CASH

Credit Account Updated:
  - paidAmount: 200
  - remainingAmount: 400
  - status: ACTIVE  ← Still active

Sale Status:
  - status: PENDING  ← Unchanged (not fully paid)
```

#### Step 4: Second Partial Payment (KES 150)
```
Payment Created:
  - paymentNumber: PAY-1728729000000-E5F6G7H8
  - amount: 150

Credit Account Updated:
  - paidAmount: 350
  - remainingAmount: 250
  - status: ACTIVE  ← Still active

Sale Status:
  - status: PENDING  ← Unchanged (not fully paid)
```

#### Step 5: Final Payment (KES 250)
```
Payment Created:
  - paymentNumber: PAY-1728729200000-I9J0K1L2
  - amount: 250

Credit Account Updated:
  - paidAmount: 600
  - remainingAmount: 0
  - status: PAID  ← Changed to PAID
  - closedAt: [timestamp]

Sale Updated:
  - saleNumber: SAL00001234
  - status: COMPLETED  ← Updated from PENDING
  - updatedAt: [timestamp]

💡 Sale automatically marked as COMPLETED when credit fully paid!
```

---

## Sale Status Meanings

### PENDING
- **Used for:** Credit sales with outstanding balance
- **Meaning:** Transaction is completed but payment is not fully received
- **Transitions to:** COMPLETED (when fully paid), CANCELLED (if cancelled)

### COMPLETED
- **Used for:** Fully paid sales
- **Meaning:** Transaction is completed and payment is fully received
- **For credit sales:** 
  - Initially COMPLETED if paid upfront in full
  - Changes to PENDING if credit account created with partial/no payment
  - Changes back to COMPLETED when credit account fully paid

### Other Statuses
- **CANCELLED:** Sale was cancelled
- **SUSPENDED:** Sale is suspended (rare for credit sales)
- **REFUNDED:** Sale has been refunded

---

## Data Consistency Rules

### Rule 1: Transactional Integrity
All credit account and sale updates occur in the **same transaction**:
```kotlin
@Transactional
fun makePayment(request: CreateCreditPaymentRequest): CreditPaymentDto {
    // ... create payment ...
    creditAccountRepository.save(updatedCreditAccount)
    // ... update sale ...
    saleRepository.save(updatedSale)
    // Both committed together or rolled back together
}
```

### Rule 2: Idempotency
Sale status is only updated when necessary:
```kotlin
if (updatedStatus == CreditStatus.PAID && creditAccount.status != CreditStatus.PAID) {
    // Only update if status actually changed
    // Prevents duplicate updates on retry
}
```

### Rule 3: Audit Trail
All updates include timestamps:
```kotlin
val updatedSale = sale.copy(
    status = SaleStatus.COMPLETED,
    updatedAt = OffsetDateTime.now()  // Audit timestamp
)
```

---

## Benefits of Sale Status Sync

### 1. **Data Consistency**
- Sale records accurately reflect payment status
- No manual reconciliation needed
- Single source of truth maintained

### 2. **Reporting Accuracy**
- Sales reports show accurate pending vs. completed counts
- Revenue recognition aligns with payment status
- Audit trails are complete

### 3. **User Experience**
- Sales list clearly shows which sales are awaiting payment
- Dashboard metrics are accurate
- Status filtering works correctly

### 4. **Business Intelligence**
- Track conversion rate from PENDING to COMPLETED
- Monitor payment collection efficiency
- Identify slow-paying customers

---

## Query Examples

### Get all pending credit sales:
```sql
SELECT s.* 
FROM sales s
WHERE s.is_credit_sale = true 
  AND s.status = 'PENDING'
  AND s.tenant_id = ?
```

### Get sales that became fully paid today:
```sql
SELECT s.* 
FROM sales s
WHERE s.is_credit_sale = true 
  AND s.status = 'COMPLETED'
  AND DATE(s.updated_at) = CURRENT_DATE
  AND s.tenant_id = ?
```

### Get credit sales with their payment status:
```sql
SELECT 
    s.sale_number,
    s.customer_name,
    s.total_amount,
    s.status as sale_status,
    ca.credit_number,
    ca.paid_amount,
    ca.remaining_amount,
    ca.status as credit_status
FROM sales s
JOIN credit_accounts ca ON ca.sale_id = s.id
WHERE s.tenant_id = ?
ORDER BY s.created_at DESC
```

---

## Status Transition Matrix

| Event | Sale Status Before | Credit Status Before | Sale Status After | Credit Status After |
|-------|-------------------|---------------------|------------------|-------------------|
| Create credit (no pay) | COMPLETED | - | **PENDING** | ACTIVE |
| Create credit (partial) | COMPLETED | - | **PENDING** | ACTIVE |
| Create credit (full) | COMPLETED | - | COMPLETED | PAID |
| Make partial payment | PENDING | ACTIVE | PENDING | ACTIVE |
| Make final payment | PENDING | ACTIVE | **COMPLETED** | **PAID** |
| Account goes overdue | PENDING | ACTIVE | PENDING | OVERDUE |
| Pay overdue account (partial) | PENDING | OVERDUE | PENDING | OVERDUE |
| Pay overdue account (full) | PENDING | OVERDUE | **COMPLETED** | **PAID** |

---

## Technical Implementation

### Transactional Boundary
```kotlin
@Transactional
fun makePayment(request: CreateCreditPaymentRequest): CreditPaymentDto {
    // 1. Validate
    // 2. Create payment record
    // 3. Update credit account
    // 4. Update sale status (if fully paid)
    // All in single transaction - atomic operation
}
```

### Error Handling
```kotlin
try {
    // ... payment processing ...
    
    // Update credit account
    creditAccountRepository.save(updatedCreditAccount)
    
    // Update sale if needed
    if (updatedStatus == CreditStatus.PAID) {
        saleRepository.save(updatedSale)
    }
    
    return savedPayment.toDto()
} catch (e: Exception) {
    // Transaction automatically rolled back
    // Both credit account and sale remain unchanged
    throw e
}
```

---

## Monitoring and Logging

### Log Messages
```
INFO: Updated sale SAL00001234 status to PENDING after credit account creation
INFO: Updated sale SAL00001234 status to COMPLETED after credit account fully paid
```

### What to Monitor
- Sales with status PENDING for extended periods (may indicate collection issues)
- Mismatches between sale status and credit account status (should not occur)
- Frequent status transitions (may indicate system issues)

---

## API Impact

### GET /api/v1/sales
Now returns accurate status reflecting payment state:
```json
{
  "sales": [
    {
      "id": "...",
      "saleNumber": "SAL00001234",
      "status": "PENDING",  // ← Reflects unpaid credit
      "isCreditSale": true,
      "totalAmount": 600,
      "createdAt": "...",
      "updatedAt": "..."  // ← Updated when status changed
    }
  ]
}
```

### GET /api/v1/credit/accounts/{id}
Shows synchronized data:
```json
{
  "id": "...",
  "creditNumber": "CR-71B7-000001",
  "sale": {
    "id": "...",
    "saleNumber": "SAL00001234",
    "status": "PENDING"  // ← Matches credit account state
  },
  "status": "ACTIVE",
  "paidAmount": 200,
  "remainingAmount": 400
}
```

---

## Testing Checklist

### ✅ Create Credit Account (Zero Payment)
- [x] Sale status changes from COMPLETED to PENDING
- [x] Sale updatedAt timestamp set
- [x] Transaction is atomic

### ✅ Create Credit Account (Partial Payment)
- [x] Sale status changes from COMPLETED to PENDING
- [x] Sale updatedAt timestamp set

### ✅ Create Credit Account (Full Payment)
- [x] Sale status remains COMPLETED
- [x] Credit account status = PAID
- [x] Sale status unchanged (already COMPLETED)

### ✅ Make Partial Payment
- [x] Credit account updated
- [x] Sale status remains PENDING
- [x] No sale update (not fully paid yet)

### ✅ Make Final Payment (Complete)
- [x] Credit account status changes to PAID
- [x] Sale status changes to COMPLETED
- [x] Both updated in same transaction
- [x] Sale updatedAt timestamp set
- [x] Log message printed

### ✅ Error Handling
- [x] If sale update fails, entire transaction rolls back
- [x] Credit account and sale remain in sync
- [x] No partial updates

---

## Benefits

### 1. **Automatic Synchronization**
- No manual status updates needed
- Reduces human error
- Real-time accuracy

### 2. **Data Integrity**
- Sale status always reflects payment status
- Transactional updates prevent inconsistencies
- Audit trail preserved

### 3. **Business Insights**
- Accurate pending sales count
- True revenue recognition
- Payment collection tracking

### 4. **Operational Efficiency**
- No reconciliation needed
- Status queries are reliable
- Reporting is simplified

---

## Backend Data Consistency Rule Compliance

This implementation follows the Backend Data Consistency Rule by:

✅ **Transactional Integrity:** All updates in single `@Transactional` method  
✅ **Atomicity:** Sale and credit account updated together or not at all  
✅ **Audit Logging:** All status changes include timestamps  
✅ **Consistency:** Related entities updated in same transaction  
✅ **Error Handling:** Transaction rollback on failure  
✅ **Idempotency:** Status only updated when it actually changes  

---

## Code Documentation

### CreditService.createCreditAccount()
```kotlin
/**
 * Creates a new credit account from a sale transaction.
 *
 * This method implements the Backend Data Consistency Rule by:
 * - Using @Transactional to ensure atomicity
 * - Updating both credit account AND sale status in same transaction
 * - Setting sale to PENDING if payment is not complete
 * - Maintaining data consistency across related entities
 * - Logging all status transitions for audit trail
 *
 * Sale Status Logic:
 * - Full upfront payment → Sale remains COMPLETED
 * - Partial or no payment → Sale changes to PENDING
 * 
 * @param request The credit account creation request
 * @return Created credit account details
 */
```

### CreditService.makePayment()
```kotlin
/**
 * Records a payment against a credit account.
 *
 * This method implements the Backend Data Consistency Rule by:
 * - Using @Transactional to ensure atomicity
 * - Updating credit account balance and status
 * - Automatically updating sale status when fully paid
 * - All updates in single transaction (atomic operation)
 * - Complete audit trail for all payment mutations
 *
 * Sale Status Logic:
 * - When credit status changes to PAID → Sale status changes to COMPLETED
 * - Sale updatedAt timestamp set for audit trail
 * - Updates only if status actually changes (idempotency)
 * 
 * @param request The payment creation request
 * @return Created payment details
 */
```

---

## Related Documentation

- `CREDIT_SALES_FLOW.md` - Complete credit sales workflow
- `ALL_ERRORS_FIXED.md` - All error fixes applied
- `SALE_STATUS_SYNC_WITH_CREDIT.md` - This document

---

**Status:** ✅ **IMPLEMENTED AND TESTED**  
**Date:** October 12, 2025  
**Impact:** Sale status automatically reflects credit payment status









