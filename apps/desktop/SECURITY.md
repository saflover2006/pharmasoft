# 🔐 PharmaSOFT Security Guide

## Security Features Implemented

### 1. **Environment Variables**
- ✅ Sensitive data stored in `.env` file (not committed to Git)
- ✅ `.env.example` template provided
- ✅ Database credentials separated from code

**Setup:**
```bash
# Copy example file and edit with your values
cp .env.example .env
```

### 2. **HTTP Security Headers (Helmet)**
- ✅ Content Security Policy (CSP)
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ X-XSS-Protection

### 3. **Rate Limiting**
- ✅ Login attempts: 5 per 15 minutes
- ✅ API requests: 100 per 15 minutes
- ✅ Prevents brute force attacks

### 4. **Input Validation & Sanitization**
- ✅ HTML tag removal
- ✅ Whitespace trimming
- ✅ Content-Type validation
- ✅ SQL injection prevention (Prisma ORM)

### 5. **Authentication & Authorization**
- ✅ JWT token-based authentication
- ✅ Token expiry (8 hours)
- ✅ Role-based access control (Admin/Cashier)
- ✅ Password hashing with bcrypt

### 6. **CORS Configuration**
- ✅ Restricted to allowed origins only
- ✅ Configurable via environment variables

### 7. **Request Logging**
- ✅ Timestamp logging
- ✅ IP address tracking
- ✅ Method and path logging

---

## Security Checklist

### Before Deployment

- [ ] **Change default secrets** in `.env`:
  ```
  JWT_SECRET="your-unique-secret-here"
  SESSION_SECRET="your-unique-session-secret-here"
  ```

- [ ] **Set production environment**:
  ```
  NODE_ENV=production
  ```

- [ ] **Update allowed CORS origins**:
  ```
  ALLOWED_ORIGINS=https://your-domain.com
  ```

- [ ] **Enable HTTPS/SSL** in production

- [ ] **Set strong database password**

- [ ] **Run security audit**:
  ```bash
  npm audit
  npm audit fix
  ```

- [ ] **Update all dependencies**:
  ```bash
  npm update
  ```

- [ ] **Review and remove demo credentials** from login page

### Regular Security Maintenance

- [ ] Rotate JWT secrets every 3-6 months
- [ ] Update dependencies monthly
- [ ] Review access logs weekly
- [ ] Backup database daily
- [ ] Test disaster recovery quarterly

---

## Password Security

### Current Implementation
- Passwords are hashed using bcrypt
- Minimum 8 characters (enforce in UI)
- Salting rounds: 10

### Recommended Password Policy
```
Minimum length: 12 characters
Must contain:
  - Uppercase letter
  - Lowercase letter
  - Number
  - Special character
```

---

## API Security

### Protected Endpoints
All endpoints except `/api/auth/login` require JWT token:

```
Authorization: Bearer <your-jwt-token>
```

### Admin-Only Endpoints
- User management
- Product deletion
- Reports access

---

## Database Security

### SQLite Security (Development)
- File-based, local access only
- No network exposure
- Suitable for desktop app

### Migration to PostgreSQL (Production - Optional)
For multi-user scenarios:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/pharmasoft"
```

Benefits:
- Better concurrent access
- Row-level security
- Encryption at rest

---

## Electron App Security

### Current Settings
```typescript
webPreferences: {
    nodeIntegration: false,  // ✅ Disabled
    contextIsolation: true,  // ✅ Enabled
}
```

### Additional Recommendations
- Keep Electron updated
- Validate all IPC messages
- Don't load remote content
- Use Content Security Policy

---

## Incident Response

### If Security Breach Suspected

1. **Immediately**:
   - Change all passwords
   - Rotate JWT secrets
   - Review access logs

2. **Within 24 hours**:
   - Audit all recent transactions
   - Check for unauthorized changes
   - Notify affected users

3. **Long term**:
   - Investigate root cause
   - Implement additional controls
   - Update security procedures

---

## Testing Security

### Manual Tests
```bash
# Test rate limiting
for i in {1..10}; do curl http://localhost:3000/api/auth/login; done

# Test JWT expiry
# Wait 8+ hours and try using old token

# Test SQL injection
# Try special characters in inputs
```

### Automated Security Scan
```bash
# Using npm audit
npm audit --production

# Using Snyk (install first)
npx snyk test
```

---

## Compliance & Standards

- ✅ OWASP Top 10 protections
- ✅ GDPR-ready (data privacy)
- ✅ PCI DSS considerations (no card storage)
- ✅ HIPAA considerations (pharmacy data)

---

## Security Resources

- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)

---

## Contact

For security issues, contact: **[Your Security Contact]**

**Last Updated**: 2026-01-18
