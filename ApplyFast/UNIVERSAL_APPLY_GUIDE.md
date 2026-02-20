# Universal Job Application Bot - Quick Start Guide

## 🚀 What It Does

Automatically applies to jobs on **ANY** website by:
- Finding and clicking the Apply button
- Uploading your resume
- Auto-filling standard fields (name, email, phone, location)
- Answering screening questions using AI
- Pausing for your review before submitting
- Verifying successful submission

## 📋 Prerequisites

1. **Python 3.8+** installed
2. **API Backend running** on localhost:8000
3. **Playwright browser** installed

## ⚙️ Installation

### Step 1: Install Python Dependencies

```bash
pip install -r requirements.txt
```

### Step 2: Install Playwright Browser

```bash
playwright install chromium
```

This downloads the Chromium browser that Playwright will use.

### Step 3: Start the API Backend

```bash
python apply_fast_api.py
```

Keep this running in a separate terminal. You should see:
```
INFO:     Uvicorn running on http://localhost:8000
```

## 🎯 Usage

### Basic Usage

```bash
python universal_apply.py <job_url> <resume_path>
```

**Example:**
```bash
python universal_apply.py "https://www.linkedin.com/jobs/view/123456" "resume.pdf"
```

### Full Usage with Job Details

```bash
python universal_apply.py <job_url> <resume_path> <job_title> <company> <location>
```

**Example:**
```bash
python universal_apply.py "https://boards.greenhouse.io/company/jobs/123" "resume.pdf" "Software Engineer" "Acme Corp" "Austin, TX"
```

### Command-Line Arguments

| Argument | Required | Description | Example |
|----------|----------|-------------|---------|
| `job_url` | ✅ Yes | Full URL to job posting | `"https://..."` |
| `resume_path` | ✅ Yes | Path to resume PDF | `"resume.pdf"` |
| `job_title` | ❌ No | Job title (for AI context) | `"Senior SWE"` |
| `company` | ❌ No | Company name (for AI context) | `"Google"` |
| `location` | ❌ No | Job location (affects auto-fill address) | `"Austin, TX"` |

## 📍 Dynamic Address Feature

Your location on the application **automatically matches** the resume generator logic:

| Job Location | Address Used |
|-------------|--------------|
| Oklahoma City, OK | 2712 Dennis Drive, Yukon, OK 73099 |
| Tulsa, OK | 2712 Dennis Drive, Yukon, OK 73099 |
| Austin, TX | Austin, TX |
| Denver, CO | Denver, CO |
| San Francisco, CA | San Francisco, CA |
| Remote | Yukon, OK |
| Seattle, WA | Yukon, OK |

**Relocatable States:** TX, AK, CO, KS, GA, IL, CA, NY

## 🎬 What You'll See

1. **Chrome browser opens** (visible, not headless)
2. **Navigation** to job page
3. **Login check** - "Are you logged in? Press ENTER when ready"
4. **Apply button** - Script finds and clicks Apply
5. **Resume upload** - Automatically uploads your resume
6. **Form filling** - Fills name, email, phone, location, etc.
7. **Screening questions** - AI answers unknown questions
8. **Review screen** - Shows summary and waits for your confirmation
9. **Submit** - Clicks final submit button
10. **Verification** - Confirms success or shows error

## ⏸️ User Review Step

Before submitting, you'll see:

```
======================================================================
📋 APPLICATION REVIEW
======================================================================
  Standard fields filled: 5
  Screening questions answered: 2
  Resume uploaded: Yes
======================================================================

⚠️  Application ready to submit!
   Press ENTER to submit
   Press Ctrl+C to cancel
```

**Important:** This is your chance to review the application in the browser before final submission!

## 🧪 Testing

### Test 1: Simple Application (LinkedIn Easy Apply)

```bash
python universal_apply.py "https://www.linkedin.com/jobs/view/123456" "resume.pdf"
```

### Test 2: Full Application with Greenhouse

```bash
python universal_apply.py "https://boards.greenhouse.io/company/jobs/123" "resume.pdf" "Software Engineer" "Tech Startup" "San Francisco, CA"
```

## 🛠️ Troubleshooting

### Error: "Playwright not installed"

**Solution:**
```bash
pip install playwright
playwright install chromium
```

### Error: "Connection refused to localhost:8000"

**Solution:** Start the API backend first:
```bash
python apply_fast_api.py
```

### Error: "Resume file not found"

**Solution:** Use full path to resume:
```bash
python universal_apply.py "https://..." "C:\Users\willi\Documents\resume.pdf"
```

### Error: "Apply button not found"

**Possible causes:**
1. Page requires login - make sure you're logged in when prompted
2. Job is closed - check if job is still active
3. Different Apply button text - script will try multiple strategies

**What the script tries:**
- Text patterns: "Apply", "Quick Apply", "Easy Apply", "Submit Application"
- Link patterns: href containing "apply", "application"
- Class patterns: class containing "apply"

### Browser closes immediately

**Cause:** Script encountered an error

**Solution:** Check console output for error messages. Common issues:
- Not logged in to job site
- Resume file doesn't exist
- Apply button is behind a modal or popup

## 📊 What Gets Auto-Filled

The script automatically fills these common fields:

- ✅ **Name** (full name, first name, last name)
- ✅ **Email** (williammongou@gmail.com)
- ✅ **Phone** ((580) 447-9539 or 5804479539)
- ✅ **Location** (dynamic based on job location)
- ✅ **Work Authorization** (Yes)
- ✅ **Sponsorship** (No)
- ✅ **Years of Experience** (8)
- ✅ **Willing to Relocate** (Yes)
- ✅ **Clearance** (None)
- ✅ **Citizenship** (US Citizen)

**Screening questions** (anything not in the above list) are answered using AI via the `/answer-question` API endpoint.

## 🤖 AI Integration

When the script encounters an unknown question:

1. Extracts the question text from the label
2. Sends to `http://localhost:8000/answer-question` with:
   - Question text
   - User profile (William Mongou's profile)
   - Job context (title, company, location)
3. Receives AI-generated answer with confidence score
4. Fills the answer if confidence > 70%

**Example:**
```
Question: "Why do you want to work at Acme Corp?"
AI Answer: "I'm excited about Acme Corp's mission to..."
Confidence: 85%
```

## 🔒 Privacy & Safety

- ✅ **Runs locally** - All data stays on your machine
- ✅ **Visible browser** - You can watch everything happen
- ✅ **Review step** - Final confirmation before submission
- ✅ **Real profile** - Uses your actual information from USER_PROFILE
- ✅ **No data collection** - Script doesn't send data anywhere except your local API

## 🎯 Success Criteria

The script considers application successful if:

1. **URL changed** - Redirected to confirmation page
2. **Success text found** - Page contains "submitted", "received", "thank you"
3. **Apply button gone** - Original Apply button no longer exists

If verification fails, you'll see a screenshot at `error_screenshot.png`.

## 📝 Logs

The script prints detailed progress:

```
🌐 Opening job page...
✅ Job page loaded
🔍 Finding Apply button...
✅ Apply button found: button (text: "Apply Now")
📄 Uploading resume...
✅ Resume uploaded successfully
📝 Filling standard fields...
✅ Filled 5 standard fields
❓ Handling screening questions...
✅ Answered 2 screening questions
📋 APPLICATION REVIEW
⚠️  Application ready to submit!
✅ Application submitted successfully!
```

## 🚨 Important Notes

1. **Stay logged in** - Make sure you're logged into the job site when the script prompts
2. **Valid resume** - Use an existing PDF resume file
3. **API must be running** - Keep `apply_fast_api.py` running in background
4. **Internet connection** - Required for page loading and API calls
5. **Be honest** - The AI uses your real profile and won't fabricate experience

## 🔄 Typical Workflow

1. Find job posting URL
2. Copy URL
3. Make sure API is running (`python apply_fast_api.py`)
4. Run script: `python universal_apply.py "<url>" "resume.pdf"`
5. Wait for login prompt, press ENTER when logged in
6. Watch browser auto-fill application
7. Review at confirmation screen
8. Press ENTER to submit
9. ✅ Done!

## 💡 Tips

- **Use full URLs** - Include https://
- **Quote URLs** - Put quotes around URLs with special characters
- **Keep browser visible** - Don't minimize, so you can monitor progress
- **Check review screen** - Always verify before pressing ENTER
- **Test with LinkedIn Easy Apply first** - Simplest to start with

## 🆘 Support

If you encounter issues:

1. Check error messages in console
2. Look at `error_screenshot.png` if generated
3. Verify API is running on localhost:8000
4. Make sure you're logged into the job site
5. Try a different job posting to isolate the issue

---

**Built with ❤️ for automated job applications**
