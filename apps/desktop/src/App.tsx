import { useState, useCallback } from 'react';
import type { Product } from '@repo/database';
import SearchBar from './components/SearchBar';
import Cart from './components/Cart';
import QuickActions from './components/QuickActions';
import SalesHistory from './components/SalesHistory';
import CustomerModal, { type CustomerInfo } from './components/CustomerModal';
import DailySummary from './components/DailySummary';
import LowStockAlerts from './components/LowStockAlerts';
import ProductManagement from './components/ProductManagement';
import ExpiryAlerts from './components/ExpiryAlerts';
import SalesReports from './components/SalesReports';
import DiscountModal from './components/DiscountModal';
import Login from './components/Login';
import ShiftStartModal from './components/ShiftStartModal';
import ShiftEndModal from './components/ShiftEndModal';
import UserManagement from './components/UserManagement';
import QuickStockAdd from './components/QuickStockAdd';
import CustomerManagement from './components/CustomerManagement';
import InvoiceManagement from './components/InvoiceManagement';
import InvoiceGenerator from './components/InvoiceGenerator';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { useCart } from './hooks/useCart';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { ProductService, SalesService, ShiftService } from './services/database.service';
import { calculateCartSummary, calculateCartSummaryWithDiscount } from './utils/calculations';
import { printThermalReceipt } from './utils/thermal-printer';
import type { PaymentMethod, SearchState, HeldTransaction } from './types';
import ResumeModal from './components/ResumeModal';
import {
  KEYBOARD_SHORTCUTS,
  MESSAGES,
  MAX_SEARCH_RESULTS,
  MIN_SEARCH_LENGTH,
  LOCALE,
  DATETIME_FORMAT,
} from './constants';

/**
 * Main Point of Sale Application Component
 */
function App() {
  // Cart management
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, replaceCart, validateStock } = useCart();

  // Search state
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    results: [],
    isLoading: false,
    error: null,
  });

  // Modal states
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [showLowStockAlerts, setShowLowStockAlerts] = useState(false);
  const [showProductManagement, setShowProductManagement] = useState(false);
  const [showExpiryAlerts, setShowExpiryAlerts] = useState(false);
  const [showSalesReports, setShowSalesReports] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [currentDiscount, setCurrentDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number; reason?: string } | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PaymentMethod | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<CustomerInfo | null>(null);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [showShiftStart, setShowShiftStart] = useState(false);
  const [showShiftEnd, setShowShiftEnd] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showQuickStockAdd, setShowQuickStockAdd] = useState(false);
  const [showCustomerManagement, setShowCustomerManagement] = useState(false);
  const [showInvoiceManagement, setShowInvoiceManagement] = useState(false);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);

  // Held Transactions
  const [heldTransactions, setHeldTransactions] = useState<HeldTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('held_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Calculate cart summary with discount
  const summary = currentDiscount
    ? calculateCartSummaryWithDiscount(cart, currentDiscount)
    : calculateCartSummary(cart);

  /**
   * Search for products by name or barcode
   */
  const searchProducts = useCallback(async (query: string): Promise<void> => {
    if (!query || query.length < MIN_SEARCH_LENGTH) {
      setSearchState((prev) => ({ ...prev, results: [], error: null }));
      return;
    }

    setSearchState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await ProductService.search(query, MAX_SEARCH_RESULTS);

      if (result.success) {
        setSearchState((prev) => ({
          ...prev,
          results: result.data,
          isLoading: false,
        }));
      } else {
        setSearchState((prev) => ({
          ...prev,
          results: [],
          isLoading: false,
          error: MESSAGES.SEARCH_ERROR,
        }));
      }
    } catch (error) {
      setSearchState((prev) => ({
        ...prev,
        results: [],
        isLoading: false,
        error: MESSAGES.SEARCH_ERROR,
      }));
    }
  }, []);

  /**
   * Handle product selection from search results
   */
  const handleSelectProduct = useCallback(
    (product: Product): void => {
      addToCart(product);
      setSearchState({
        query: '',
        results: [],
        isLoading: false,
        error: null,
      });
    },
    [addToCart]
  );

  /**
   * Update search query
   */
  const setSearchTerm = useCallback((term: string): void => {
    setSearchState((prev) => ({ ...prev, query: term }));
  }, []);

  /**
   * Handle discount apply
   */
  const handleApplyDiscount = useCallback((discount: { type: 'percentage' | 'fixed'; value: number; reason?: string }) => {
    setCurrentDiscount(discount);
    setShowDiscountModal(false);
  }, []);

  /**
   * Handle discount removal
   */
  const handleRemoveDiscount = useCallback(() => {
    setCurrentDiscount(null);
  }, []);

  /**
   * Process payment with validation
   */
  const processPayment = useCallback(
    async (paymentMethod: PaymentMethod): Promise<void> => {
      // Validate cart is not empty
      if (cart.length === 0) {
        alert(MESSAGES.EMPTY_CART);
        return;
      }

      // Validate stock availability
      const stockValidation = validateStock();
      if (!stockValidation.valid) {
        const errorMessages = stockValidation.errors
          .map(
            (err) =>
              `${err.productName}: ${MESSAGES.INSUFFICIENT_STOCK(err.available)}`
          )
          .join('\n');

        alert(`⚠️ Stock validation failed:\n\n${errorMessages}`);
        return;
      }

      try {
        const result = await SalesService.processPayment(
          cart,
          paymentMethod,
          summary.total,
          currentCustomer || undefined,
          currentUser?.id,
          currentShift?.id
        );

        if (result.success) {
          // Print receipt
          const { printReceipt } = await import('./utils/receipt');
          printReceipt({
            saleId: result.saleId!,
            timestamp: result.timestamp,
            items: cart,
            subtotal: summary.subtotal,
            vat: summary.vat,
            total: summary.total,
            paymentMethod,
            customer: currentCustomer || undefined,
          });

          // Auto-print thermal receipt
          printThermalReceipt({
            saleId: result.saleId!,
            timestamp: result.timestamp,
            items: cart,
            subtotal: summary.subtotal,
            vat: summary.vat,
            total: summary.total,
            paymentMethod,
            customer: currentCustomer || undefined,
            cashier: currentUser?.name,
          });

          clearCart();
          setCurrentCustomer(null);
          alert(MESSAGES.PAYMENT_SUCCESS(paymentMethod, `${summary.total.toFixed(2)} TND`));
        } else {
          console.error('Payment failed:', result);
          alert(`❌ Payment failed: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Payment error:', error);
        alert(`❌ ${MESSAGES.PAYMENT_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [cart, summary.total, summary.subtotal, summary.vat, validateStock, clearCart, currentCustomer, currentUser]
  );

  /**
   * Handle cash payment with optional customer
   */
  const handleCashPayment = useCallback(() => {
    setPendingPayment('cash');
    if (cart.length > 0) {
      setShowCustomerModal(true);
    }
  }, [cart.length]);

  /**
   * Handle card payment with optional customer
   */
  const handleCardPayment = useCallback(() => {
    setPendingPayment('card');
    if (cart.length > 0) {
      setShowCustomerModal(true);
    }
  }, [cart.length]);

  /**
   * Handle customer modal save
   */
  const handleCustomerSave = useCallback(
    (customer: CustomerInfo) => {
      setCurrentCustomer(customer);
      setShowCustomerModal(false);
      if (pendingPayment) {
        processPayment(pendingPayment);
        setPendingPayment(null);
      }
    },
    [pendingPayment, processPayment]
  );

  /**
   * Handle customer modal skip
   */
  const handleCustomerSkip = useCallback(() => {
    setShowCustomerModal(false);
    if (pendingPayment) {
      processPayment(pendingPayment);
      setPendingPayment(null);
    }
  }, [pendingPayment, processPayment]);

  /**
   * Handle clear cart
   */
  const handleClearCart = useCallback(() => {
    if (cart.length > 0) {
      const confirmed = confirm('Are you sure you want to clear the cart?');
      if (confirmed) {
        clearCart();
        setCurrentCustomer(null);
      }
    }
  }, [cart.length, clearCart]);

  /**
   * Clear search results
   */
  const handleClearSearch = useCallback(() => {
    setSearchState({
      query: '',
      results: [],
      isLoading: false,
      error: null,
    });
  }, []);

  // Hold Transaction Handler
  const handleHoldTransaction = useCallback(() => {
    if (cart.length === 0) return;

    if (!confirm('Hold current transaction?')) return;

    const transaction: HeldTransaction = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      cart: [...cart],
      customer: currentCustomer,
    };

    setHeldTransactions((prev) => {
      const updated = [transaction, ...prev];
      localStorage.setItem('held_transactions', JSON.stringify(updated));
      return updated;
    });

    clearCart();
    setCurrentCustomer(null);
  }, [cart, currentCustomer, clearCart]);

  // Resume Transaction Handler
  const handleRestoreTransaction = useCallback((transaction: HeldTransaction) => {
    if (cart.length > 0) {
      if (!confirm('Current cart is not empty. Overwrite with held transaction?')) {
        return;
      }
    }

    replaceCart(transaction.cart);
    setCurrentCustomer(transaction.customer || null);

    setHeldTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== transaction.id);
      localStorage.setItem('held_transactions', JSON.stringify(updated));
      return updated;
    });
    setShowResumeModal(false);
  }, [cart.length, replaceCart]);

  // Delete Held Transaction
  const handleDeleteHeldTransaction = useCallback((id: string) => {
    if (confirm('Delete this held transaction?')) {
      setHeldTransactions((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        localStorage.setItem('held_transactions', JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  // Authentication handlers
  const handleLoginSuccess = async (user: any) => {
    setCurrentUser(user);

    // Check for active shift
    const shiftResult = await ShiftService.getActiveShift(user.id);
    if (shiftResult.success && shiftResult.data) {
      setCurrentShift(shiftResult.data);
    } else {
      setShowShiftStart(true);
    }
  };

  const handleShiftStarted = (shift: any) => {
    setCurrentShift(shift);
    setShowShiftStart(false);
  };

  const handleShiftEnded = () => {
    setCurrentShift(null);
    setCurrentUser(null);
    setShowShiftEnd(false);
    clearCart();
    setCurrentCustomer(null);
  };

  const handleLogout = () => {
    if (currentShift) {
      if (!window.confirm('You have an active shift. Please end your shift before logging out.')) {
        return;
      }
      setShowShiftEnd(true);
    } else {
      setCurrentUser(null);
      clearCart();
      setCurrentCustomer(null);
    }
  };

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    [KEYBOARD_SHORTCUTS.CASH_PAYMENT]: handleCashPayment,
    [KEYBOARD_SHORTCUTS.CARD_PAYMENT]: handleCardPayment,
    [KEYBOARD_SHORTCUTS.CLEAR_CART]: handleClearCart,
    [KEYBOARD_SHORTCUTS.CANCEL]: handleClearSearch,
  });

  // Barcode scanner integration
  useBarcodeScanner({
    onScan: async (barcode) => {
      console.log('Barcode detected:', barcode);
      // Search for product by barcode
      const result = await ProductService.search(barcode, 1);
      if (result.success && result.data.length > 0) {
        const product = result.data[0];
        addToCart(product);
        // Show visual feedback
        alert(`✅ Added: ${product.commercial_name}`);
      } else {
        alert(`❌ Product not found: ${barcode}`);
      }
    },
  });

  // Show login if not authenticated
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen flex flex-col bg-dark-bg overflow-hidden">
      {/* Top Bar */}
      <header className="bg-dark-surface border-b border-dark-border shadow-lg">
        {/* Row 1: Logo and User Info */}
        <div className="px-6 py-3 border-b border-dark-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                PharmaBest POS
              </h1>
              <div className="h-6 w-px bg-dark-border" aria-hidden="true" />
              <span className="text-sm text-gray-400">Point of Sale System</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2 px-4 py-2 bg-dark-elevated rounded-lg border border-dark-border">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium text-gray-300">{currentUser?.name}</span>
                <span className="text-xs text-gray-500">({currentUser?.role})</span>
              </div>
              <time className="text-sm text-gray-400 whitespace-nowrap px-3">
                {new Date().toLocaleString(LOCALE, DATETIME_FORMAT)}
              </time>
            </div>
          </div>
        </div>

        {/* Row 2: Action Buttons */}
        <div className="px-6 py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Main Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {currentUser?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setShowProductManagement(true)}
                    className="btn-secondary px-4 py-2 rounded-lg flex items-center text-sm hover:scale-105 transition-transform"
                    title="Manage products"
                  >
                    <svg className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Products
                  </button>
                  <div className="h-6 w-px bg-dark-border/50" />
                </>
              )}

              <button
                onClick={() => setShowQuickStockAdd(true)}
                className="btn-primary px-4 py-2 rounded-lg flex items-center text-sm shadow-glow hover:scale-105 transition-transform"
                title="Quick stock addition"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                + Stock
              </button>

              <button
                onClick={() => setShowLowStockAlerts(true)}
                className="btn-secondary px-4 py-2 rounded-lg flex items-center text-sm hover:scale-105 transition-transform"
                title="Stock alerts"
              >
                <svg className="h-4 w-4 mr-2 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Alerts
              </button>

              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setShowExpiryAlerts(true)}
                  className="btn-secondary px-4 py-2 rounded-lg flex items-center text-sm hover:scale-105 transition-transform"
                  title="Expiry alerts"
                >
                  <svg className="h-4 w-4 mr-2 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Expiry
                </button>
              )}

              <div className="h-6 w-px bg-dark-border/50" />

              <button
                onClick={() => setShowSalesHistory(true)}
                className="btn-secondary px-4 py-2 rounded-lg flex items-center text-sm hover:scale-105 transition-transform"
                title="Sales history"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                History
              </button>

              <button
                onClick={() => setShowDailySummary(true)}
                className="btn-secondary px-4 py-2 rounded-lg flex items-center text-sm hover:scale-105 transition-transform"
                title="Daily summary"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Summary
              </button>

              {currentUser?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setShowSalesReports(true)}
                    className="btn-primary px-4 py-2 rounded-lg flex items-center text-sm shadow-glow hover:scale-105 transition-transform"
                    title="Sales reports"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Reports
                  </button>

                  <button
                    onClick={() => setShowAnalyticsDashboard(true)}
                    className="btn-primary px-4 py-2 rounded-lg flex items-center text-sm shadow-glow hover:scale-105 transition-transform"
                    title="Analytics Dashboard"
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    📊 Analytics
                  </button>

                  <div className="h-6 w-px bg-dark-border/50" />

                  <button
                    onClick={() => setShowCustomerManagement(true)}
                    className="btn-secondary px-4 py-2 rounded-lg flex items-center text-sm hover:scale-105 transition-transform"
                    title="Manage customers"
                  >
                    <svg className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Customers
                  </button>

                  <button
                    onClick={() => setShowInvoiceManagement(true)}
                    className="btn-primary px-4 py-2 rounded-lg flex items-center text-sm shadow-glow hover:scale-105 transition-transform"
                    title="Manage invoices"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Invoices
                  </button>
                </>
              )}
            </div>

            {/* Right: User & System Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setShowUserManagement(true)}
                  className="btn-secondary px-4 py-2 rounded-lg flex items-center text-sm hover:scale-105 transition-transform"
                  title="Manage users"
                >
                  <svg className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Users
                </button>
              )}

              {currentShift && (
                <button
                  onClick={() => setShowShiftEnd(true)}
                  className="btn-warning px-4 py-2 rounded-lg text-sm flex items-center hover:scale-105 transition-transform"
                  title="End shift"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  End Shift
                </button>
              )}

              <button
                onClick={handleLogout}
                className="btn-secondary px-4 py-2 rounded-lg text-sm flex items-center hover:scale-105 transition-transform"
                title="Logout"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <SearchBar
        searchTerm={searchState.query}
        setSearchTerm={setSearchTerm}
        searchProducts={searchProducts}
        searchResults={searchState.results}
        isSearching={searchState.isLoading}
        onSelectProduct={handleSelectProduct}
      />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Cart */}
        <section className="w-2/3 border-r border-dark-border flex flex-col" aria-label="Shopping Cart">
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
        </section>

        {/* Right Panel - Quick Actions */}
        <aside className="w-1/3 flex flex-col" aria-label="Quick Actions">
          <QuickActions
            summary={summary}
            onCashPayment={handleCashPayment}
            onCardPayment={handleCardPayment}
            onClearCart={handleClearCart}
            onHoldTransaction={handleHoldTransaction}
            onResumeTransaction={() => setShowResumeModal(true)}
            heldTransactionCount={heldTransactions.length}
            disabled={cart.length === 0}
          />
        </aside>
      </main>

      {/* Status Bar */}
      <footer className="bg-dark-surface border-t border-dark-border px-6 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-6">
            <span className="flex items-center" role="status" aria-live="polite">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" aria-hidden="true" />
              Database Connected
            </span>
            <span>{summary.itemCount} items in cart</span>
            {currentCustomer && (
              <span className="flex items-center text-primary">
                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {currentCustomer.name}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4 font-mono" role="status">
            <kbd className="px-2 py-1 bg-dark-elevated rounded">F1: Cash</kbd>
            <kbd className="px-2 py-1 bg-dark-elevated rounded">F2: Card</kbd>
            <kbd className="px-2 py-1 bg-dark-elevated rounded">F3: Clear</kbd>
            <kbd className="px-2 py-1 bg-dark-elevated rounded">ESC: Cancel</kbd>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showSalesHistory && (
        <SalesHistory onClose={() => setShowSalesHistory(false)} currentUser={currentUser} />
      )}

      {showCustomerModal && (
        <CustomerModal
          onSave={handleCustomerSave}
          onCancel={handleCustomerSkip}
        />
      )}

      {showDailySummary && (
        <DailySummary onClose={() => setShowDailySummary(false)} currentUser={currentUser} />
      )}

      {showLowStockAlerts && (
        <LowStockAlerts onClose={() => setShowLowStockAlerts(false)} />
      )}

      {showProductManagement && (
        <ProductManagement onClose={() => setShowProductManagement(false)} />
      )}

      {showExpiryAlerts && (
        <ExpiryAlerts onClose={() => setShowExpiryAlerts(false)} />
      )}

      {showSalesReports && (
        <SalesReports onClose={() => setShowSalesReports(false)} />
      )}

      {showDiscountModal && (
        <DiscountModal
          onApply={handleApplyDiscount}
          onCancel={() => setShowDiscountModal(false)}
          subtotal={calculateCartSummary(cart).subtotal}
          requiresAuth={true}
          userRole={currentUser?.role}
        />
      )}

      {showCustomerManagement && (
        <CustomerManagement onClose={() => setShowCustomerManagement(false)} />
      )}

      {showInvoiceManagement && (
        <InvoiceManagement
          onClose={() => setShowInvoiceManagement(false)}
          onNewInvoice={() => {
            setShowInvoiceManagement(false);
            setShowInvoiceGenerator(true);
          }}
        />
      )}

      {showInvoiceGenerator && currentUser && (
        <InvoiceGenerator
          onClose={() => setShowInvoiceGenerator(false)}
          userId={currentUser.id}
          onInvoiceCreated={(invoiceId) => {
            console.log('Invoice created:', invoiceId);
            setShowInvoiceGenerator(false);
            setShowInvoiceManagement(true);
          }}
        />
      )}

      {showResumeModal && (
        <ResumeModal
          heldTransactions={heldTransactions}
          onResume={handleRestoreTransaction}
          onDelete={handleDeleteHeldTransaction}
          onClose={() => setShowResumeModal(false)}
        />
      )}

      {showShiftStart && currentUser && (
        <ShiftStartModal
          user={currentUser}
          onShiftStarted={handleShiftStarted}
          onCancel={() => {
            if (window.confirm('You must start a shift to use the system. Logout?')) {
              setCurrentUser(null);
              setShowShiftStart(false);
            }
          }}
        />
      )}

      {showShiftEnd && currentShift && (
        <ShiftEndModal
          shift={currentShift}
          onShiftEnded={handleShiftEnded}
          onCancel={() => setShowShiftEnd(false)}
        />
      )}

      {showUserManagement && (
        <UserManagement
          onClose={() => setShowUserManagement(false)}
          currentUser={currentUser}
        />
      )}

      {showQuickStockAdd && (
        <QuickStockAdd
          onClose={() => setShowQuickStockAdd(false)}
          currentUserId={currentUser?.id || 1}
        />
      )}

      {showAnalyticsDashboard && (
        <AnalyticsDashboard onClose={() => setShowAnalyticsDashboard(false)} />
      )}
    </div>
  );
}

export default App;
