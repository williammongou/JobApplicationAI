# iCIMS Integration Guide

## Overview

The universal_apply.py bot now includes specialized handling for iCIMS application systems with automatic detection and workflow optimization.

## Features

### 1. **Automatic iCIMS Detection**
- Detects iCIMS sites by URL and page content
- Switches to iCIMS-specific workflow automatically

### 2. **iCIMS-Specific Apply Button**
- Finds and clicks "Apply for this job online" button
- Handles iCIMS job posting page layout

### 3. **Two-Step Login Process**
- **Step 1**: Enters email and clicks "Next"
- **Step 2**: Waits for password popup and enters password
- Automatically fills:
  - Email: `williammongou@gmail.com`
  - Password: `@Pplication2026`

### 4. **"Log In Faster" Prompt Handler**
- Automatically clicks "Not on this device"
- Skips biometric/faster login setup

### 5. **Resume Upload**
- Clicks "My Computer" button specifically
- Handles iCIMS resume upload interface
- Falls back to direct file input if needed

### 6. **iCIMS Question Handling**
Automatically answers common iCIMS questions:
- **Education level** → Selects "Bachelor's Degree"
- **Work authorization** → Selects "Yes"
- **Visa sponsorship** → Selects "No"
- **Age verification** → Selects "Yes" (18+)
- **Non-compete agreement** → Selects "No"
- **Relative at company** → Fills "N/A"

### 7. **Multi-Page Navigation**
- Clicks "Next" button (not "Finish Later")
- Processes each question page
- Detects thank you page automatically

### 8. **Status Display**
Visual status bar appears at top of page:
- **Blue**: Info - "Application in progress..."
- **Green**: Success - "Application submitted!"
- **Orange**: Warning - "Please upload resume manually"
- **Red**: Error - "Unseen application format"

### 9. **Sound Notifications**
Bot plays a "ding" sound when it needs help:
- Can't find upload button
- Can't find Next button
- Login failed
- Any critical error

## iCIMS Workflow

```
1. Navigate to job page
   ↓
2. Detect iCIMS system
   ↓
3. Click "Apply for this job online"
   ↓
4. Login Step 1: Enter email → Click Next
   ↓
5. Login Step 2: Enter password → Click Log In
   ↓
6. Click "Not on this device" (skip faster login)
   ↓
7. Click "My Computer" → Upload resume
   ↓
8. FOR EACH PAGE:
   - Fill standard fields
   - Answer iCIMS questions
   - Click "Next" button
   ↓
9. Detect "Thank You" page OR final Submit
   ↓
10. User review + confirmation
   ↓
11. Submit application
   ↓
12. Verify success
```

## Status Messages

### During Application
- `🤖 ApplyFast: Application starting...`
- `🤖 ApplyFast: iCIMS detected - applying...`
- `🤖 ApplyFast: Clicking Apply button...`
- `🤖 ApplyFast: Logging in...`
- `🤖 ApplyFast: Loading application form...`
- `🤖 ApplyFast: Uploading resume...`
- `🤖 ApplyFast: Filling form (page 1)...`
- `🤖 ApplyFast: Filling form (page 2)...`

### User Action Required
- `⚠️ Please login manually` (+ ding sound)
- `⚠️ Please upload resume manually` (+ ding sound)
- `⚠️ Please click Continue/Submit manually` (+ ding sound)
- `⚠️ Review application - Press ENTER in terminal to submit` (+ ding sound)
- `⚠️ Please submit the application manually` (+ ding sound)

### Success/Error
- `✅ Application submitted successfully!`
- `⚠️ Application status unknown - please verify` (+ ding sound)
- `❌ Error: Apply button not found` (+ ding sound)
- `❌ Application cancelled by user`

## Sound Notifications

The bot plays Windows notification sounds when:
1. **Upload fails** - Resume upload unsuccessful
2. **Login fails** - Can't complete login
3. **Button not found** - Can't find Next/Submit
4. **Review ready** - Application ready for user review
5. **Manual action needed** - User needs to intervene

**Sound Types:**
- Windows MessageBeep (MB_ICONEXCLAMATION)
- Fallback: 1000 Hz beep for 300ms
- Final fallback: Terminal bell (\a)

## Error Handling

### Graceful Degradation
If iCIMS handler fails, bot falls back to generic workflow:
- Uses standard Apply button detection
- Uses standard login flow
- Uses standard resume upload
- Uses generic question answering

### Manual Intervention Points
Bot will pause and prompt user when:
1. Login credentials don't work
2. Resume upload button not found
3. Next/Continue button not found
4. Submit button not found
5. Unseen question format encountered

## Usage Example

```bash
# iCIMS application (auto-detected)
python universal_apply.py \
  "https://careers-heart.icims.com/jobs/17151/marketing-manager/job" \
  "resume.pdf" \
  "Marketing Manager" \
  "American Heart Association" \
  "Dallas, TX"
```

Bot will:
1. ✅ Detect iCIMS automatically
2. ✅ Click "Apply for this job online"
3. ✅ Login with williammongou@gmail.com
4. ✅ Skip "Log In Faster" prompt
5. ✅ Upload resume via "My Computer"
6. ✅ Answer all standard questions
7. ✅ Navigate through multiple pages
8. ✅ Pause for review
9. ✅ Submit application
10. ✅ Verify success

## Question Mappings

### Education Level
- **Question**: "What is your highest level of education?"
- **Answer**: "Bachelor's Degree"
- **Why**: Matches your BS in Software Engineering

### Work Authorization
- **Question**: "Are you legally authorized to work in the United States?"
- **Answer**: "Yes"
- **Why**: You're a US Citizen

### Visa Sponsorship
- **Question**: "Will you now or in the future require visa sponsorship?"
- **Answer**: "No"
- **Why**: US Citizen doesn't need sponsorship

### Non-Compete Agreement
- **Question**: "Are you currently subject to a non-compete agreement?"
- **Answer**: "No"
- **Why**: Standard safe answer

### Age Verification
- **Question**: "Are you at least 18 years of age?"
- **Answer**: "Yes" (or appropriate selection)
- **Why**: Legal requirement

### Relative at Company
- **Question**: "Do you have a relative who works at [company]?"
- **Answer**: "N/A"
- **Why**: Standard safe answer

### EEO Information
- **Handled**: Gender, Race (voluntary)
- **Action**: Bot fills if detectable, otherwise skips

## Files

### Main Files
- `universal_apply.py` - Main bot with iCIMS integration
- `icims_handler.py` - iCIMS-specific functions
- `apply_fast_api.py` - Backend API (unchanged)
- `resume_generator.py` - Resume generation (unchanged)

### Configuration
- Email: `williammongou@gmail.com` (in USER_PROFILE)
- Password: `@Pplication2026` (in USER_PROFILE)
- All standard profile fields

## Troubleshooting

### Bot doesn't detect iCIMS
- Check URL contains "icims.com"
- Check page source contains "icims"
- Manually verify iCIMS handler is imported

### Login fails
- Verify email/password in USER_PROFILE
- Check for CAPTCHA (requires manual intervention)
- Verify account exists

### Resume upload fails
- Check resume file exists at path
- Check "My Computer" button is visible
- Try manual upload when prompted

### Questions not filled
- Check question format matches expectations
- Verify dropdown options exist
- Use AI answering for custom questions

### Next button not found
- Check for "Finish Later" vs "Next"
- Look for "Continue" or "Proceed" alternatives
- Use manual intervention when prompted

## Advanced Features

### Status Message Customization
Messages can be customized in code:
```python
await show_status_message(page, "Your custom message", "info|success|warning|error")
```

### Sound Customization
Change notification sound:
```python
winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)  # Warning
winsound.MessageBeep(winsound.MB_ICONERROR)        # Error
winsound.MessageBeep(winsound.MB_OK)               # Success
```

### Adding New iCIMS Questions
Edit `icims_handler.py`:
```python
# Add new question handler
new_question_selectors = ['select[name*="custom"]']
for selector in new_question_selectors:
    select = await page.query_selector(selector)
    if select:
        # Handle question
        ...
```

## Testing

Test with real iCIMS sites:
- American Heart Association
- Various hospital systems
- Corporate career pages using iCIMS

Monitor console output for:
- ✅ Green checkmarks - Success
- ⚠️ Warning symbols - Need attention
- ❌ Red X - Errors
- ℹ️ Info symbols - Status updates

---

**Built with ❤️ for iCIMS job applications**
