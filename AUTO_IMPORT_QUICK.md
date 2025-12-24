# 🎯 AUTO-IMPORT Quick Reference

## 📝 One-Time Setup (5 Minutes)

### 1. Get Your 3 URLs
Contact PCT Tunisia or your medication list provider for:
- CNAM Reimbursed list URL (`.xlsx`)
- Monthly updates URL (`.xlsx`)
- Complete medication list URL (`.xlsx`)

### 2. Configure
```bash
Edit: import-config.json

Replace:
"PASTE_YOUR_CNAM_URL_HERE" → Your actual CNAM URL
"PASTE_YOUR_UPDATES_URL_HERE" → Your actual updates URL  
"PASTE_YOUR_COMPLETE_LIST_URL_HERE" → Your actual complete list URL

Save!
```

### 3. Install
```bash
cd c:\Users\Rimen\projects\pharmasoft
npm install xlsx
```

---

## 🚀 Usage

### Test Manually First
```bash
# Test one source
node import-auto.js cnam_reimbursed

# Test all sources
node import-auto.js all
```

### Set Up Automatic (Windows)
```
1. Open Task Scheduler
2. Create Basic Task
3. Name: "PharmaBest Monthly Update"
4. Trigger: Monthly, 1st day, 2:00 AM
5. Action: Run "scheduled-import.bat"
6. Done!
```

---

## 📊 What It Does

```
URL → Download XLSX → Convert to CSV → Import to DB → Done!
      (automatic)     (automatic)        (automatic)
```

---

## 📂 Files Created

| File | Purpose |
|------|---------|
| `import-auto.js` | Main script |
| `import-config.json` | **YOUR 3 URLS HERE** |
| `scheduled-import.bat` | For Task Scheduler |
| `downloads/` | Downloaded files |
| `logs/` | Import logs |

---

## ✅ Quick Check

After first run:
1. Check `logs/import-*.log` → No errors?
2. Login to PharmaBest → New products?
3. Count increased → Success! ✅

---

## 🔄 Monthly Process

```
1st of month, 2 AM:
→ Task Scheduler wakes up
→ Downloads latest lists
→ Converts & imports
→ You wake up with updated database! ☕
```

---

## 💡 Pro Tips

✅ **Test first** with one source before all
✅ **Check logs** after each run
✅ **Backup database** before big imports
✅ **Verify URLs** work in browser first
✅ **Run during off-hours** (2 AM)

---

**Questions?** See `AUTO_IMPORT_SETUP.md` for full guide!
