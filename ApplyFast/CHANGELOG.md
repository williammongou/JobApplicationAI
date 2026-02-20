# Universal Apply Bot - Changelog

## Version 2.0 - Enhanced Multi-Page Support

### New Features

#### 1. **Autofill with Resume Popup Handler**
- Automatically detects and clicks "Autofill with Resume" button when it appears in popups after clicking Apply
- Supported text patterns:
  - "Autofill with Resume"
  - "Auto-fill with Resume"
  - "Apply with Resume"
  - "Use Resume"

#### 2. **Automatic Authentication**
- Detects when Sign In or Create Account is required
- Automatically attempts to sign in using credentials:
  - Email: `williammongou@gmail.com`
  - Password: `@Pplication2026`
- Workflow:
  1. First tries to find and click "Sign In" link
  2. Fills email and password fields
  3. Clicks submit
  4. If Sign In fails, tries "Create Account" link
  5. Creates new account with same credentials if needed

#### 3. **Enhanced Resume Upload**
- **Priority 1:** Look for "Autofill with Resume" button (popup handler)
- **Priority 2:** Detect drop zones with text:
  - "Drop file here"
  - "Select file"
  - "Upload file"
  - "Upload resume"
  - "Attach Resume"
  - "Choose file"
- **Priority 3:** Direct file input detection
- **Priority 4:** Click upload button then find file input

#### 4. **Multi-Page Form Handling**
- Automatically processes multi-page application forms
- Workflow for each page:
  1. Fill all standard fields on current page
  2. Answer all screening questions on current page
  3. Try to upload resume (in case site asks on later pages)
  4. Look for Next/Continue/Submit button
  5. Click Next/Continue to proceed to next page
  6. Repeat until Submit button is found
- Safety limit: 10 pages maximum
- Tracks total fields filled and questions answered across all pages

#### 5. **Improved Button Detection**
- New `find_next_or_submit_button()` function
- Priority order:
  1. Next
  2. Continue
  3. Save and Continue
  4. Proceed
  5. Submit
- Only selects visible buttons (ignores hidden elements)
- Stops clicking "Next" when final "Submit" button is detected

### Improvements

#### Resume Upload
- Now tries multiple strategies in order of effectiveness
- Better handling of dynamic file inputs that appear after clicking buttons
- Supports Workday-style "Autofill with Resume" popups

#### Authentication
- Fully automated sign-in process
- Fallback to account creation if sign-in doesn't exist
- Uses hardcoded credentials from `USER_PROFILE`

#### Form Filling
- Processes each page completely before moving to next
- Re-attempts resume upload on each page
- Better handling of multi-step applications

#### User Review
- Shows total pages processed
- Shows cumulative fields filled across all pages
- Shows cumulative questions answered across all pages

### Technical Details

#### New Functions
- `handle_authentication()` - Handles Sign In and Create Account flows
- `find_next_or_submit_button()` - Finds Next/Continue/Submit buttons in priority order
- Enhanced `upload_resume()` - 4-strategy approach with autofill popup support

#### Updated Workflow
```
1. Navigate to job page
2. Handle authentication (NEW)
3. Click Apply button
4. Wait for form to load
5. Upload resume (with autofill popup detection)
6. FOR EACH PAGE:
   a. Fill standard fields
   b. Answer screening questions
   c. Try resume upload again
   d. Find Next/Continue/Submit button
   e. If Submit button → break loop
   f. If Next/Continue → click and wait for next page
7. User review screen
8. Click final Submit
9. Verify submission
```

### Configuration

#### User Credentials (in USER_PROFILE)
```python
{
    "email": "williammongou@gmail.com",
    "password": "@Pplication2026",
    ...
}
```

#### Supported Multi-Page Buttons
- "Next"
- "Continue"
- "Save and Continue"
- "Save & Continue"
- "Proceed"

#### Final Submit Buttons
- "Submit"
- "Submit Application"
- "Send Application"
- "Apply Now"
- "Complete Application"
- "Send"

### Usage Example

```bash
python universal_apply.py "https://pwc.wd3.myworkdayjobs.com/..." "resume.docx" "AI Engineer" "PwC" "Atlanta, GA"
```

The bot will now:
1. ✅ Sign in automatically if prompted
2. ✅ Click "Autofill with Resume" if popup appears
3. ✅ Upload resume to drop zones
4. ✅ Process multiple pages automatically
5. ✅ Fill all fields before clicking Next
6. ✅ Pause for your review before final submit

### Breaking Changes
None - fully backward compatible

### Bug Fixes
- Fixed issue where resume upload was attempted only once
- Fixed issue where Next button was not detected
- Fixed issue where authentication blocked the application process
- Fixed issue where multi-page forms only filled first page

---

## Version 1.0 - Initial Release

Initial implementation with:
- Apply button detection
- Resume upload
- Standard field auto-fill
- Screening question handling via AI
- User review step
- Submission verification
