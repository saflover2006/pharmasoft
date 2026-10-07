// Global path configuration for PharmaSOFT
(function() {
  const path = window.location.pathname;
  window.APP_BASE = path.startsWith('/pharmasoft') ? '/pharmasoft' : '';
  window.API_URL = window.APP_BASE + '/api';
  window.toAppUrl = function(p) {
    if (!p) return window.APP_BASE || '/';
    const clean = p.startsWith('/') ? p : '/' + p;
    return window.APP_BASE + clean;
  };
})();
