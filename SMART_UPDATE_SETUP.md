# 🌐 Smart Auto-Update - Internet Connection Setup

## 🎯 What It Does

Updates medication lists **automatically when internet is available:**
- ✅ Runs **once per day** (not multiple times)
- ✅ Only when **internet is connected**
- ✅ Can run at **startup** or **network connection**
- ✅ **Skips** if already updated today
- ✅ **Fast** bulk import (~20 seconds)
- ✅ Works even if computer was off at midnight

---

## ✨ Smart Features

### **1. Once-Per-Day Protection**
```
First run today: ✅ Updates
2nd, 3rd, 4th run: ⏭️ Skips (already updated)
Next day: ✅ Updates again
```

### **2. Internet Check**
```
Has internet: ✅ Proceed
No internet: ⏭️ Skip, try later
```

### **3. State Tracking**
```
Saves: logs/last-update.json
{
  "lastUpdate": "2025-12-23",
  "timestamp": "2025-12-23T16:45:00Z"
}
```

---

## ⚙️ Setup Options

Choose **ONE** of these methods:

---

### **Option 1: On Startup** ⭐ RECOMMENDED

Runs when Windows starts up.

#### **Setup:**

1. **Open Startup Folder:**
   - Press `Win + R`
   - Type: `shell:startup`
   - Press Enter

2. **Create Shortcut:**
   - Right-click in folder → New → Shortcut
   - Target: `c:\Users\Rimen\projects\pharmasoft\smart-update.bat`
   - Name: `PharmaBest Smart Update`
   - Click Finish

3. **Done!**
   - Every time PC starts → Checks and updates if needed
   - Runs in background silently

---

### **Option 2: On Network Connection**

Runs when network cable plugged in or WiFi connects.

#### **Setup:**

1. **Open Task Scheduler:**
   - Press `Win + R`
   - Type: `taskschd.msc`
   - Press Enter

2. **Create Task:**
   - Click "Create Task" (not Basic Task)
   - **General Tab:**
     - Name: `PharmaBest Network Update`
     - ✅ Run whether user logged on
     - ✅ Run with highest privileges

3. **Triggers Tab:**
   - Click "New..."
   - Begin the task: **"On an event"**
   - Log: **Microsoft-Windows-NetworkProfile/Operational**
   - Source: **NetworkProfile**
   - Event ID: **10000** (network connected)
   - Click OK

4. **Actions Tab:**
   - Click "New..."
   - Action: Start a program
   - Program: `c:\Users\Rimen\projects\pharmasoft\smart-update.bat`
   - Start in: `c:\Users\Rimen\projects\pharmasoft`
   - Click OK

5. **Conditions Tab:**
   - ❌ Uncheck "Start only if on AC power"

6. **Settings Tab:**
   - ✅ Allow task to be run on demand
   - ✅ If task fails, restart every 5 minutes

7. **Click OK**

---

### **Option 3: Manual (Testing)**

Run manually when you want:

```bash
cd c:\Users\Rimen\projects\pharmasoft
smart-update.bat
```

---

## 📊 How It Works

### **First Run Today:**
```
1. Check last-update.json
2. Not updated today? → Proceed
3. Check internet → Connected? → Yes
4. Download & import lists
5. Save today's date to last-update.json
6. Done! ✅
```

### **Second Run Today:**
```
1. Check last-update.json
2. Already updated today? → Skip!
3. Exit (no download, saves time/bandwidth)
```

### **Next Day:**
```
1. New day! last-update.json is yesterday
2. Proceed with update
3. Save new date
4. Done! ✅
```

---

## ✅ Test It

### **First Test:**
```bash
cd c:\Users\Rimen\projects\pharmasoft
node smart-update.js
```

**Expected Output:**
```
🌐 SMART AUTO-UPDATE
====================

✅ Internet connected!

Processing: New Medications...
✅ Downloaded
✅ Converted
✅ Imported

Processing: CNAM VEI...
✅ Downloaded
✅ Converted
✅ Imported

SMART UPDATE SUMMARY
✅ Successful: 2/2
📅 Last update saved: 2025-12-23

✨ Smart update complete!
```

### **Second Test (Same Day):**
```bash
node smart-update.js
```

**Expected Output:**
```
🌐 SMART AUTO-UPDATE
====================

✅ Already updated today!
Last update: 2025-12-23

No update needed. Exiting.
```

Perfect! It skips the second time. ✅

---

## 📂 Files Created

```
logs/
├── last-update.json              ← State tracking
├── smart-update-2025-12-23.log   ← Daily log
├── smart-update.log              ← Cumulative log
└── ...

downloads/
├── updates_2025-12-23T08-30-15.xlsx
├── updates_2025-12-23T08-30-15.csv
├── cnam_reimbursed_2025-12-23T08-30-30.xlsx
└── cnam_reimbursed_2025-12-23T08-30-30.csv
```

---

## 🔍 Check If It Worked

### **View Last Update:**
```bash
type logs\last-update.json
```

**Shows:**
```json
{
  "lastUpdate": "2025-12-23",
  "timestamp": "2025-12-23T16:45:00.123Z"
}
```

### **View Today's Log:**
```bash
type logs\smart-update-2025-12-23.log
```

---

## 💡 Scenarios

| Scenario | What Happens |
|----------|--------------|
| **PC starts, has internet** | ✅ Updates immediately |
| **PC starts, no internet** | ⏭️ Skips, tries later |
| **WiFi connects later** | ✅ Updates (if not done yet) |
| **Already updated, reconnect** | ⏭️ Skips (once per day) |
| **New day, PC starts** | ✅ Updates again |
| **Internet down all day** | ⏭️ Waits for next day |

---

## ⚡ Performance

```
Check if already updated: <0.1s
Check internet: ~0.5s
Download + Import (if needed): ~20s
Skip (if already done): ~0.5s
```

**Very fast, doesn't slow down startup!**

---

## 🆚 Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Midnight** | Predictable time | PC might be off | Always-on PCs |
| **Startup** | Guaranteed to run | Delays startup slightly | Most users ⭐ |
| **Network Event** | Instant when online | Complex setup | IT pros |
| **Smart (this!)** | Best of all | Needs setup | Everyone! ⭐⭐⭐ |

---

## 🔧 Customization

### **Change Update Sources:**

Edit `smart-update.js` line ~17:
```javascript
const UPDATE_SOURCES = ['updates', 'cnam_reimbursed'];

// Add more:
const UPDATE_SOURCES = ['updates', 'cnam_reimbursed', 'removed'];
```

### **Force Re-Update Today:**

Delete the state file:
```bash
del logs\last-update.json
node smart-update.js
```

---

## 🆘 Troubleshooting

### **Not running at startup?**
```
Solutions:
1. Check shortcut in shell:startup folder
2. Verify path is correct
3. Run manually to test
4. Check logs\smart-update.log
```

### **"Already updated" but want to force?**
```bash
del logs\last-update.json
smart-update.bat
```

### **No internet check fails?**
```
Solutions:
1. Check firewall allows node.exe
2. Verify can access https://spot.tn
3. Try on different network
```

---

## ✅ Setup Checklist

- [ ] Tested `node smart-update.js` manually - Works!
- [ ] Tested again - Shows "Already updated" ✅
- [ ] Deleted last-update.json and tested - Updates again ✅
- [ ] Created shortcut in Startup folder
- [ ] Restarted PC to test startup update
- [ ] Checked logs\smart-update.log - Success!
- [ ] All set! 🎉

---

## 🎉 Benefits

### **vs Midnight Schedule:**
- ✅ Works even if PC off at night
- ✅ Updates when you're actually using it
- ✅ Adapts to your schedule

### **vs Manual:**
- ✅ Automatic, no forgetting
- ✅ Always up-to-date
- ✅ No daily reminder needed

### **Smart Features:**
- ✅ Once per day (not excessive)
- ✅ Internet-aware (won't fail offline)
- ✅ Fast (bulk import)
- ✅ Logged (full audit trail)
- ✅ Silent (doesn't interrupt work)

---

## 📞 Summary

**You now have:**
- ✅ Smart auto-update when internet available
- ✅ Once-per-day protection (won't spam)
- ✅ Internet connection checking
- ✅ Startup integration (Option 1)
- ✅ Network event trigger (Option 2)
- ✅ Fast bulk import
- ✅ Complete logging

**Perfect for real-world pharmacy use!** 💊✨

---

**Recommended Setup:** Option 1 (On Startup) - Simplest and most reliable!
