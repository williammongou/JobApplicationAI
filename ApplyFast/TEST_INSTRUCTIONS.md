# ApplyFast Extension - Testing Instructions

## 🧪 Quick Test Guide

### 1. Reload Extension
```
1. Open chrome://extensions
2. Find "ApplyFast"
3. Click refresh icon ↻
4. Go to LinkedIn jobs page
```

### 2. Test "...more" Expansion

**What to test:**
- Open a LinkedIn job with a long description
- Look for "...more" in the "About the job" section
- The extension should automatically:
  ✓ Click the "...more" button
  ✓ Expand the full description
  ✓ Scrape complete job details
  ✓ Show accurate match score

**Expected behavior:**
- Panel appears within 2-3 seconds
- Shows match score with full job analysis
- No "Page not loaded yet" errors
- Skills are correctly identified from full description

### 3. Enable Debug Mode (Optional)

To see what's happening:

1. Open `content.js`
2. Line 15: Change `const DEBUG = false;` to `const DEBUG = true;`
3. Reload extension
4. Open console (F12) while on LinkedIn
5. You'll see logs like:
   - `[ApplyFast] Expanded LinkedIn description via button`
   - `[ApplyFast] Scrape successful: {titleLength: 45, descriptionLength: 2340}`

### 4. Test Different Job Types

| Job Type | What to Check |
|----------|---------------|
| **Long description with "...more"** | Auto-expands and scrapes full text |
| **Short description (no "...more")** | Works normally, no errors |
| **Job with US Citizenship requirement** | Shows "US Citizenship" label |
| **Job with clearance requirement** | Shows "Clearance Req" label |
| **Job with many skills** | Shows matched skills (green) and missing (red) |

### 5. Test Auto-Refresh

1. Click a job in LinkedIn sidebar
2. Panel should disappear
3. New panel appears for new job within 1-2 seconds
4. Repeat 3-4 times quickly
5. Panel should update smoothly each time

### 6. Check Console for Errors

**Good signs:**
- 0-5 errors total
- Logs show "Expanded LinkedIn description"
- No infinite loops
- No MutationObserver spam

**Bad signs (report if you see these):**
- 100+ errors
- "Failed to get full description after all attempts"
- Extension freezes
- Memory usage > 10MB

### 7. Performance Check

Open Chrome Task Manager (`Shift + Esc`):
- Find "Extension: ApplyFast"
- Memory: Should be < 10MB
- CPU: Should be < 2% when idle

## 🐛 Common Issues & Solutions

### Issue: "Page not loaded yet" appears frequently
**Solution:**
- Wait 3-5 seconds after clicking a job
- Try enabling DEBUG mode to see what's happening
- Check if description has "...more" that wasn't expanded

### Issue: Panel doesn't update when clicking jobs
**Solution:**
- Refresh the LinkedIn page (F5)
- Reload extension
- Check console for errors

### Issue: Match score seems wrong
**Solution:**
- Check your profile settings (click extension icon → settings)
- Verify skills are entered correctly (comma-separated)
- Make sure years of experience is filled in

### Issue: "...more" still not expanding
**Solution:**
- Enable DEBUG mode
- Check console for "Expanded LinkedIn description" message
- If not appearing, LinkedIn may have changed their HTML structure
- Take a screenshot and report the issue

## 📊 What Success Looks Like

✅ **Working correctly:**
- Panel shows within 2-3 seconds
- "...more" expands automatically
- Match score appears with color (green/yellow/red)
- Skills list shows matched (✓) and missing skills
- Clicking different jobs refreshes the panel
- Console shows < 10 errors
- Memory usage < 10MB

❌ **Needs fixing:**
- Panel takes > 5 seconds to appear
- "Page not loaded yet" errors persist
- Match score is 0% for all jobs
- Console has 100+ errors
- Extension freezes browser
- Memory usage > 20MB

## 🔍 Debug Checklist

If something's wrong, check these in order:

1. ☐ Extension is enabled in chrome://extensions
2. ☐ You're on a LinkedIn job page (URL contains `/jobs/view/`)
3. ☐ You've set up your profile in extension settings
4. ☐ You've reloaded the extension after code changes
5. ☐ You've refreshed the LinkedIn page
6. ☐ Console shows no critical errors
7. ☐ DEBUG mode is enabled if you need logs

## 💡 Pro Tips

- **Fast iteration**: Keep Chrome DevTools open, reload extension, refresh page
- **Profile setup**: Add 5-10 skills for better matching
- **Test variety**: Try jobs from different companies/industries
- **Monitor console**: Errors appear in real-time
- **Use filters**: In console, filter by "ApplyFast" to see only extension logs
