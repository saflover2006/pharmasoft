# 🚀 Automatic Medication Import - Complete Setup Guide

## 📋 What You Need

Before starting, get these 3 URLs from PCT Tunisia or your source:

1. **CNAM Reimbursed List**: Direct download URL for XLSX
2. **Monthly Updates**: URL for updates/changes
3. **Complete List**: URL for complete medication database

---

## ⚙️ Setup (One-Time)

### **Step 1: Install Requirements**

```bash
cd c:\Users\Rimen\projects\pharmasoft

# Install XLSX converter (automatic on first run)
npm install xlsx
```

### **Step 2: Configure URLs**

Edit `import-config.json`:

```json
{
  "sources": {
    "cnam_reimbursed": {
      "url": "https://example.com/cnam-list.xlsx",  ← PASTE YOUR URL
      ...
    },
    "updates": {
      "url": "https://example.com/updates.xlsx",    ← PASTE YOUR URL
      ...
    },
    "complete": {
      "url": "https://example.com/complete.xlsx",   ← PASTE YOUR URL
      ...
    }
  }
}
```

**Save the file!**

---

## 🎯 Usage

### **Manual Run (Test First)**

```bash
# Import everything
node import-auto.js all

# Import specific source
node import-auto.js cnam_reimbursed
node import-auto.js updates
node import-auto.js complete
```

### **What Happens:**

```
1. ⬇️  Downloads XLSX file from URL
2. 🔄 Converts XLSX → CSV automatically
3. 📥 Imports to PharmaBest database
4. ✅ Shows summary
5. 🧹 Cleans up old files (keeps last 5)
6. 📝 Saves log file
```

---

## ⏰ Automatic Scheduling (Windows)

### **Option 1: Windows Task Scheduler** ⭐ Recommended

#### **Create Task:**

1. Open **Task Scheduler** (search in Windows)
2. Click **"Create Basic Task"**
3. Name: `PharmaBest Medication Update`
4. Trigger: **Monthly** (first day of month, 2:00 AM)
5. Action: **Start a program**
6. Program: `c:\Users\Rimen\projects\pharmasoft\scheduled-import.bat`
7. Click **Finish**

#### **Test Immediately:**
- Right-click task → **Run**
- Check `logs\scheduler.log` for results

### **Option 2: Manual Schedule**

Run `scheduled-import.bat` yourself:
- First day of each month
- After lunch break
- When convenient

---

## 📂 File Structure

```
pharmasoft/
├── import-auto.js              ← Main automation script
├── import-config.json          ← Your 3 URLs here!
├── scheduled-import.bat        ← For Task Scheduler
├── import-cnam.js              ← Used internally
├── import-update.js            ← Used internally
│
├── downloads/                  ← Downloaded files
│   ├── cnam_reimbursed_2025-01-15.xlsx
│   ├── cnam_reimbursed_2025-01-15.csv
│   ├── updates_2025-01-15.xlsx
│   └── ...
│
└── logs/                       ← Import logs
    ├── import-2025-01-15.log
    └── scheduler.log
```

---

## 🎯 Recommended Schedule

| Source | Frequency | Task Scheduler |
|--------|-----------|----------------|
| **CNAM Reimbursed** | Monthly | 1st of month, 2 AM |
| **Updates** | Monthly | 1st of month, 2:30 AM |
| **Complete List** | Quarterly | 1st of Jan/Apr/Jul/Oct, 3 AM |

### **Why Automatic?**

✅ Never forget to update
✅ Always have latest prices
✅ New medications added automatically
✅ CNAM rates up-to-date
✅ Compliance with regulations

---

## 📊 Monitoring

### **Check Logs:**

```bash
# Today's import log
type logs\import-2025-01-15.log

# Scheduler log (all runs)
type logs\scheduler.log
```

### **Verify in PharmaBest:**

```
1. Login as admin
2. Products → Check count increased
3. Recent products → Check new additions
4. Pick a product → Check updated prices
```

---

## 🆘 Troubleshooting

### **Problem: Download fails**

```
❌ Error: Download failed: 404

Solutions:
1. Check URL in import-config.json
2. Test URL in browser first
3. Check if file still available
4. Contact PCT support
```

### **Problem: Conversion fails**

```
❌ Error: Failed to convert XLSX

Solutions:
1. Check XLSX file format
2. Try opening in Excel first
3. Re-download file
4. Check xlsx module: npm install xlsx
```

### **Problem: Import fails**

```
❌ Error: Import failed

Solutions:
1. Check logs\import-*.log
2. Verify database running
3. Check server on localhost:3000
4. Run import-cnam.js manually
```

### **Problem: Task Scheduler doesn't run**

```
Solutions:
1. Check task is enabled
2. Verify path in task settings
3. Run manually first to test
4. Check Windows Event Viewer
5. Ensure computer is ON at scheduled time
```

---

## 🔄 Update Process Flow

```
┌─────────────────────────────────────┐
│  AUTOMATIC UPDATE PROCESS           │
├─────────────────────────────────────┤
│ 1. Task Scheduler triggers (2 AM)   │
│ 2. scheduled-import.bat runs        │
│ 3. import-auto.js executes          │
│ 4. Downloads XLSX from URLs         │
│ 5. Converts to CSV                  │
│ 6. Imports to database              │
│ 7. Logs results                     │
│ 8. Cleans up old files              │
│ 9. Email alert (optional)           │
└─────────────────────────────────────┘
```

---

## 📧 Email Notifications (Optional)

To get email when import completes, edit `import-auto.js` and add:

```javascript
// At the end of main() function:
if (success > 0) {
    sendEmail('Import Success', `Imported ${success} sources`);
}
```

---

## ✅ Quick Start Checklist

- [ ] Get 3 URLs from PCT/CNAM
- [ ] Edit `import-config.json` with URLs
- [ ] Run `npm install xlsx`
- [ ] Test: `node import-auto.js cnam_reimbursed`
- [ ] Verify products imported
- [ ] Set up Task Scheduler
- [ ] Test scheduled task
- [ ] Check logs work
- [ ] Done! ✨

---

## 📞 Support

**File Issues:**
- Download fails → Check URL
- Conversion fails → Check XLSX format
- Import fails → Check server running
- Scheduler fails → Check Task Scheduler settings

**Need Help?**
Check `logs/import-*.log` for detailed error messages.

---

## 🎉 Benefits

### **Before (Manual):**
```
- Remember to download each month ❌
- Manually convert Excel to CSV ❌
- Run import scripts manually ❌
- Easy to forget ❌
- Time consuming ❌
```

### **After (Automatic):**
```
✅ Runs automatically every month
✅ Downloads + converts automatically
✅ Imports automatically
✅ Never forget
✅ Saves hours of time
✅ Always up-to-date
✅ Complete audit trail
```

---

**Set it up once, forget about it, always stay updated!** 🚀
