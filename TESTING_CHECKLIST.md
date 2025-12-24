# ✅ PharmaBest POS - Complete Testing Checklist

## 🎯 Test Session: _______________
Date: _______________
Tester: _______________

---

## 📋 Pre-Test Setup

- [ ] Backend running (http://localhost:3000) ✅ CONFIRMED
- [ ] Frontend running (http://localhost:5173)
- [ ] Browser open
- [ ] Demo data loaded (25 medications ✅)

---

## 1️⃣ LOGIN & AUTHENTICATION

### Test Admin Login
- [ ] Open http://localhost:5173
- [ ] Enter: username: `admin` / password: `123`
- [ ] Click Login
- [ ] **Expected**: Welcome screen with "PharmaBest POS" header
- [ ] **Expected**: See admin name displayed
- [ ] **Expected**: See "Users" button (admin only)
- [ ] Status: ⬜ PASS ⬜ FAIL

### Test Cashier Login
- [ ] Logout
- [ ] Enter: username: `cashier` / password: `123`
- [ ] Click Login
- [ ] **Expected**: No "Users" button
- [ ] **Expected**: No "Products", "Expiry", "Reports" buttons
- [ ] Status: ⬜ PASS ⬜ FAIL

---

## 2️⃣ SHIFT MANAGEMENT

### Start Shift (As Cashier)
- [ ] Login as cashier
- [ ] **Expected**: Shift Start Modal appears
- [ ] Enter opening cash: `100.000` TND
- [ ] Click "Start Shift"
- [ ] **Expected**: Modal closes, can use POS
- [ ] **Expected**: See "End Shift" button in header
- [ ] Status: ⬜ PASS ⬜ FAIL

### End Shift
- [ ] Click "End Shift"
- [ ] Enter closing cash: `250.000` TND
- [ ] Add note: "Test shift"
- [ ] Click "End Shift"
- [ ] **Expected**: Success message
- [ ] **Expected**: Difference calculated
- [ ] Status: ⬜ PASS ⬜ FAIL

---

## 3️⃣ PRODUCT MANAGEMENT (Admin Only)

### View Products
- [ ] Login as admin
- [ ] Click "Products" button
- [ ] **Expected**: See 25+ medications
- [ ] **Expected**: See AMLODIPINE, DOLIPRANE, etc.
- [ ] Status: ⬜ PASS ⬜ FAIL

### Add Product
- [ ] Click "Add Product"
- [ ] Fill in:
  - Name: `TEST MEDICATION 500MG`
  - Barcode: `TEST123`
  - Public Price: `5.500`
  - Purchase Price: `4.000`
  - Stock: `100`
  - Expiry Date: (select 6 months from now)
- [ ] CNAM Section:
  - DCI: `TEST ACTIVE`
  - Remboursable: Yes
  - Taux: 85%
- [ ] Click "Create Product"
- [ ] **Expected**: Product created, appears in list
- [ ] Status: ⬜ PASS ⬜ FAIL

### Edit Product
- [ ] Click Edit on TEST MEDICATION
- [ ] Change price to: `6.000`
- [ ] Change stock to: `150`
- [ ] Click "Update Product"
- [ ] **Expected**: Changes saved
- [ ] Status: ⬜ PASS ⬜ FAIL

---

## 4️⃣ QUICK STOCK ADDITION ⭐ NEW FEATURE

### Add Stock with Barcode
- [ ] Click "+ Stock" button (blue, glowing)
- [ ] **Expected**: Quick Stock Add modal opens
- [ ] Enter barcode: `12345` (DOLIPRANE)
- [ ] Press Enter
- [ ] **Expected**: Product displays with current stock
- [ ] See current stock number
- [ ] Adjust quantity to: `10`
- [ ] Click "Add 10 Units" (or press Enter)
- [ ] **Expected**: Success message "✓ Added 10 units..."
- [ ] **Expected**: Focus returns to barcode field
- [ ] Status: ⬜ PASS ⬜ FAIL

### Multiple Products Rapid Entry
- [ ] Still in Quick Stock modal
- [ ] Scan/Enter: `12346` (AMOXIL) → Qty: 20 → Enter
- [ ] Scan/Enter: `12347` (AUGMENTIN) → Qty: 15 → Enter
- [ ] **Expected**: See recent additions list
- [ ] **Expected**: Fast workflow, no clicking
- [ ] Status: ⬜ PASS ⬜ FAIL

---

## 5️⃣ STOCK ADJUSTMENTS

### Manual Stock Adjustment
- [ ] Go to Products → Edit any product
- [ ] Click "Adjust Stock" icon
- [ ] Quantity: `+25`
- [ ] Reason: `Reception`
- [ ] Notes: `LOT-A123 / Exp: 31/12/2025`
- [ ] Click "Adjust Stock"
- [ ] **Expected**: Stock updated
- [ ] **Expected**: Note saved with batch info
- [ ] Status: ⬜ PASS ⬜ FAIL

---

## 6️⃣ SALES / POS

### Make a Sale
- [ ] Start new shift if needed
- [ ] Search product: `DOLIPRANE`
- [ ] **Expected**: Product appears in search
- [ ] Click product to add to cart
- [ ] **Expected**: Item in cart, quantity 1
- [ ] Increase quantity to 3
- [ ] **Expected**: Total updates
- [ ] Add another product: `AMOXIL`
- [ ] Status: ⬜ PASS ⬜ FAIL

### Apply Discount
- [ ] Click "Discount" button
- [ ] Apply: 10% discount
- [ ] **Expected**: Total reduced by 10%
- [ ] Status: ⬜ PASS ⬜ FAIL

### Complete Sale - Cash
- [ ] Click "Cash" payment
- [ ] **Expected**: Payment modal
- [ ] Amount received: `20.000`
- [ ] Click "Confirm Payment"
- [ ] **Expected**: Receipt printed
- [ ] **Expected**: Cart clears
- [ ] **Expected**: Stock decremented
- [ ] Status: ⬜ PASS ⬜ FAIL

### Sale with Customer
- [ ] Add products to cart
- [ ] Click "Customer" button
- [ ] Enter name: `Test Customer`
- [ ] Phone: `98765432`
- [ ] Click "Save"
- [ ] Complete sale
- [ ] **Expected**: Customer name on receipt
- [ ] Status: ⬜ PASS ⬜ FAIL

---

## 7️⃣ USER MANAGEMENT (Admin Only) ⭐ NEW FEATURE

### View Users
- [ ] Login as admin
- [ ] Click "Users" button
- [ ] **Expected**: See user list (admin, cashier)
- [ ] Status: ⬜ PASS ⬜ FAIL

### Add New User
- [ ] Click "Add User"
- [ ] Fill in:
  - Name: `Test Cashier 2`
  - Username: `cashier2`
  - Password: `test123`
  - Role: Cashier
- [ ] Click "Create User"
- [ ] **Expected**: User created
- [ ] Status: ⬜ PASS ⬜ FAIL

### Edit User
- [ ] Edit cashier2
- [ ] Change name to: `Updated Cashier`
- [ ] Click "Update User"
- [ ] **Expected**: Changes saved
- [ ] Status: ⬜ PASS ⬜ FAIL

### Delete User
- [ ] Try to delete yourself (admin)
- [ ] **Expected**: Error "Cannot delete your own account"
- [ ] Delete Test Cashier 2
- [ ] Confirm deletion
- [ ] **Expected**: User removed
- [ ] Status: ⬜ PASS ⬜ FAIL

---

## 8️⃣ SALES HISTORY

### View Sales History
- [ ] Click "History" button
- [ ] **Expected**: See all sales made
- [ ] **Expected**: Admin sees ALL sales
- [ ] **Expected**: Each sale shows:
  - Sale ID, date/time
  - Total amount
  - Payment method
  - **Cashier name** ⭐ NEW
  - Customer (if added)
- [ ] Status: ⬜ PASS ⬜ FAIL

### Test Cashier Filter
- [ ] Logout → Login as cashier
- [ ] Click "History"
- [ ] **Expected**: Title "My Sales History"
- [ ] **Expected**: Only see YOUR sales
- [ ] Status: ⬜ PASS ⬜ FAIL

### Print Receipt
- [ ] Click on a sale
- [ ] Click "Print Receipt"
- [ ] **Expected**: Receipt preview/print
- [ ] **Expected**: Shows cashier name
- [ ] Status: ⬜ PASS ⬜ FAIL

---

## 9️⃣ DAILY SUMMARY

### View Summary (Cashier)
- [ ] As cashier, click "Summary"
- [ ] **Expected**: Title "My Daily Summary"
- [ ] **Expected**: Stats for YOUR sales only
- [ ] **Expected**: See total sales, revenue, avg
- [ ] Status: ⬜ PASS ⬜ FAIL

### View Summary (Admin)
- [ ] As admin, click "Summary"
- [ ] **Expected**: Title "Daily Summary"
- [ ] **Expected**: Stats for ALL sales
- [ ] **Expected**: Higher numbers than cashier view
- [ ] Status: ⬜ PASS ⬜ FAIL

---

## 🔟 ALERTS & REPORTS

### Low Stock Alerts
- [ ] Click "Stock Alerts"
- [ ] **Expected**: Products with low stock
- [ ] **Expected**: Color-coded warnings
- [ ] Status: ⬜ PASS ⬜ FAIL

### Expiry Alerts (Admin Only)
- [ ] As admin, click "Expiry"
- [ ] **Expected**: Products expiring soon
- [ ] **Expected**: Days until expiry shown
- [ ] Status: ⬜ PASS ⬜ FAIL

### Sales Reports (Admin Only)
- [ ] Click "Reports"
- [ ] Select date range: Last 7 days
- [ ] Click "Generate Report"
- [ ] **Expected**: Sales statistics
- [ ] **Expected**: Top products
- [ ] **Expected**: Charts/graphs
- [ ] Status: ⬜ PASS ⬜ FAIL

---

## 1️⃣1️⃣ SPECIAL FEATURES

### Barcode Scanner
- [ ] If you have a barcode scanner:
  - [ ] Scan product in POS
  - [ ] **Expected**: Product added to cart
  - [ ] Scan in Quick Stock
  - [ ] **Expected**: Product found
- [ ] Status: ⬜ PASS ⬜ FAIL ⬜ N/A

### Keyboard Shortcuts
- [ ] Try `F1` - New Sale
- [ ] Try `F2` - History
- [ ] Try `F3` - Products (if admin)
- [ ] **Expected**: Modal opens
- [ ] Status: ⬜ PASS ⬜ FAIL

### Multiple Expiry Dates (Manual Process)
- [ ] Edit TEST MEDICATION
- [ ] Note current expiry date
- [ ] Go to Stock Adjustment
- [ ] Add stock with note: `LOT-B / Exp: (future date)`
- [ ] **Expected**: Note saved for traceability
- [ ] Status: ⬜ PASS ⬜ FAIL

---

## 1️⃣2️⃣ CNAM FEATURES (Tunisia Specific)

### Product with CNAM
- [ ] View DOLIPRANE (85% reimbursement)
- [ ] **Expected**: See CNAM badge
- [ ] **Expected**: See reimbursement rate
- [ ] Status: ⬜ PASS ⬜ FAIL

### CNAM on Receipt
- [ ] Sell a product with CNAM
- [ ] View receipt
- [ ] **Expected**: Shows CNAM part & patient part
- [ ] Status: ⬜ PASS ⬜ FAIL

---

## 📊 TESTING SUMMARY

### Total Tests: 40+
- ✅ Passed: _____ / 40
- ❌ Failed: _____ / 40
- ⏭️ Skipped: _____ / 40

### Critical Issues Found:
1. _____________________
2. _____________________
3. _____________________

### Notes:
_____________________
_____________________
_____________________

---

## ✅ Sign-Off

Tested by: _______________
Date: _______________
Approved: ⬜ YES ⬜ NO

---

## 🎯 Quick Test (5 Minutes)

If short on time, test these essentials:

1. ✅ Login (admin & cashier)
2. ✅ Start Shift
3. ✅ Add Product
4. ✅ Quick Stock Add (new!)
5. ✅ Make Sale (cash)
6. ✅ View History (check cashier name shown)
7. ✅ View Summary (role-based filtering)
8. ✅ User Management (add/edit user)
9. ✅ End Shift

---

**Ready to test? Open http://localhost:5173 and let's go!** 🚀
