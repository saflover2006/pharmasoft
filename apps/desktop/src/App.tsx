import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLanguage } from './i18n/LanguageContext';
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
import AdminDashboard from './components/AdminDashboard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import PharmacyProfile from './components/PharmacyProfile';
import BackupManager from './components/BackupManager';
import AuditLogViewer from './components/AuditLogViewer';
import CloudBackupManager from './components/CloudBackupManager';
import LimitWarning from './components/LimitWarning';
import Dropdown, { DropdownItem, DropdownDivider } from './components/Dropdown';
import { useCart } from './hooks/useCart';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { useLicense } from './hooks/useLicense';
import { AuthService, ProductService, SalesService, ShiftService, PharmacyService, apiRequest } from './services/database.service';
import { calculateCartSummary, calculateCartSummaryWithDiscount } from './utils/calculations';
import { printThermalReceipt } from './utils/thermal-printer';
import type { AuthenticatedUser, PaymentMethod, SearchState, HeldTransaction, ShiftRecord } from './types';
import ResumeModal from './components/ResumeModal';
import TrialBanner from './components/TrialBanner';
import UpgradeModal from './components/UpgradeModal';
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
  const [pendingPayment, setPendingPayment] = useState<PaymentMethod | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<CustomerInfo | null>(null);
  const [currentDiscount, setCurrentDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number; reason?: string } | null>(null);

  // Language
  const { language, setLanguage, t } = useLanguage();

  // Authentication state
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [currentShift, setCurrentShift] = useState<ShiftRecord | null>(null);
  const [showShiftStart, setShowShiftStart] = useState(false);
  const [showShiftEnd, setShowShiftEnd] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showQuickStockAdd, setShowQuickStockAdd] = useState(false);
  const [showCustomerManagement, setShowCustomerManagement] = useState(false);
  const [showInvoiceManagement, setShowInvoiceManagement] = useState(false);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  const [showPharmacyProfile, setShowPharmacyProfile] = useState(false);
  const [showBackupManager, setShowBackupManager] = useState(false);
  const [showAuditLogViewer, setShowAuditLogViewer] = useState(false);
  const [showCloudBackupManager, setShowCloudBackupManager] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();
  const [upgradeCurrentLimit, setUpgradeCurrentLimit] = useState<{ current: number; max: number } | undefined>();
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // Trial Logic
  const trialDaysRemaining = useMemo(() => {
    if (!currentUser) return 0;
    // If has valid license, no banner
    if (currentUser.licenseKey && (currentUser.licenseKey.startsWith('PRO-') || currentUser.licenseKey.startsWith('PHARMA-'))) return 0;

    if (!currentUser.trialEndsAt) return 0;
    const end = new Date(currentUser.trialEndsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [currentUser]);

  const canStartProfessionalTrial = useMemo(() => {
    if (!currentUser) {
      return false;
    }

    return currentUser.subscriptionTier === 'free'
      && !currentUser.trialEndsAt
      && currentUser.licenseStatus !== 'active';
  }, [currentUser]);

  const isPlatformAdminSession = currentUser?.isPlatformAdmin === true;
  const { license, refresh: refreshLicense } = useLicense(!!currentUser && !isPlatformAdminSession);

  const salesLimit = useMemo(() => {
    if (!license || license.limits.sales.max <= 0) {
      return undefined;
    }

    return license.limits.sales;
  }, [license]);

  const hasLicensedFeatureAccess = useCallback((feature: 'advanced_reports' | 'analytics_dashboard' | 'cloud_backup') => {
    if (isPlatformAdminSession) {
      return true;
    }

    if (license) {
      return license.status === 'active' && license.features.includes(feature);
    }

    return currentUser?.licenseStatus === 'active'
      && currentUser.subscriptionTier !== 'free';
  }, [currentUser?.licenseStatus, currentUser?.subscriptionTier, isPlatformAdminSession, license]);

  const openUpgradePrompt = useCallback((options?: {
    feature?: string;
    currentLimit?: { current: number; max: number };
  }) => {
    setUpgradeFeature(options?.feature);
    setUpgradeCurrentLimit(options?.currentLimit);
    setShowUpgradeModal(true);
  }, []);

  const closeUpgradePrompt = useCallback(() => {
    setShowUpgradeModal(false);
    setUpgradeFeature(undefined);
    setUpgradeCurrentLimit(undefined);
  }, []);



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
    } catch {
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
    async (paymentMethod: PaymentMethod, customerOverride?: CustomerInfo | null): Promise<void> => {
      const activeCustomer = customerOverride === undefined ? currentCustomer : customerOverride;

      // Validate cart is not empty
      if (cart.length === 0) {
        alert(MESSAGES.EMPTY_CART);
        return;
      }

      if (salesLimit && salesLimit.current >= salesLimit.max) {
        openUpgradePrompt({
          feature: 'Unlimited Monthly Sales',
          currentLimit: salesLimit,
        });
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
        // Fetch Pharmacy Profile for receipt
        let printerConfig;
        try {
          const profileRes = await PharmacyService.getProfile();
          if (profileRes.success && profileRes.data) {
            const p = profileRes.data;
            printerConfig = {
              pharmacyName: p.name,
              address: p.address || '',
              phone: p.phone || '',
              taxId: p.taxId || '',
              footer: p.footer || 'Merci de votre visite!'
            };
          }
        } catch (e) { console.warn('Failed to load profile for receipt', e); }

        const result = await SalesService.processPayment(
          cart,
          paymentMethod,
          summary.total,
          activeCustomer || undefined,
          currentUser?.id,
          currentShift?.id,
          currentDiscount || undefined
        );

        if (result.success) {
          const receiptCustomer = result.customer ?? activeCustomer ?? undefined;

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
            customer: receiptCustomer,
          }, printerConfig);

          // Auto-print thermal receipt
          printThermalReceipt({
            saleId: result.saleId!,
            timestamp: result.timestamp,
            items: cart,
            subtotal: summary.subtotal,
            vat: summary.vat,
            total: summary.total,
            paymentMethod,
            customer: receiptCustomer,
            cashier: currentUser?.name,
          }, printerConfig);

          clearCart();
          setCurrentCustomer(null);
          setCurrentDiscount(null);
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
    [cart, summary.total, summary.subtotal, summary.vat, validateStock, clearCart, currentCustomer, currentDiscount, currentShift?.id, currentUser, openUpgradePrompt, salesLimit]
  );

  /**
   * Handle cash payment with optional customer
   */
  const handleCashPayment = useCallback(() => {
    if (cart.length === 0) {
      return;
    }

    if (currentCustomer) {
      void processPayment('cash', currentCustomer);
      return;
    }

    setPendingPayment('cash');
    setShowCustomerModal(true);
  }, [cart.length, currentCustomer, processPayment]);

  /**
   * Handle card payment with optional customer
   */
  const handleCardPayment = useCallback(() => {
    if (cart.length === 0) {
      return;
    }

    if (currentCustomer) {
      void processPayment('card', currentCustomer);
      return;
    }

    setPendingPayment('card');
    setShowCustomerModal(true);
  }, [cart.length, currentCustomer, processPayment]);

  /**
   * Handle customer modal save
   */
  const handleCustomerSave = useCallback(
    (customer: CustomerInfo) => {
      setCurrentCustomer(customer);
      setShowCustomerModal(false);
      if (pendingPayment) {
        setPendingPayment(null);
        void processPayment(pendingPayment, customer);
      }
    },
    [pendingPayment, processPayment]
  );

  /**
   * Handle customer modal skip
   */
  const handleCustomerSkip = useCallback(() => {
    setShowCustomerModal(false);
    setCurrentCustomer(null);
    if (pendingPayment) {
      setPendingPayment(null);
      void processPayment(pendingPayment, null);
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
        setCurrentDiscount(null);
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
      discount: currentDiscount,
    };

    setHeldTransactions((prev) => {
      const updated = [transaction, ...prev];
      localStorage.setItem('held_transactions', JSON.stringify(updated));
      return updated;
    });

    clearCart();
    setCurrentCustomer(null);
    setCurrentDiscount(null);
  }, [cart, currentCustomer, currentDiscount, clearCart]);

  // Resume Transaction Handler
  const handleRestoreTransaction = useCallback((transaction: HeldTransaction) => {
    if (cart.length > 0) {
      if (!confirm('Current cart is not empty. Overwrite with held transaction?')) {
        return;
      }
    }

    replaceCart(transaction.cart);
    setCurrentCustomer(transaction.customer || null);
    setCurrentDiscount(transaction.discount || null);

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
  const applyAuthenticatedSession = useCallback(async (user: AuthenticatedUser) => {
    setCurrentUser(user);

    if (user.isPlatformAdmin) {
      setCurrentShift(null);
      setShowShiftStart(false);
      return;
    }

    // Check for active shift
    const shiftResult = await ShiftService.getActiveShift(user.id);
    if (shiftResult.success && shiftResult.data) {
      setCurrentShift(shiftResult.data);
      setShowShiftStart(false);
    } else {
      setCurrentShift(null);
      setShowShiftStart(true);
    }
  }, []);

  const handleLoginSuccess = useCallback(async (loginData: { user: AuthenticatedUser } | AuthenticatedUser) => {
    // Extract user from the response (it structure is { token, user: { ... } })
    const user = 'user' in loginData ? loginData.user : loginData;
    await applyAuthenticatedSession(user);
  }, [applyAuthenticatedSession]);

  const refreshAuthenticatedUser = useCallback(async (): Promise<boolean> => {
    const result = await AuthService.verify();

    if (result.success && result.data) {
      const user = result.data.user || result.data;
      setCurrentUser(user);
      return true;
    }

    AuthService.logout();
    setCurrentUser(null);
    setCurrentShift(null);
    return false;
  }, []);

  const openExternalUrl = useCallback(async (url: string): Promise<boolean> => {
    if (window.electronAPI?.openExternal) {
      await window.electronAPI.openExternal(url);
      return true;
    }

    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (openedWindow) {
      openedWindow.opener = null;
      return true;
    }

    window.location.href = url;
    return true;
  }, []);

  const handleUpgradeRequest = useCallback(async (tier: 'professional' | 'enterprise') => {
    if (tier === 'professional' && canStartProfessionalTrial) {
      const result = await PharmacyService.startTrial();

      if (!result.success) {
        return {
          success: false,
          message: result.error?.message || 'Could not start the free trial.',
          close: false,
        };
      }

      const refreshed = await refreshAuthenticatedUser();
      if (!refreshed) {
        return {
          success: false,
          message: 'Trial started, but the session could not be refreshed. Please sign in again.',
          close: false,
        };
      }

      refreshLicense();

      return {
        success: true,
        message: 'Your 14-day Professional trial is now active.',
      };
    }

    const result = await apiRequest<{ sessionId: string; url: string }>('/checkout/create', {
      method: 'POST',
      body: JSON.stringify({ tier })
    });

    if (!result.success) {
      return {
        success: false,
        message: result.error?.message || 'Could not open the checkout page.',
        close: false,
      };
    }

    if (!result.data.url) {
      return {
        success: false,
        message: 'Could not open the checkout page.',
        close: false,
      };
    }

    await openExternalUrl(result.data.url);

    return {
      success: true,
      message: 'Checkout opened in your browser.',
    };
  }, [canStartProfessionalTrial, openExternalUrl, refreshAuthenticatedUser, refreshLicense]);

  const handleSalesReportsRequest = useCallback(() => {
    if (!hasLicensedFeatureAccess('advanced_reports')) {
      openUpgradePrompt({ feature: 'Advanced Reports' });
      return;
    }

    setShowSalesReports(true);
  }, [hasLicensedFeatureAccess, openUpgradePrompt]);

  const handleAnalyticsDashboardRequest = useCallback(() => {
    if (!hasLicensedFeatureAccess('analytics_dashboard')) {
      openUpgradePrompt({ feature: 'Analytics Dashboard' });
      return;
    }

    setShowAnalyticsDashboard(true);
  }, [hasLicensedFeatureAccess, openUpgradePrompt]);

  const handleCloudBackupRequest = useCallback(() => {
    if (!hasLicensedFeatureAccess('cloud_backup')) {
      openUpgradePrompt({ feature: 'Cloud Backup' });
      return;
    }

    setShowCloudBackupManager(true);
  }, [hasLicensedFeatureAccess, openUpgradePrompt]);

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (isActive) setIsRestoringSession(false);
        return;
      }

      const result = await AuthService.verify();
      if (!isActive) return;

      if (result.success && result.data) {
        const user = result.data.user || result.data;
        await applyAuthenticatedSession(user);
      } else {
        AuthService.logout();
        setCurrentUser(null);
        setCurrentShift(null);
      }

      if (isActive) setIsRestoringSession(false);
    };

    restoreSession().catch(() => {
      if (isActive) {
        AuthService.logout();
        setCurrentUser(null);
        setCurrentShift(null);
        setIsRestoringSession(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [applyAuthenticatedSession]);

  const handleShiftStarted = (shift: ShiftRecord) => {
    setCurrentShift(shift);
    setShowShiftStart(false);
  };

  const handleShiftEnded = () => {
    AuthService.logout();
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
      AuthService.logout();
      setCurrentShift(null);
      setCurrentUser(null);
      clearCart();
      setCurrentCustomer(null);
    }
  };

  // Register keyboard shortcuts
  const shortcuts = useMemo(() => ({
    [KEYBOARD_SHORTCUTS.CASH_PAYMENT]: handleCashPayment,
    [KEYBOARD_SHORTCUTS.CARD_PAYMENT]: handleCardPayment,
    [KEYBOARD_SHORTCUTS.CLEAR_CART]: handleClearCart,
    [KEYBOARD_SHORTCUTS.CANCEL]: handleClearSearch,
  }), [handleCashPayment, handleCardPayment, handleClearCart, handleClearSearch]);

  useKeyboardShortcuts(shortcuts, !!currentUser && !isPlatformAdminSession);

  // Barcode scanner integration
  useBarcodeScanner({
    onScan: async (barcode) => {
      if (!currentUser || isPlatformAdminSession) {
        return;
      }

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

  if (isRestoringSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg text-gray-300">
        <div className="flex items-center gap-3 text-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Restoring session...
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentUser.isPlatformAdmin) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <header className="border-b border-dark-border bg-dark-surface shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Platform Admin</p>
              <h1 className="text-2xl font-bold text-white">PharmaSOFT Control Center</h1>
              <p className="text-sm text-gray-400">
                Signed in as {currentUser.name} ({currentUser.username})
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="btn-secondary rounded-lg border border-dark-border px-4 py-2 text-sm"
            >
              Sign Out
            </button>
          </div>
        </header>

        <AdminDashboard />
      </div>
    );
  }

  return (
    <div className="h-[125vh] flex flex-col bg-dark-bg overflow-hidden" style={{ zoom: 0.8 }}>
      {trialDaysRemaining > 0 && (
        <TrialBanner
          daysRemaining={trialDaysRemaining}
          onUpgrade={() => openUpgradePrompt()}
        />
      )}
      {/* Top Bar */}
      <header className="bg-dark-surface border-b border-dark-border shadow-lg">
        {/* Row 1: Logo and User Info */}
        <div className="px-6 py-3 border-b border-dark-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                {t('app.name')}
              </h1>
              <div className="h-6 w-px bg-dark-border" aria-hidden="true" />
              <span className="text-sm text-gray-400">{t('app.subtitle')}</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Subscription Status Badge */}
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-dark-border bg-dark-elevated">
                {currentUser?.subscriptionTier === 'professional' ? (
                  <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center gap-1">
                    <span>👑</span> PRO
                    {currentUser?.trialEndsAt && currentUser.licenseKey && currentUser.licenseKey.startsWith('PRO-') ? '' : (() => {
                      if (!currentUser.trialEndsAt) return '';
                      const days = Math.ceil((new Date(currentUser.trialEndsAt).getTime() - new Date().getTime()) / (86400000));
                      return days > 0 ? `(Trial: ${days}d)` : '(Expired)';
                    })()}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-gray-400">FREE TIER</span>
                )}
              </div>

              <div className="flex items-center space-x-2 px-4 py-2 bg-dark-elevated rounded-lg border border-dark-border">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium text-gray-300">{currentUser?.name}</span>
                <span className="text-xs text-gray-500">({currentUser?.role})</span>
              </div>

              {/* Language Switcher */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
                className="px-3 py-1.5 rounded-lg text-xs flex items-center hover:scale-105 transition-transform bg-dark-elevated border border-dark-border hover:border-primary"
                title={language === 'en' ? 'Passer au français' : 'Switch to English'}
              >
                <span className="text-lg mr-1.5">{language === 'en' ? '🇫🇷' : '🇬🇧'}</span>
                <span className="font-medium">{language === 'en' ? 'FR' : 'EN'}</span>
              </button>

              {currentShift && (
                <button
                  onClick={() => setShowShiftEnd(true)}
                  className="btn-warning px-3 py-1.5 rounded-lg text-xs flex items-center hover:scale-105 transition-transform"
                  title={t('tooltips.endShift')}
                >
                  <svg className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('header.endShift')}
                </button>
              )}

              <button
                onClick={handleLogout}
                className="btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center hover:scale-105 transition-transform border border-dark-border"
                title={t('tooltips.logout')}
              >
                <svg className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t('header.logout')}
              </button>

              <div className="h-6 w-px bg-dark-border/50 mx-2" />

              <time className="text-sm text-gray-400 whitespace-nowrap px-3">
                {new Date().toLocaleString(LOCALE, DATETIME_FORMAT)}
              </time>
            </div>
          </div>
        </div>

        {/* Row 2: Action Buttons */}
        <div className="px-4 py-2.5 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <div className="flex items-center gap-3 min-w-max">
            {/* Left: Main Actions */}
            <div className="flex items-center gap-2">
              {/* Always Visible - Core Functions */}
              {currentUser?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setShowProductManagement(true)}
                    className="btn-primary shadow-glow px-4 py-2 rounded-lg flex items-center text-sm hover:scale-105 transition-transform"
                    title={t('tooltips.manageProducts')}
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    {t('nav.products')}
                  </button>
                  <div className="h-6 w-px bg-dark-border/50" />
                </>
              )}

              <button
                onClick={() => setShowQuickStockAdd(true)}
                className="btn-secondary px-4 py-2 rounded-lg flex items-center text-sm hover:scale-105 transition-transform"
                title={t('tooltips.quickStockAddition')}
              >
                <svg className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('nav.addStock')}
              </button>

              <button
                onClick={() => setShowLowStockAlerts(true)}
                className="btn-warning px-4 py-2 rounded-lg flex items-center text-sm hover:scale-105 transition-transform"
                title={t('tooltips.stockAlerts')}
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {t('nav.lowStock')}
              </button>

              <button
                onClick={() => setShowExpiryAlerts(true)}
                className="btn-danger px-4 py-2 rounded-lg flex items-center text-sm hover:scale-105 transition-transform"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('nav.expiry')}
              </button>

              <div className="h-6 w-px bg-dark-border/50" />

              {/* Reports Dropdown */}
              <Dropdown label="📊 Reports" buttonClassName="btn-primary shadow-glow">
                <DropdownItem
                  onClick={() => setShowSalesHistory(true)}
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                  label={t('nav.history')}
                />
                <DropdownItem
                  onClick={() => setShowDailySummary(true)}
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                  label={t('nav.summary')}
                />
                {currentUser?.role === 'admin' && (
                  <>
                    <DropdownDivider />
                    <DropdownItem
                      onClick={handleSalesReportsRequest}
                      icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                      label={t('nav.reports')}
                      badge={hasLicensedFeatureAccess('advanced_reports') ? undefined : 'PRO'}
                    />
                    <DropdownItem
                      onClick={handleAnalyticsDashboardRequest}
                      icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>}
                      label={t('nav.analytics')}
                      badge={hasLicensedFeatureAccess('analytics_dashboard') ? undefined : 'PRO'}
                    />
                  </>
                )}
              </Dropdown>

              {/* Management Dropdown (Admin Only) */}
              {currentUser?.role === 'admin' && (
                <Dropdown label="👥 Management" buttonClassName="btn-secondary">
                  <DropdownItem
                    onClick={() => setShowCustomerManagement(true)}
                    icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    label={t('nav.customers')}
                  />
                  <DropdownItem
                    onClick={() => setShowInvoiceManagement(true)}
                    icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    label={t('nav.invoices')}
                  />
                  <DropdownDivider />
                  <DropdownItem
                    onClick={() => setShowUserManagement(true)}
                    icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                    label={t('nav.users')}
                  />
                </Dropdown>
              )}

              {/* Security Dropdown (Admin Only) */}
              {currentUser?.role === 'admin' && (
                <Dropdown label="🔐 Security" buttonClassName="btn-primary shadow-glow" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                  <DropdownItem
                    onClick={() => setShowBackupManager(true)}
                    icon={<span className="text-xl">💾</span>}
                    label="Local Backups"
                  />
                  <DropdownItem
                    onClick={handleCloudBackupRequest}
                    icon={<span className="text-xl">☁️</span>}
                    label="Cloud Backups"
                    badge={hasLicensedFeatureAccess('cloud_backup') ? undefined : 'PRO'}
                  />
                  <DropdownItem
                    onClick={() => setShowAuditLogViewer(true)}
                    icon={<span className="text-xl">🔍</span>}
                    label="Audit Log"
                  />
                  <DropdownDivider />
                  <DropdownItem
                    onClick={() => setShowPharmacyProfile(true)}
                    icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    label="Settings"
                  />
                </Dropdown>
              )}
            </div>

            {/* Right: User Info */}
            <div className="flex items-center gap-2 flex-shrink-0">




            </div>
          </div>
        </div>
      </header>

      {salesLimit && (
        <div className="px-6 pt-4">
          <LimitWarning
            type="sales"
            current={salesLimit.current}
            max={salesLimit.max}
            onUpgrade={() => openUpgradePrompt({
              feature: 'Unlimited Monthly Sales',
              currentLimit: salesLimit,
            })}
          />
        </div>
      )}

      {/* Search Bar */}
      <SearchBar
        searchTerm={searchState.query}
        setSearchTerm={setSearchTerm}
        searchProducts={searchProducts}
        searchResults={searchState.results}
        isSearching={searchState.isLoading}
        onSelectProduct={handleSelectProduct}
        t={t}
      />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden min-h-0 pb-16">
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
            t={t}
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
            t={t}
          />
        </aside>
      </main>

      {/* Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-dark-surface px-6 py-2 z-10">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-6">
            <span className="flex items-center" role="status" aria-live="polite">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" aria-hidden="true" />
              {t('footer.databaseConnected')}
            </span>
            <span>{summary.itemCount} {t('footer.itemsInCart')}</span>
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
            <kbd className="px-2 py-1 bg-dark-elevated rounded">{t('footer.f1Cash')}</kbd>
            <kbd className="px-2 py-1 bg-dark-elevated rounded">{t('footer.f2Card')}</kbd>
            <kbd className="px-2 py-1 bg-dark-elevated rounded">{t('footer.f3Clear')}</kbd>
            <kbd className="px-2 py-1 bg-dark-elevated rounded">{t('footer.escCancel')}</kbd>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showSalesHistory && (
        <SalesHistory onClose={() => setShowSalesHistory(false)} currentUser={currentUser} t={t} />
      )}

      {showCustomerModal && (
        <CustomerModal
          onSave={handleCustomerSave}
          onCancel={handleCustomerSkip}
        />
      )}

      {showDailySummary && (
        <DailySummary onClose={() => setShowDailySummary(false)} currentUser={currentUser} t={t} />
      )}

      {showLowStockAlerts && (
        <LowStockAlerts onClose={() => setShowLowStockAlerts(false)} t={t} />
      )}

      {showProductManagement && (
        <ProductManagement
          onClose={() => setShowProductManagement(false)}
          onUpgradeRequest={openUpgradePrompt}
          t={t}
        />
      )}

      {showExpiryAlerts && (
        <ExpiryAlerts onClose={() => setShowExpiryAlerts(false)} t={t} />
      )}

      {showSalesReports && (
        <SalesReports onClose={() => setShowSalesReports(false)} t={t} />
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
        <CustomerManagement onClose={() => setShowCustomerManagement(false)} t={t} />
      )}

      {showInvoiceManagement && (
        <InvoiceManagement
          onClose={() => setShowInvoiceManagement(false)}
          onNewInvoice={() => {
            setShowInvoiceManagement(false);
            setShowInvoiceGenerator(true);
          }}
          t={t}
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
              AuthService.logout();
              setCurrentUser(null);
              setCurrentShift(null);
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
          onUpgradeRequest={openUpgradePrompt}
          t={t}
        />
      )}

      {showQuickStockAdd && (
        <QuickStockAdd
          onClose={() => setShowQuickStockAdd(false)}
          currentUserId={currentUser?.id || 1}
          t={t}
        />
      )}

      {showAnalyticsDashboard && (
        <AnalyticsDashboard onClose={() => setShowAnalyticsDashboard(false)} />
      )}

      {showPharmacyProfile && (
        <PharmacyProfile
          onClose={() => setShowPharmacyProfile(false)}
          t={t}
        />
      )}

      {showBackupManager && (
        <BackupManager onClose={() => setShowBackupManager(false)} />
      )}

      {showAuditLogViewer && (
        <AuditLogViewer onClose={() => setShowAuditLogViewer(false)} />
      )}

      {showCloudBackupManager && (
        <CloudBackupManager onClose={() => setShowCloudBackupManager(false)} />
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={closeUpgradePrompt}
        feature={upgradeFeature}
        currentLimit={upgradeCurrentLimit}
        professionalAction={canStartProfessionalTrial ? 'trial' : 'checkout'}
        onUpgrade={handleUpgradeRequest}
      />
    </div>
  );
}

export default App;
