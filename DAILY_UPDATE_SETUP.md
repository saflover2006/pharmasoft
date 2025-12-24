# 🌙 Daily Midnight Auto-Update - Setup Guide

## 🎯 What It Does

Every day at **midnight (00:00)**, automatically:
1. ✅ Downloads **new medications** list from SPOT Tunisia
2. ✅ Downloads **CNAM reimbursed** list from SPOT Tunisia
3. ✅ Converts XLSX → CSV
4. ✅ **Fast imports** to PharmaBest (40x faster!)
5. ✅ Logs everything
6. ✅ You wake up with fresh data! ☕

---

## ⚙️ Setup (One-Time, 5 Minutes)

### **Step 1: Test Manually First**

```bash
cd c:\Users\Rimen\projects\pharmasoft

# Test the daily update script
node daily-update.js
```

**Expected**: Downloads and imports both lists (~1-2 minutes total)

---

### **Step 2: Set Up Windows Task Scheduler**

#### **A. Open Task Scheduler**
1. Press `Win + R`
2. Type: `taskschd.msc`
3. Press Enter

#### **B. Create New Task**
1. Click **"Create Basic Task"**
2. **Name**: `PharmaBest Daily Update`
3. **Description**: `Daily midnight medication list update from SPOT Tunisia`
4. Click **Next**

#### **C. Set Trigger (When to Run)**
1. Select: **"Daily"**
2. Click **Next**
3. **Start**: Today's date
4. **Start time**: `00:00:00` (midnight)
5. **Recur every**: `1` days
6. Click **Next**

#### **D. Set Action (What to Run)**
1. Select: **"Start a program"**
2. Click **Next**
3. **Program/script**: 
   ```
   c:\Users\Rimen\projects\pharmasoft\daily-midnight-update.bat
   ```
4. **Start in**: 
   ```
   c:\Users\Rimen\projects\pharmasoft
   ```
5. Click **Next**

#### **E. Finish Setup**
1. Check **"Open the Properties dialog"**
2. Click **Finish**

#### **F. Configure Advanced Settings**
In the Properties dialog:

1. **General Tab:**
   - ✅ Check "Run whether user is logged on or not"
   - ✅ Check "Run with highest privileges"

2. **Conditions Tab:**
   - ❌ Uncheck "Start only if on AC power"
   - ❌ Uncheck "Stop if computer switches to battery"
   - ✅ Check "Wake the computer to run this task"

3. **Settings Tab:**
   - ✅ Check "Allow task to be run on demand"
   - ✅ Check "Run task as soon as possible after scheduled start is missed"
   - ✅ Check "If the task fails, restart every: 5 minutes, 3 times"

4. Click **OK**
5. Enter your Windows password if prompted

---

## ✅ Verify Setup

### **Test Immediately:**
1. In Task Scheduler, find your task
2. Right-click → **"Run"**
3. Check logs: `logs\daily-scheduler.log`
4. Should see: `Daily update completed successfully`

### **Check Next Morning:**
```bash
# View today's update log
type logs\daily-update-2025-12-23.log

# View scheduler log
type logs\daily-scheduler.log
```

---

## 📋 What Gets Updated Daily

| List | Purpose | Expected Time |
|------|---------|---------------|
| **Updates** | New medications added | ~30 seconds |
| **CNAM Reimbursed** | Full VEI list (~3,300 meds) | ~1 minute |
| **Total** | Both lists | **~1-2 minutes** |

---

## 🕐 Daily Schedule

```
23:59:59 → PharmaBest closing sales
00:00:00 → Task Scheduler triggers
00:00:01 → Script starts downloading
00:00:30 → Downloads complete
00:01:00 → Fast import running
00:02:00 → Complete! ✅
06:00:00 → You wake up with fresh data! ☕
```

---

## 📊 What Happens Each Night

```
1. Downloads from SPOT Tunisia:
   ✅ NOUV-01-12-2025.xlsx (updates)
   ✅ LISTE...VEI...01-12-2025.xlsx (CNAM)

2. Converts to CSV automatically

3. Fast bulk import:
   ⚡ 97 medications/second
   ⚡ ~3,300 meds in 34 seconds

4. Logs results

5. Cleans up old files (keeps last 5)
```

---

## 📂 Files & Logs

### **Daily Logs:**
```
logs/
├── daily-update-2025-12-23.log      ← Detailed import log
├── daily-update-2025-12-24.log      ← Next day
├── daily-scheduler.log              ← Task Scheduler log
└── ...
```

### **Downloads:**
```
downloads/
├── updates_2025-12-23T00-00-15.xlsx
├── updates_2025-12-23T00-00-15.csv
├── cnam_reimbursed_2025-12-23T00-00-30.xlsx
├── cnam_reimbursed_2025-12-23T00-00-30.csv
└── ... (keeps last 5 of each)
```

---

## 🔧 Customization

### **Change Update Time:**

In Task Scheduler:
1. Right-click task → **Properties**
2. **Triggers** tab → Edit
3. Change **Start time** to your preference
4. Click OK

### **Update Different Lists:**

Edit `daily-update.js`:
```javascript
// Line ~16
const DAILY_SOURCES = ['updates', 'cnam_reimbursed'];

// Add more:
const DAILY_SOURCES = ['updates', 'cnam_reimbursed', 'removed'];
```

---

## 🆘 Troubleshooting

### **Task didn't run?**
```
Solutions:
1. Check computer was ON at midnight
2. Check "Wake computer" option enabled
3. View Task Scheduler → Task History
4. Check logs\daily-scheduler.log
```

### **Import failed?**
```
Solutions:
1. Check logs\daily-update-*.log
2. Verify URLs still work
3. Test manually: node daily-update.js
4. Check server running on localhost:3000
```

### **Computer off at midnight?**
```
Solutions:
1. Enable "Wake computer to run" (done above)
2. OR change time to when PC is always on
3. OR run manually in morning: daily-midnight-update.bat
```

---

## 📧 Email Notifications (Optional)

To get email when update completes:

1. Install email module:
   ```bash
   npm install nodemailer
   ```

2. Edit `daily-update.js` - add at end:
   ```javascript
   // Send email notification
   await sendEmail({
       to: 'your@email.com',
       subject: 'PharmaBest Daily Update Complete',
       text: `Updated ${success} lists successfully!`
   });
   ```

---

## ✅ Quick Checklist

- [ ] Tested `node daily-update.js` manually
- [ ] Created Task Scheduler task
- [ ] Set time to 00:00:00 (midnight)
- [ ] Enabled "Run whether user logged on"
- [ ] Enabled "Wake computer to run"
- [ ] Disabled "AC power only"
- [ ] Tested "Run" immediately
- [ ] Checked logs for success
- [ ] Waiting for first midnight run 🌙

---

## 🎉 Benefits

### **Before:**
```
❌ Remember to check SPOT website
❌ Manually download files
❌ Manually convert XLSX → CSV
❌ Manually run import (20+ minutes!)
❌ Easy to forget
❌ Outdated prices/products
```

### **After:**
```
✅ Runs automatically every midnight
✅ Downloads automatically
✅ Converts automatically
✅ Fast import (1-2 minutes)
✅ Never forget
✅ Always up-to-date
✅ Logs everything
✅ Wake up with fresh data! ☕
```

---

## 📞 Summary

**You now have:**
✅ Daily automatic updates at midnight
✅ 2 medication lists updated (updates + CNAM)
✅ Fast import (40x faster than before!)
✅ Complete logging and audit trail
✅ Wake-computer capability
✅ Failure recovery and retry
✅ Always fresh medication data

**Set it and forget it!** 🌙✨

---

**Next Day Check:**
```bash
# Morning after first run
type logs\daily-scheduler.log
# Should show: Daily update completed successfully
```

**You're all set!** 🎉
