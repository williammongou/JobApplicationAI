"""
Universal Job Application Bot
Automatically fills and submits job applications on any website using Playwright
"""

import asyncio
import random
import time
import requests
import winsound
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from playwright.async_api import async_playwright, Page, Browser, ElementHandle

# Import iCIMS handler
try:
    from icims_handler import (
        is_icims_site, handle_icims_apply_button, handle_icims_login,
        handle_icims_faster_login_prompt, handle_icims_resume_upload,
        handle_icims_questions, find_icims_next_button, check_icims_thank_you,
        play_notification_sound
    )
    ICIMS_HANDLER_AVAILABLE = True
except ImportError:
    ICIMS_HANDLER_AVAILABLE = False
    print("⚠️  iCIMS handler not available")

    # Fallback notification function
    async def play_notification_sound():
        try:
            winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
        except:
            print("\a")

# API configuration
API_BASE = "http://localhost:8000"

# User profile for auto-fill
USER_PROFILE = {
    "name": "William Mongou",
    "firstName": "William",
    "lastName": "Mongou",
    "email": "williammongou@gmail.com",
    "phone": "(580) 447-9539",
    "phoneNumber": "5804479539",
    "password": "@Pplication2026",
    "work_authorization": "Yes",
    "sponsorship_needed": "No",
    "years_experience": 8,
    "willing_to_relocate": "Yes",
    "clearance": "None",
    "citizenship": "US Citizen"
}


def get_dynamic_location(job_location: str) -> str:
    """Get location based on job location (same logic as resume generator)"""
    if not job_location:
        return "Yukon, OK"

    job_location_lower = job_location.lower()

    # Oklahoma
    if any(keyword in job_location_lower for keyword in ['oklahoma', 'ok ', 'okc', 'tulsa', 'norman', 'yukon']):
        return "Yukon, OK"

    # Relocatable states
    relocatable_states = {
        'tx': 'Texas',
        'ak': 'Alaska',
        'co': 'Colorado',
        'ks': 'Kansas',
        'ga': 'Georgia',
        'il': 'Illinois',
        'ca': 'California',
        'ny': 'New York'
    }

    for state_code, state_name in relocatable_states.items():
        if state_code in job_location_lower or state_name.lower() in job_location_lower:
            # Extract city if possible
            import re
            city_match = re.search(r'([A-Za-z\s]+),\s*([A-Z]{2})', job_location)
            if city_match:
                return f"{city_match.group(1).strip()}, {city_match.group(2).strip()}"
            return state_name

    # Default
    return "Yukon, OK"


async def show_status_message(page: Page, message: str, status_type: str = "info"):
    """Inject a status message overlay on the page"""
    try:
        # Color based on status type
        colors = {
            "info": "#0066cc",      # Blue
            "success": "#008000",    # Green
            "error": "#cc0000",      # Red
            "warning": "#ff9900"     # Orange
        }
        color = colors.get(status_type, colors["info"])

        await page.evaluate(f'''() => {{
            // Remove existing status message
            const existing = document.getElementById('applyfast-status');
            if (existing) existing.remove();

            // Create new status message
            const div = document.createElement('div');
            div.id = 'applyfast-status';
            div.textContent = '{message}';
            div.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background-color: {color};
                color: white;
                padding: 15px 20px;
                text-align: center;
                font-size: 16px;
                font-weight: bold;
                font-family: Arial, sans-serif;
                z-index: 999999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(div);
        }}''')
    except Exception:
        pass  # Ignore errors in status display


async def remove_status_message(page: Page):
    """Remove the status message overlay"""
    try:
        await page.evaluate('''() => {
            const existing = document.getElementById('applyfast-status');
            if (existing) existing.remove();
        }''')
    except Exception:
        pass


async def human_delay(min_sec: float = 1.0, max_sec: float = 3.0):
    """Add realistic human-like delay"""
    await asyncio.sleep(random.uniform(min_sec, max_sec))


async def scroll_into_view(page: Page, element: ElementHandle):
    """Scroll element into view smoothly"""
    await element.scroll_into_view_if_needed()
    await human_delay(0.5, 1.0)


async def human_click(page: Page, selector: str, timeout: int = 5000) -> bool:
    """Click with human-like behavior"""
    try:
        element = await page.wait_for_selector(selector, timeout=timeout)
        if element:
            await scroll_into_view(page, element)
            await element.hover()
            await human_delay(0.3, 0.7)
            await element.click()
            await human_delay(0.5, 1.0)
            return True
    except Exception as e:
        print(f"  ⚠️  Click failed for {selector}: {e}")
    return False


async def human_type(page: Page, selector: str, text: str, timeout: int = 5000) -> bool:
    """Type with human-like speed"""
    try:
        element = await page.wait_for_selector(selector, timeout=timeout)
        if element:
            await scroll_into_view(page, element)
            await element.click()
            await human_delay(0.2, 0.4)
            # Type with random delays between keystrokes
            for char in text:
                await element.type(char, delay=random.uniform(50, 150))
            await human_delay(0.3, 0.6)
            return True
    except Exception as e:
        print(f"  ⚠️  Type failed for {selector}: {e}")
    return False


async def handle_authentication(page: Page) -> bool:
    """Handle Sign In or Create Account prompts"""
    print("\n🔐 Checking for authentication requirements...")

    # Look for Sign In or Create Account prompts
    auth_indicators = [
        "sign in", "log in", "create account", "create an account",
        "register", "sign up"
    ]

    page_text = await page.inner_text('body')
    page_text_lower = page_text.lower()

    needs_auth = any(indicator in page_text_lower for indicator in auth_indicators)

    if not needs_auth:
        print("  ℹ️  No authentication required")
        return True

    # First, try to find and click "Sign In" link
    sign_in_texts = ["Sign In", "Log In", "sign in", "log in"]

    for sign_in_text in sign_in_texts:
        try:
            # Look for links or buttons with "Sign In" text
            elements = await page.query_selector_all('a, button, span[role="button"]')
            for element in elements:
                text = await element.inner_text()
                if sign_in_text.lower() == text.lower().strip():
                    print(f"  🖱️  Clicking Sign In: {text.strip()}")
                    await element.click()
                    await human_delay(2, 3)
                    break
        except Exception:
            continue

    # Now look for email and password fields
    try:
        # Wait for email field
        email_selectors = [
            'input[type="email"]',
            'input[name*="email"]',
            'input[id*="email"]',
            'input[placeholder*="email" i]'
        ]

        email_field = None
        for selector in email_selectors:
            email_field = await page.query_selector(selector)
            if email_field:
                break

        password_selectors = [
            'input[type="password"]',
            'input[name*="password"]',
            'input[id*="password"]'
        ]

        password_field = None
        for selector in password_selectors:
            password_field = await page.query_selector(selector)
            if password_field:
                break

        if email_field and password_field:
            print(f"  ✍️  Filling email: {USER_PROFILE['email']}")
            await email_field.fill(USER_PROFILE['email'])
            await human_delay(0.5, 1.0)

            print(f"  ✍️  Filling password: ********")
            await password_field.fill(USER_PROFILE['password'])
            await human_delay(0.5, 1.0)

            # Click Sign In / Log In button
            submit_buttons = await page.query_selector_all('button[type="submit"], input[type="submit"], button')
            for button in submit_buttons:
                text = await button.inner_text() if await button.tag_name() == 'button' else await button.get_attribute('value')
                if text and any(s in text.lower() for s in ['sign in', 'log in', 'submit', 'continue']):
                    print(f"  🖱️  Clicking: {text.strip()}")
                    await button.click()
                    await human_delay(3, 5)
                    print("  ✅ Signed in successfully")
                    return True

        # If Sign In didn't work, try Create Account
        print("  ℹ️  Sign In not found, trying Create Account...")

        create_account_texts = ["Create Account", "create account", "Sign Up", "sign up", "Register", "register"]

        for create_text in create_account_texts:
            try:
                elements = await page.query_selector_all('a, button, span[role="button"]')
                for element in elements:
                    text = await element.inner_text()
                    if create_text.lower() in text.lower().strip():
                        print(f"  🖱️  Clicking Create Account: {text.strip()}")
                        await element.click()
                        await human_delay(2, 3)

                        # Fill email and password for account creation
                        email_field = await page.query_selector('input[type="email"], input[name*="email"]')
                        password_field = await page.query_selector('input[type="password"]')

                        if email_field and password_field:
                            print(f"  ✍️  Creating account with email: {USER_PROFILE['email']}")
                            await email_field.fill(USER_PROFILE['email'])
                            await human_delay(0.5, 1.0)

                            await password_field.fill(USER_PROFILE['password'])
                            await human_delay(0.5, 1.0)

                            # Click submit
                            submit_button = await page.query_selector('button[type="submit"], input[type="submit"]')
                            if submit_button:
                                await submit_button.click()
                                await human_delay(3, 5)
                                print("  ✅ Account created successfully")
                                return True

                        break
            except Exception:
                continue

    except Exception as e:
        print(f"  ⚠️  Authentication error: {e}")
        return False

    print("  ⚠️  Could not complete authentication")
    return False


async def find_apply_button(page: Page) -> Optional[ElementHandle]:
    """Find the Apply button using multiple strategies"""
    print("\n🔍 Looking for Apply button...")

    # Strategy 1: Text-based button search
    text_patterns = [
        "Apply", "Quick Apply", "Easy Apply", "Submit Application",
        "Apply Now", "Apply for this job", "Submit Your Application"
    ]

    for pattern in text_patterns:
        try:
            # Try button elements
            buttons = await page.query_selector_all('button')
            for button in buttons:
                text = await button.inner_text()
                if pattern.lower() in text.lower():
                    print(f"  ✅ Found Apply button with text: {text.strip()}")
                    return button

            # Try link elements
            links = await page.query_selector_all('a')
            for link in links:
                text = await link.inner_text()
                if pattern.lower() in text.lower():
                    print(f"  ✅ Found Apply link with text: {text.strip()}")
                    return link
        except Exception as e:
            continue

    # Strategy 2: href-based link search
    href_patterns = ['/apply', '/job-apply', 'apply', 'application']
    for pattern in href_patterns:
        try:
            link = await page.query_selector(f'a[href*="{pattern}"]')
            if link:
                text = await link.inner_text()
                print(f"  ✅ Found Apply link by href: {text.strip()}")
                return link
        except Exception:
            continue

    # Strategy 3: Class-based search
    class_selectors = [
        'button[class*="apply"]',
        'a[class*="apply"]',
        'button[class*="Apply"]',
        'a[class*="Apply"]',
        '[data-test*="apply"]',
        '[data-testid*="apply"]'
    ]

    for selector in class_selectors:
        try:
            element = await page.query_selector(selector)
            if element:
                text = await element.inner_text()
                print(f"  ✅ Found Apply button by class: {text.strip()}")
                return element
        except Exception:
            continue

    print("  ❌ Apply button not found")
    return None


async def upload_resume(page: Page, resume_path: str) -> bool:
    """Upload resume file"""
    print("\n📄 Looking for resume upload field...")

    # Check if resume file exists
    if not Path(resume_path).exists():
        print(f"  ❌ Resume file not found: {resume_path}")
        return False

    # Strategy 1: Look for "Autofill with Resume" button (appears in popups after clicking Apply)
    autofill_texts = [
        "Autofill with Resume", "Autofill with resume", "Auto-fill with Resume",
        "Apply with Resume", "Use Resume"
    ]

    for button_text in autofill_texts:
        try:
            buttons = await page.query_selector_all('button, a, span[role="button"]')
            for button in buttons:
                text = await button.inner_text()
                if button_text.lower() in text.lower():
                    print(f"  🖱️  Clicking autofill button: {text.strip()}")
                    await button.click()
                    await human_delay(1, 2)

                    # After clicking autofill, look for file input
                    file_input = await page.query_selector('input[type="file"]')
                    if file_input:
                        await file_input.set_input_files(resume_path)
                        print(f"  ✅ Resume uploaded via autofill")
                        await human_delay(2, 3)
                        return True
        except Exception:
            continue

    # Strategy 2: Look for drop zones with specific text
    drop_zone_texts = [
        "Drop file here", "drop file here", "Drop files here",
        "Select file", "select file", "Upload file", "upload file",
        "Upload resume", "upload resume", "Attach Resume", "attach resume",
        "Choose file", "choose file"
    ]

    for drop_text in drop_zone_texts:
        try:
            # Look for elements containing this text
            elements = await page.query_selector_all('div, span, label, button')
            for element in elements:
                text = await element.inner_text()
                if drop_text.lower() in text.lower():
                    print(f"  🖱️  Found drop zone: {text.strip()}")
                    await element.click()
                    await human_delay(0.5, 1.0)

                    # Try to find file input
                    file_input = await page.query_selector('input[type="file"]')
                    if file_input:
                        await file_input.set_input_files(resume_path)
                        print(f"  ✅ Resume uploaded via drop zone")
                        await human_delay(2, 3)
                        return True
        except Exception:
            continue

    # Strategy 3: Direct file input
    file_input_selectors = [
        'input[type="file"][name*="resume"]',
        'input[type="file"][name*="cv"]',
        'input[type="file"][id*="resume"]',
        'input[type="file"][id*="cv"]',
        'input[type="file"]'
    ]

    for selector in file_input_selectors:
        try:
            file_input = await page.query_selector(selector)
            if file_input:
                await file_input.set_input_files(resume_path)
                print(f"  ✅ Resume uploaded via {selector}")
                await human_delay(1, 2)
                return True
        except Exception as e:
            continue

    # Strategy 4: Click upload button first, then upload
    upload_button_texts = [
        "Upload Resume", "Upload CV", "Upload File", "Choose File", "Attach Resume", "Browse"
    ]

    for button_text in upload_button_texts:
        try:
            buttons = await page.query_selector_all('button, a, label')
            for button in buttons:
                text = await button.inner_text()
                if button_text.lower() in text.lower():
                    print(f"  🖱️  Clicking upload button: {text.strip()}")
                    await button.click()
                    await human_delay(0.5, 1.0)

                    # Now try to find file input that may have appeared
                    file_input = await page.query_selector('input[type="file"]')
                    if file_input:
                        await file_input.set_input_files(resume_path)
                        print(f"  ✅ Resume uploaded after clicking button")
                        await human_delay(1, 2)
                        return True
        except Exception:
            continue

    print("  ⚠️  Resume upload field not found (may not be required)")
    return False


async def fill_standard_fields(page: Page, job_location: str = "") -> int:
    """Auto-fill standard form fields. Returns number of fields filled."""
    print("\n✍️  Auto-filling standard fields...")
    filled_count = 0

    # Get dynamic location
    location = get_dynamic_location(job_location)
    USER_PROFILE['location'] = location
    USER_PROFILE['city'] = location.split(',')[0].strip() if ',' in location else location

    # Field mappings: (selectors, value)
    field_mappings = [
        # Name fields
        (['input[name*="name"]', 'input[id*="name"]', 'input[placeholder*="name"]'], USER_PROFILE['name']),
        (['input[name*="firstName"]', 'input[id*="firstName"]', 'input[name*="first"]'], USER_PROFILE['firstName']),
        (['input[name*="lastName"]', 'input[id*="lastName"]', 'input[name*="last"]'], USER_PROFILE['lastName']),

        # Email
        (['input[type="email"]', 'input[name*="email"]', 'input[id*="email"]'], USER_PROFILE['email']),

        # Phone
        (['input[type="tel"]', 'input[name*="phone"]', 'input[id*="phone"]', 'input[id*="mobile"]'], USER_PROFILE['phone']),

        # Location
        (['input[name*="location"]', 'input[id*="location"]', 'input[name*="city"]', 'input[id*="city"]'], USER_PROFILE['location']),

        # Years experience
        (['input[name*="experience"]', 'input[id*="experience"]', 'input[name*="years"]'], str(USER_PROFILE['years_experience'])),
    ]

    for selectors, value in field_mappings:
        for selector in selectors:
            try:
                element = await page.query_selector(selector)
                if element:
                    # Check if already filled
                    current_value = await element.input_value()
                    if current_value:
                        continue

                    await element.fill(value)
                    print(f"  ✅ Filled {selector} with: {value}")
                    filled_count += 1
                    await human_delay(0.3, 0.6)
                    break
            except Exception:
                continue

    # Handle dropdowns/selects
    dropdown_mappings = [
        # Work authorization
        (['select[name*="authorization"]', 'select[id*="authorization"]'], ['Yes', 'Authorized', 'yes', 'true']),
        # Sponsorship
        (['select[name*="sponsorship"]', 'select[id*="sponsorship"]'], ['No', 'no', 'false']),
        # Willing to relocate
        (['select[name*="relocate"]', 'select[id*="relocate"]'], ['Yes', 'yes', 'true']),
    ]

    for selectors, valid_values in dropdown_mappings:
        for selector in selectors:
            try:
                select = await page.query_selector(selector)
                if select:
                    options = await select.query_selector_all('option')
                    for option in options:
                        option_value = await option.get_attribute('value')
                        option_text = await option.inner_text()

                        if any(val.lower() in option_text.lower() or val.lower() == option_value.lower() for val in valid_values):
                            await select.select_option(value=option_value)
                            print(f"  ✅ Selected dropdown {selector}: {option_text}")
                            filled_count += 1
                            await human_delay(0.3, 0.6)
                            break
                    break
            except Exception:
                continue

    print(f"  ℹ️  Filled {filled_count} standard fields")
    return filled_count


async def answer_screening_question(question: str, job_context: Dict[str, Any]) -> Optional[str]:
    """Call API to answer screening question"""
    try:
        response = requests.post(
            f"{API_BASE}/answer-question",
            json={
                "question": question,
                "userProfile": USER_PROFILE,
                "jobContext": job_context
            },
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            return data.get('answer')
        else:
            print(f"  ⚠️  API error: {response.status_code}")
            return None
    except Exception as e:
        print(f"  ⚠️  Failed to call API: {e}")
        return None


async def handle_screening_questions(page: Page, job_context: Dict[str, Any]) -> int:
    """Handle additional screening questions using AI"""
    print("\n🤔 Looking for screening questions...")
    answered_count = 0

    # Find all textareas and long text inputs
    text_fields = await page.query_selector_all('textarea, input[type="text"]')

    for field in text_fields:
        try:
            # Check if already filled
            current_value = await field.input_value()
            if current_value:
                continue

            # Try to find associated label/question
            field_id = await field.get_attribute('id')
            field_name = await field.get_attribute('name')
            placeholder = await field.get_attribute('placeholder')

            question = None

            # Look for label
            if field_id:
                label = await page.query_selector(f'label[for="{field_id}"]')
                if label:
                    question = await label.inner_text()

            # Look for nearby text
            if not question and field_name:
                question = field_name.replace('_', ' ').replace('-', ' ').title()

            if not question and placeholder:
                question = placeholder

            if not question:
                continue

            # Skip if it looks like a standard field we already handled
            skip_patterns = ['name', 'email', 'phone', 'location', 'city', 'address']
            if any(pattern in question.lower() for pattern in skip_patterns):
                continue

            print(f"\n  ❓ Question: {question}")

            # Call API for answer
            answer = await answer_screening_question(question, job_context)

            if answer:
                await field.fill(answer)
                print(f"  ✅ Answered: {answer[:100]}...")
                answered_count += 1
                await human_delay(0.5, 1.0)
            else:
                print(f"  ⚠️  Could not generate answer - may need manual input")

        except Exception as e:
            continue

    if answered_count > 0:
        print(f"  ℹ️  Answered {answered_count} screening questions")

    return answered_count


async def find_next_or_submit_button(page: Page) -> Optional[ElementHandle]:
    """Find Next or Submit button to proceed to next page"""
    print("\n🔍 Looking for Next/Submit button...")

    # Priority order: Next > Continue > Save > Submit
    button_texts = [
        "Next", "Continue", "Save and Continue", "Save & Continue",
        "Proceed", "Submit", "Submit Application", "Send Application",
        "Apply Now", "Complete Application", "Send"
    ]

    for text in button_texts:
        try:
            buttons = await page.query_selector_all('button, input[type="submit"], a[role="button"]')
            for button in buttons:
                # Check if button is visible
                is_visible = await button.is_visible()
                if not is_visible:
                    continue

                button_text = await button.inner_text() if await button.tag_name() != 'input' else await button.get_attribute('value')
                if button_text and text.lower() == button_text.lower().strip():
                    print(f"  ✅ Found button: {button_text.strip()}")
                    return button
        except Exception:
            continue

    # Try by type if exact text match fails
    try:
        submit = await page.query_selector('input[type="submit"]:visible, button[type="submit"]:visible')
        if submit:
            print(f"  ✅ Found Submit button by type")
            return submit
    except Exception:
        pass

    print("  ⚠️  Next/Submit button not found")
    return None


async def find_submit_button(page: Page) -> Optional[ElementHandle]:
    """Find the final Submit button"""
    print("\n🔍 Looking for final Submit button...")

    submit_texts = [
        "Submit", "Submit Application", "Send Application",
        "Apply Now", "Complete Application", "Send"
    ]

    for text in submit_texts:
        try:
            buttons = await page.query_selector_all('button, input[type="submit"], a')
            for button in buttons:
                is_visible = await button.is_visible()
                if not is_visible:
                    continue

                button_text = await button.inner_text() if await button.tag_name() != 'input' else await button.get_attribute('value')
                if button_text and text.lower() in button_text.lower():
                    print(f"  ✅ Found Submit button: {button_text.strip()}")
                    return button
        except Exception:
            continue

    # Try by type
    try:
        submit = await page.query_selector('input[type="submit"]:visible, button[type="submit"]:visible')
        if submit:
            print(f"  ✅ Found Submit button by type")
            return submit
    except Exception:
        pass

    print("  ⚠️  Submit button not found")
    return None


async def verify_submission(page: Page) -> bool:
    """Check if application was successfully submitted"""
    print("\n✅ Verifying submission...")

    await human_delay(2, 4)

    success_patterns = [
        "thank you", "application received", "successfully submitted",
        "we've received", "application complete", "success"
    ]

    try:
        page_text = await page.inner_text('body')
        page_text_lower = page_text.lower()

        for pattern in success_patterns:
            if pattern in page_text_lower:
                print(f"  ✅ Confirmation found: '{pattern}'")
                return True

        # Check for success-related elements
        success_selectors = [
            '[class*="success"]',
            '[class*="confirmation"]',
            '[id*="success"]',
            '[id*="confirmation"]'
        ]

        for selector in success_selectors:
            element = await page.query_selector(selector)
            if element:
                print(f"  ✅ Success element found: {selector}")
                return True

    except Exception as e:
        print(f"  ⚠️  Verification error: {e}")

    print("  ⚠️  Could not verify submission")
    return False


async def apply_to_job(
    job_url: str,
    resume_path: str,
    job_title: str = "",
    company: str = "",
    job_location: str = "",
    headless: bool = False
) -> Dict[str, Any]:
    """
    Main function to apply to a job

    Args:
        job_url: URL of the job posting
        resume_path: Path to the generated resume file
        job_title: Job title (for context)
        company: Company name (for context)
        job_location: Job location (for dynamic address)
        headless: Run browser in headless mode (default: False for visibility)

    Returns:
        Dict with success status, company, title, url, timestamp
    """
    start_time = time.time()

    print("=" * 70)
    print("🤖 Universal Job Application Bot")
    print("=" * 70)
    print(f"Job URL: {job_url}")
    print(f"Resume: {resume_path}")
    print(f"Title: {job_title}")
    print(f"Company: {company}")
    print(f"Location: {job_location}")
    print("=" * 70)

    async with async_playwright() as p:
        # Launch browser in VISIBLE mode
        browser = await p.chromium.launch(headless=headless, slow_mo=100)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()

        try:
            # Step 1: Navigate to job page
            print(f"\n🌐 Navigating to job page...")
            await show_status_message(page, "🤖 ApplyFast: Application starting...", "info")
            await page.goto(job_url, wait_until='domcontentloaded', timeout=30000)
            await human_delay(2, 3)

            # Check if this is an iCIMS site
            is_icims = False
            if ICIMS_HANDLER_AVAILABLE:
                is_icims = await is_icims_site(page)
                if is_icims:
                    print("\n✅ Detected iCIMS application system")
                    await show_status_message(page, "🤖 ApplyFast: iCIMS detected - applying...", "info")

            # Step 2: Handle Apply button (iCIMS or generic)
            if is_icims and ICIMS_HANDLER_AVAILABLE:
                await show_status_message(page, "🤖 ApplyFast: Clicking Apply button...", "info")
                icims_applied = await handle_icims_apply_button(page)
                if not icims_applied:
                    apply_button = await find_apply_button(page)
                    if apply_button:
                        await scroll_into_view(page, apply_button)
                        await apply_button.click()
                        await human_delay(2, 4)
            else:
                # Step 3: Handle authentication if needed
                await handle_authentication(page)

                # Find and click Apply button
                apply_button = await find_apply_button(page)
                if not apply_button:
                    await show_status_message(page, "❌ Error: Apply button not found", "error")
                    await play_notification_sound()
                    screenshot_path = f"error_no_apply_button_{int(time.time())}.png"
                    await page.screenshot(path=screenshot_path)
                    return {
                        "success": False,
                        "error": "Apply button not found",
                        "screenshot": screenshot_path,
                        "url": job_url,
                        "timestamp": datetime.now().isoformat()
                    }

                await scroll_into_view(page, apply_button)
                await apply_button.click()
                print(f"  ✅ Clicked Apply button")
                await human_delay(2, 4)

            # Step 4: iCIMS-specific login handling
            if is_icims and ICIMS_HANDLER_AVAILABLE:
                await show_status_message(page, "🤖 ApplyFast: Logging in...", "info")
                await human_delay(2, 3)

                login_success = await handle_icims_login(page, USER_PROFILE['email'], USER_PROFILE['password'])
                if not login_success:
                    await show_status_message(page, "⚠️ Please login manually", "warning")
                    await play_notification_sound()
                    print("\n⚠️  Please login manually...")
                    input("Press ENTER after logging in...")

                # Handle "Log In Faster" prompt
                await handle_icims_faster_login_prompt(page)

            # Step 5: Wait for form/modal to load
            print("\n⏳ Waiting for application form to load...")
            await show_status_message(page, "🤖 ApplyFast: Loading application form...", "info")
            await page.wait_for_load_state('networkidle', timeout=10000)
            await human_delay(1, 2)

            # Step 6: Upload resume (iCIMS or generic)
            await show_status_message(page, "🤖 ApplyFast: Uploading resume...", "info")
            if is_icims and ICIMS_HANDLER_AVAILABLE:
                resume_uploaded = await handle_icims_resume_upload(page, resume_path)
                if not resume_uploaded:
                    await show_status_message(page, "⚠️ Please upload resume manually", "warning")
                    await play_notification_sound()
                    print("\n⚠️  Please upload resume manually...")
                    input("Press ENTER after uploading...")
            else:
                await upload_resume(page, resume_path)

            # Multi-page form handling loop
            total_filled = 0
            total_answered = 0
            max_pages = 10  # Safety limit

            for page_num in range(max_pages):
                print(f"\n{'='*70}")
                print(f"📝 Processing form page {page_num + 1}")
                print(f"{'='*70}")
                await show_status_message(page, f"🤖 ApplyFast: Filling form (page {page_num + 1})...", "info")

                # Step 7: Fill standard fields on current page
                filled_count = await fill_standard_fields(page, job_location)
                total_filled += filled_count

                # Step 8: Handle iCIMS-specific questions or generic screening questions
                job_context = {
                    "title": job_title,
                    "company": company,
                    "location": job_location,
                    "url": job_url
                }

                if is_icims and ICIMS_HANDLER_AVAILABLE:
                    icims_filled = await handle_icims_questions(page, USER_PROFILE)
                    total_filled += icims_filled

                answered_count = await handle_screening_questions(page, job_context)
                total_answered += answered_count

                # Try to upload resume again if not done yet (some sites ask on later pages)
                if page_num > 0:
                    if is_icims and ICIMS_HANDLER_AVAILABLE:
                        await handle_icims_resume_upload(page, resume_path)
                    else:
                        await upload_resume(page, resume_path)

                await human_delay(1, 2)

                # Check if we're on iCIMS thank you page
                if is_icims and ICIMS_HANDLER_AVAILABLE:
                    if await check_icims_thank_you(page):
                        print("  ✅ Reached iCIMS thank you page!")
                        await show_status_message(page, "✅ Application submitted successfully!", "success")
                        break

                # Step 9: Look for Next/Continue/Submit button
                if is_icims and ICIMS_HANDLER_AVAILABLE:
                    next_button = await find_icims_next_button(page)
                else:
                    next_button = await find_next_or_submit_button(page)

                if not next_button:
                    print("  ℹ️  No Next/Submit button found - may be on final page")
                    await show_status_message(page, "⚠️ Please click Continue/Submit manually", "warning")
                    await play_notification_sound()
                    break

                button_text = await next_button.inner_text() if await next_button.tag_name() != 'input' else await next_button.get_attribute('value')

                # If this is a Submit button (not Next/Continue), break the loop
                if button_text and any(s in button_text.lower() for s in ['submit', 'apply now', 'send application', 'complete']):
                    print(f"  ℹ️  Found final submit button: {button_text.strip()}")
                    break

                # Click Next/Continue
                print(f"  🖱️  Clicking: {button_text.strip()}")
                await scroll_into_view(page, next_button)
                await next_button.click()
                await human_delay(2, 3)

                # Wait for next page to load
                await page.wait_for_load_state('networkidle', timeout=10000)
                await human_delay(1, 2)

            # Step 10: Review screen - pause for user confirmation
            print("\n" + "=" * 70)
            print("📋 APPLICATION REVIEW")
            print("=" * 70)
            print(f"  Total pages processed: {page_num + 1}")
            print(f"  Standard fields filled: {total_filled}")
            print(f"  Screening questions answered: {total_answered}")
            print(f"  Resume uploaded: {'Yes' if Path(resume_path).exists() else 'No'}")
            print("=" * 70)
            print("\n⚠️  Application ready to submit!")
            print("   Review the form on screen, then:")
            print("   - Press ENTER to submit")
            print("   - Press Ctrl+C to cancel")
            print("=" * 70)

            await show_status_message(page, "⚠️ Review application - Press ENTER in terminal to submit", "warning")
            await play_notification_sound()

            try:
                input()
            except KeyboardInterrupt:
                print("\n❌ Application cancelled by user")
                await show_status_message(page, "❌ Application cancelled by user", "error")
                await browser.close()
                return {
                    "success": False,
                    "error": "Cancelled by user",
                    "url": job_url,
                    "timestamp": datetime.now().isoformat()
                }

            # Step 11: Find and click final Submit button
            await show_status_message(page, "🤖 ApplyFast: Submitting application...", "info")
            submit_button = await find_submit_button(page)
            if not submit_button:
                print("  ⚠️  Submit button not found - you may need to submit manually")
                await show_status_message(page, "⚠️ Please submit the application manually", "warning")
                await play_notification_sound()
                print("   Press ENTER after you submit manually...")
                input()
            else:
                await scroll_into_view(page, submit_button)
                await submit_button.click()
                print(f"  ✅ Clicked Submit button")

            # Step 12: Verify submission
            success = await verify_submission(page)

            if success:
                await show_status_message(page, "✅ Application submitted successfully!", "success")
            else:
                await show_status_message(page, "⚠️ Application status unknown - please verify", "warning")
                await play_notification_sound()

            # Take final screenshot
            screenshot_path = f"application_{'success' if success else 'unknown'}_{int(time.time())}.png"
            await page.screenshot(path=screenshot_path)

            elapsed_time = time.time() - start_time

            result = {
                "success": success,
                "company": company,
                "title": job_title,
                "url": job_url,
                "timestamp": datetime.now().isoformat(),
                "screenshot": screenshot_path,
                "elapsed_time": f"{elapsed_time:.1f}s",
                "pages_processed": page_num + 1,
                "fields_filled": total_filled,
                "questions_answered": total_answered
            }

            print("\n" + "=" * 70)
            print("✅ APPLICATION COMPLETE" if success else "⚠️  APPLICATION STATUS UNKNOWN")
            print("=" * 70)
            print(f"  Time taken: {elapsed_time:.1f} seconds")
            print(f"  Screenshot: {screenshot_path}")
            print("=" * 70)

            # Keep browser open for 5 seconds to see result
            await human_delay(5, 5)

            await browser.close()
            return result

        except Exception as e:
            print(f"\n❌ Error: {e}")
            screenshot_path = f"error_{int(time.time())}.png"
            await page.screenshot(path=screenshot_path)

            await browser.close()

            return {
                "success": False,
                "error": str(e),
                "url": job_url,
                "screenshot": screenshot_path,
                "timestamp": datetime.now().isoformat()
            }


# CLI interface
if __name__ == "__main__":
    import sys

    print("""
╔══════════════════════════════════════════════════════════════════╗
║           Universal Job Application Bot v1.0                    ║
║                  Powered by Playwright + Claude AI               ║
╚══════════════════════════════════════════════════════════════════╝
""")

    # Example usage
    if len(sys.argv) < 3:
        print("Usage: python universal_apply.py <job_url> <resume_path> [job_title] [company] [location]")
        print("\nExample:")
        print('  python universal_apply.py "https://linkedin.com/jobs/123" "resume.pdf" "Software Engineer" "Acme Corp" "Austin, TX"')
        print("\nOr run the example:")
        print("  python universal_apply.py --example")
        sys.exit(1)

    if sys.argv[1] == "--example":
        # Example application
        job_url = input("Enter job URL: ").strip()
        resume_path = input("Enter resume file path: ").strip()
        job_title = input("Enter job title (optional): ").strip()
        company = input("Enter company name (optional): ").strip()
        location = input("Enter job location (optional): ").strip()
    else:
        job_url = sys.argv[1]
        resume_path = sys.argv[2]
        job_title = sys.argv[3] if len(sys.argv) > 3 else ""
        company = sys.argv[4] if len(sys.argv) > 4 else ""
        location = sys.argv[5] if len(sys.argv) > 5 else ""

    # Run the application
    result = asyncio.run(apply_to_job(
        job_url=job_url,
        resume_path=resume_path,
        job_title=job_title,
        company=company,
        job_location=location,
        headless=False  # Visible mode
    ))

    # Print final result
    print("\n" + "=" * 70)
    print("FINAL RESULT:")
    print("=" * 70)
    import json
    print(json.dumps(result, indent=2))
    print("=" * 70)
