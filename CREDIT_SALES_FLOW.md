# Credit Sales and Partial Payment Flow

## Overview
The system fully supports credit sales with initial partial payments and subsequent payment tracking. This document explains how credit sales are recorded and updated when customers make partial payments.

---

## Complete Credit Sale Workflow

### 1. Creating a Credit Sale at POS

**Location:** `web/src/app/features/sales/pos/pos.component.ts`

#### Step 1: User selects Credit Sale checkbox
- Line 1634-1648: `onCreditSaleToggle()` method
- Sets `isCreditSale` flag to true
- Shows credit form with:
  - Expected payment date (default: 30 days from now)
  - Credit notes field
  - Payment amount field (allows partial payment)

#### Step 2: User must select or create a customer
- Lines 992-1003: Credit validation requires a customer
- Customer search functionality (lines 1373-1414)
- Quick customer creation (lines 1555-1584)
- **Note:** Credit sales REQUIRE a customer - this is enforced

#### Step 3: User can enter partial payment
- Initial payment amount is entered in `paymentAmount` field
- System automatically calculates:
  - `remainingBalance` = `totalAmount` - `paymentAmount` (line 923)
  - Displayed in the UI

#### Step 4: Sale is processed
**Lines 1093-1228: `processSale()` method**

```typescript
// 1. Create sale with isCreditSale flag
const request: CreateSaleRequest = {
  branchId: currentBranch.id,
  lineItems,
  payments,
  customerName: this.customerName(),
  customerPhone: this.customerPhone(),
  notes: this.notes(),
  isCreditSale: this.isCreditSale()  // FLAG SET HERE
};

const sale = await this.salesService.createSale(request).toPromise();

// 2. If credit sale, create credit account
if (this.isCreditSale()) {
  const creditRequest: CreateCreditAccountRequest = {
    saleId: sale.id,
    customerId: customer.id,
    totalAmount: this.totalAmount(),
    expectedPaymentDate: this.expectedPaymentDate(),
    notes: this.creditNotes(),
    paidAmount: this.paymentAmount(),      // Initial payment
    remainingAmount: this.remainingBalance() // Outstanding balance
  };
  
  await this.creditService.createCreditAccount(creditRequest).toPromise();
}
```

---

### 2. Backend Processing

**Location:** `chemsys/src/main/kotlin/com/chemsys/service/CreditService.kt`

#### Credit Account Creation (Lines 63-162)

The backend `createCreditAccount()` method:

1. **Validates the request:**
   - Customer exists and belongs to tenant
   - Sale exists and belongs to tenant
   - Sale is not already on credit (idempotency check)
   - Payment amounts are valid:
     - `paidAmount >= 0`
     - `remainingAmount >= 0`
     - `paidAmount + remainingAmount = totalAmount`

2. **Creates credit account entity:**
```kotlin
val creditAccount = CreditAccount(
    creditNumber = generateCreditNumber(branch.id),
    tenant = customer.tenant,
    branch = branch,
    customer = customer,
    sale = sale,
    totalAmount = request.totalAmount,
    paidAmount = request.paidAmount,
    remainingAmount = request.remainingAmount,
    expectedPaymentDate = request.expectedPaymentDate,
    status = CreditStatus.ACTIVE,
    notes = request.notes,
    createdBy = currentUser,
    createdAt = OffsetDateTime.now()
)
```

3. **Records initial payment (if any):**
```kotlin
// If there's a partial payment upfront, create initial payment record
if (paidAmount > BigDecimal.ZERO) {
    val initialPayment = CreditPayment(
        creditAccount = savedCreditAccount,
        amount = paidAmount,
        paymentMethod = PaymentMethod.CASH,
        paymentDate = OffsetDateTime.now(),
        notes = "Initial partial payment",
        receivedBy = currentUser,
        referenceNumber = UUID.randomUUID().toString()
    )
    creditPaymentRepository.save(initialPayment)
}
```

4. **Updates sale status:**
   - Changes sale status to `PENDING` if it was `COMPLETED`

---

### 3. Recording Subsequent Partial Payments

**Location:** `web/src/app/features/credit/credit-management.component.ts`

#### Making Additional Payments (Lines 141-168)

Users can make subsequent payments through the Credit Management interface:

```typescript
makePayment(): void {
  const paymentData = {
    creditAccountId: this.selectedAccount.id,
    amount: this.paymentForm.value.amount,
    paymentMethod: this.paymentForm.value.paymentMethod,
    referenceNumber: this.paymentForm.value.referenceNumber,
    notes: this.paymentForm.value.notes
  };
  
  this.creditService.makePayment(paymentData).subscribe({
    next: () => {
      this.loadCreditAccounts(); // Refresh list
      this.resetForms();
    }
  });
}
```

**Validation:**
- Payment amount must be > 0
- Payment amount cannot exceed `remainingAmount`
- Credit account must be in ACTIVE or OVERDUE status (not PAID or CLOSED)

---

### 4. Backend Payment Processing

**Location:** `chemsys/src/main/kotlin/com/chemsys/service/CreditService.kt` (Lines 179-245)

The `makePayment()` method:

1. **Validates payment:**
```kotlin
if (request.amount <= BigDecimal.ZERO) {
    throw IllegalArgumentException("Payment amount must be positive")
}

if (request.amount > creditAccount.remainingAmount) {
    throw IllegalArgumentException("Payment amount exceeds outstanding balance")
}

if (creditAccount.status == CreditStatus.PAID || 
    creditAccount.status == CreditStatus.CLOSED) {
    throw IllegalArgumentException("Cannot record payment for closed account")
}
```

2. **Creates payment record:**
```kotlin
val creditPayment = CreditPayment(
    creditAccount = creditAccount,
    amount = request.amount,
    paymentMethod = request.paymentMethod,
    referenceNumber = request.referenceNumber,
    notes = request.notes,
    receivedBy = currentUser,
    paymentDate = OffsetDateTime.now()
)
creditPaymentRepository.save(creditPayment)
```

3. **Updates credit account balance:**
```kotlin
val newPaidAmount = creditAccount.paidAmount.add(request.amount)
val newRemainingAmount = creditAccount.remainingAmount.subtract(request.amount)

val updatedStatus = when {
    newRemainingAmount <= BigDecimal.ZERO -> CreditStatus.PAID
    newRemainingAmount > BigDecimal.ZERO && 
      creditAccount.expectedPaymentDate.isBefore(LocalDate.now()) -> CreditStatus.OVERDUE
    else -> CreditStatus.ACTIVE
}

val updatedCreditAccount = creditAccount.copy(
    paidAmount = newPaidAmount,
    remainingAmount = newRemainingAmount,
    status = updatedStatus,
    updatedAt = OffsetDateTime.now(),
    closedAt = if (updatedStatus == CreditStatus.PAID) OffsetDateTime.now() else null
)
creditAccountRepository.save(updatedCreditAccount)
```

**Automatic Status Updates:**
- `ACTIVE` → `PAID` when `remainingAmount` reaches zero
- `ACTIVE` → `OVERDUE` if payment date has passed and balance remains
- `OVERDUE` → `PAID` when fully paid
- Sets `closedAt` timestamp when status changes to `PAID`

---

## Data Consistency and Audit Trail

### Backend Data Consistency Rules

The implementation follows the **Backend Data Consistency Rule** by ensuring:

1. **Transactional Integrity:**
   - All operations use `@Transactional` annotation
   - Credit account and payment are saved in single transaction
   - Rollback on any error

2. **Idempotency:**
   - Checks for existing credit account before creating new one
   - Unique credit numbers generated per branch
   - Payment references are unique

3. **Audit Logging:**
   - All payments record:
     - Amount
     - Payment method
     - Reference number
     - Received by (user)
     - Payment date
     - Notes
   - Credit account tracks:
     - Created by (user)
     - Created at (timestamp)
     - Updated at (timestamp)
     - Closed at (timestamp, if paid)

4. **Consistency with Related Entities:**
   - Sale status updated when credit account created
   - Credit account status auto-updated on payment
   - All updates in same transaction

---

## Payment Status Lifecycle

```
Initial Credit Sale
        ↓
   ACTIVE (with initial partial payment)
        ↓
   [Customer makes payments]
        ↓
   ┌──────────────┬────────────────┐
   ↓              ↓                ↓
ACTIVE      OVERDUE           PAID
(ongoing)   (past due)     (fully paid)
   ↓              ↓                ↓
   └──────────────┴────────────────┘
                  ↓
              CLOSED
          (manually closed)
```

---

## User Interface Summary

### POS Component Features:
1. ✅ Credit sale checkbox toggle
2. ✅ Customer selection/creation (required for credit)
3. ✅ Partial payment input field
4. ✅ Automatic remaining balance calculation
5. ✅ Expected payment date picker
6. ✅ Credit notes field
7. ✅ Validation before processing
8. ✅ Success messages with payment details

### Credit Management Component Features:
1. ✅ View all credit accounts with filters
2. ✅ Filter by status (ACTIVE, PAID, OVERDUE, etc.)
3. ✅ Show overdue accounts only
4. ✅ Select account to make payment
5. ✅ Payment form with validation
6. ✅ Payment method selection
7. ✅ Reference number field
8. ✅ Payment progress indicator
9. ✅ Real-time status updates

---

## API Endpoints

### Credit Account Endpoints:
- `POST /api/v1/credit/accounts` - Create credit account
- `GET /api/v1/credit/accounts/{id}` - Get account details with payment history
- `GET /api/v1/credit/accounts` - List accounts with filters
- `PUT /api/v1/credit/accounts/{id}/status` - Update account status

### Payment Endpoints:
- `POST /api/v1/credit/payments` - Record a payment
- `GET /api/v1/customers/{id}/accounts` - Get customer's credit accounts

### Dashboard:
- `GET /api/v1/credit/dashboard` - Get credit statistics

---

## Example Scenarios

### Scenario 1: No Upfront Payment (Zero Payment)
1. User creates credit sale for KES 10,000
2. User enters payment of KES 0 (or leaves blank)
3. Credit account created with:
   - `totalAmount = 10,000`
   - `paidAmount = 0`
   - `remainingAmount = 10,000`
4. No initial payment record created (since amount is zero)
5. Status set to `ACTIVE`
6. Success message: "Credit sale created! Total credit amount: KES 10,000.00. No upfront payment received."

### Scenario 2: Full Upfront Payment
1. User creates credit sale for KES 10,000
2. User enters payment of KES 10,000
3. Credit account created with:
   - `totalAmount = 10,000`
   - `paidAmount = 10,000`
   - `remainingAmount = 0`
4. Initial payment of KES 10,000 recorded with note "Full upfront payment"
5. Status automatically set to `PAID`
6. Success message: "Credit sale completed! Full payment of KES 10,000.00 received. Account fully paid."

### Scenario 3: Partial Upfront Payment
1. User creates credit sale for KES 10,000
2. User enters payment of KES 3,000
3. Credit account created with:
   - `totalAmount = 10,000`
   - `paidAmount = 3,000`
   - `remainingAmount = 7,000`
4. Initial payment of KES 3,000 recorded with note "Initial partial payment"
5. Status set to `ACTIVE`
6. Success message: "Credit sale completed! Partial payment of KES 3,000.00 received. Remaining balance: KES 7,000.00"

### Scenario 4: Multiple Partial Payments
1. Credit account exists with:
   - `totalAmount = 10,000`
   - `paidAmount = 3,000`
   - `remainingAmount = 7,000`
2. Customer makes payment of KES 2,000
3. System updates:
   - `paidAmount = 5,000`
   - `remainingAmount = 5,000`
4. Status remains `ACTIVE`
5. Customer makes another payment of KES 5,000
6. System updates:
   - `paidAmount = 10,000`
   - `remainingAmount = 0`
7. Status automatically changes to `PAID`
8. `closedAt` timestamp set

### Scenario 5: Overdue Account
1. Credit account with `expectedPaymentDate = 2025-01-15`
2. Current date passes expected date
3. Remaining balance still > 0
4. Backend job (or next payment) updates status to `OVERDUE`
5. User makes payment
6. If fully paid → status changes to `PAID`
7. If partially paid → status remains `OVERDUE`

---

## Recent Updates (Zero-Payment Credit Sales)

### Issue Fixed
Previously, when creating a credit sale with **no upfront payment** (amount = 0), the system would send a payment record with amount = 0 to the backend, which violated the validation rule that payment amounts must be greater than 0.

### Solution Implemented

#### Frontend Changes (`pos.component.ts`):
1. **Smart Payment Array Construction:**
   - If `paymentAmount > 0`: Include payment in the request
   - If `paymentAmount = 0` and `isCreditSale = true`: Send empty payments array
   - If `paymentAmount = 0` and `isCreditSale = false`: Show error (regular sales require payment)

2. **Enhanced Validation:**
   - Credit sales now allow payment amounts from 0 to totalAmount
   - Regular sales still require full payment

3. **Default Payment Amount:**
   - When credit sale checkbox is checked: `paymentAmount` defaults to 0
   - When unchecked: `paymentAmount` resets to `totalAmount`

4. **Improved Success Messages:**
   - No payment: "Credit sale created! Total credit amount: KES X. No upfront payment received."
   - Partial payment: "Credit sale completed! Partial payment of KES X received. Remaining balance: KES Y"
   - Full payment: "Credit sale completed! Full payment of KES X received. Account fully paid."

#### Backend Changes:

**`SalesService.kt`:**
- Updated payment validation to allow empty payments array for credit sales
- Credit sales now support: no payment, partial payment, or full payment
- Regular sales still require payment matching total

**`CreditService.kt`:**
- `paidAmount` now defaults to `BigDecimal.ZERO` if not provided
- Improved validation with detailed error messages
- Only creates initial payment record if `paidAmount > 0`
- Differentiates between "Initial partial payment" and "Full upfront payment" in notes

---

## Key Features

✅ **Complete Credit Sale Support**
- Create credit sales with or without initial payment
- Track all payments with full audit trail
- Automatic status management

✅ **Partial Payment Handling**
- Record any partial payment amount
- Automatic balance calculation
- Payment history tracking

✅ **Customer Management**
- Required customer for credit sales
- Quick customer search
- Inline customer creation

✅ **Payment Flexibility**
- Multiple payment methods supported
- Reference numbers for traceability
- Notes for additional context

✅ **Status Automation**
- Auto-transition to PAID when fully paid
- Overdue detection
- Closed account protection

✅ **Data Consistency**
- Transactional operations
- Idempotency checks
- Complete audit trail
- Rollback on errors

---

## Currency Format

All amounts are displayed in **Kenyan Shillings (KES)** using the format:
```typescript
formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES'
  }).format(amount);
}
```

Example: KES 10,000.00

---

## Conclusion

The credit sales system is **fully operational** and supports:
1. ✅ Recording credit sales at POS
2. ✅ Initial partial payments
3. ✅ Subsequent partial payments
4. ✅ Automatic status updates
5. ✅ Complete audit trail
6. ✅ Customer tracking
7. ✅ Payment history
8. ✅ Overdue management

All backend services follow the Backend Data Consistency Rule with proper transaction handling, idempotency checks, and comprehensive audit logging.

