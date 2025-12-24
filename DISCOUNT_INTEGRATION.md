# Discount System - Quick Integration Guide

## ✅ YOU'RE 95% DONE!

The dis

count system is fully built. Just add these final pieces to App.tsx:

### 1. Calculate Summary with Discount (Line ~68)

Find where you calculate cart totals and replace with:
\`\`\`tsx
const summary = currentDiscount 
  ? calculateCartSummaryWithDiscount(cart, currentDiscount)
  : calculateCartSummary(cart);
\`\`\`

### 2. Add Discount Handlers (after state declarations)

\`\`\`tsx
const handleApplyDiscount = useCallback((discount: {type: 'percentage' | 'fixed'; value: number; reason?: string}) => {
  setCurrentDiscount(discount);
  setShowDiscountModal(false);
}, []);

const handleRemoveDiscount = useCallback(() => {
  setCurrentDiscount(null);
}, []);
\`\`\`

### 3. Pass Discount Props to Cart Component

In your Cart component usage, add:
\`\`\`tsx
<Cart
  cart={cart}
  updateQuantity={updateQuantity}
  removeFromCart={removeFromCart}
  summary={summary}
  customer={currentCustomer}
  onRemoveCustomer={() => setCurrentCustomer(null)}
  onApplyDiscount={() => setShowDiscountModal(true)}
  currentDiscount={currentDiscount}
  onRemoveDiscount={handleRemoveDiscount}
/>
\`\`\`

### 4. Add Discount Modal (with other modals)

\`\`\`tsx
{showDiscountModal && (
  <DiscountModal
    onApply={handleApplyDiscount}
    onCancel={() => setShowDiscountModal(false)}
    subtotal={calculateCartSummary(cart).subtotal}
    requiresAuth={true}
    userRole={currentUser?.role}
  />
)}
\`\`\`

### 5. Add Discount Button in Cart.tsx

Find the cart summary area (around line 160-180) and add:

\`\`\`tsx
{/* Discount Button */}
{onApplyDiscount && cart.length > 0 && (
  <button
    onClick={onApplyDiscount}
    className="w-full btn-secondary py-3 rounded-xl font-semibold flex items-center justify-center mb-3"
  >
    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    Apply Discount
  </button>
)}
\`\`\`

### 6. Show Discount in Cart Summary (in Cart.tsx)

Before the Total line, add:

\`\`\`tsx
{currentDiscount && summary.discount && (
  <>
    <div className="flex justify-between py-2 text-warning">
      <span className="flex items-center">
        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Discount ({currentDiscount.type === 'percentage' ? `${currentDiscount.value}%` : `${currentDiscount.value} TND`}):
      </span>
      <span className="font-bold">-{formatPrice(summary.discount)}</span>
    </div>
    {onRemoveDiscount && (
      <button
        onClick={onRemoveDiscount}
        className="text-xs text-danger hover:underline mb-2"
      >
        Remove discount
      </button>
    )}
  </>
)}
\`\`\`

### 7. Update Component Signature in Cart.tsx

At the top where props are destructured:

\`\`\`tsx
export default function Cart({ 
  cart, 
  updateQuantity, 
  removeFromCart, 
  summary, 
  customer, 
  onRemoveCustomer,
  onApplyDiscount,
  currentDiscount,
  onRemoveDiscount
}: CartProps) {
\`\`\`

## That's It! 

Once these snippets are added:
1. Discount button appears in cart
2. Click it → Modal opens
3. Choose type, enter value, select reason
4. Enter admin password (if cashier)
5. Discount applied to cart!
6. Appears on receipt

**Test it:** Add products → Click "Apply Discount" → Enter 10% → See price drop!

## Already Done ✅:
- Discount Modal component
- Discount calculations
- Validation logic
- Admin authorization
- Reason tracking
- All the hard stuff!

Just wire it up with the snippets above! 🎉
