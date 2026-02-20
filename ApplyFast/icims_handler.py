"""
iCIMS-specific application handler
Handles the unique workflow for iCIMS job applications
"""

import asyncio
import random
import winsound
from typing import Optional
from playwright.async_api import Page, ElementHandle


async def play_notification_sound():
    """Play a ding sound to notify user of an issue"""
    try:
        # Play Windows notification sound
        winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
    except Exception:
        # Fallback to a simple beep
        try:
            winsound.Beep(1000, 300)  # 1000 Hz for 300ms
        except Exception:
            print("\a")  # Terminal bell as last resort


async def human_delay(min_sec: float = 1.0, max_sec: float = 3.0):
    """Add realistic human-like delay"""
    await asyncio.sleep(random.uniform(min_sec, max_sec))


async def is_icims_site(page: Page) -> bool:
    """Check if the current page is an iCIMS site"""
    try:
        url = page.url
        page_content = await page.content()

        # Check URL or page content for iCIMS indicators
        return 'icims.com' in url.lower() or 'icims' in page_content.lower()
    except Exception:
        return False


async def handle_icims_apply_button(page: Page) -> bool:
    """Find and click the iCIMS-specific Apply button"""
    print("\n🔍 Looking for iCIMS Apply button...")

    # iCIMS specific button texts
    button_texts = [
        "Apply for this job online",
        "Apply for this job",
        "Apply Now",
        "Apply Online"
    ]

    for button_text in button_texts:
        try:
            # Look for buttons or links
            elements = await page.query_selector_all('button, a, input[type="submit"]')
            for element in elements:
                text = await element.inner_text() if await element.tag_name() != 'input' else await element.get_attribute('value')
                if text and button_text.lower() in text.lower():
                    print(f"  ✅ Found iCIMS Apply button: {text.strip()}")
                    await element.click()
                    await human_delay(2, 3)
                    return True
        except Exception:
            continue

    return False


async def handle_icims_login(page: Page, email: str, password: str) -> bool:
    """Handle iCIMS two-step login process"""
    print("\n🔐 Handling iCIMS login...")

    try:
        # Step 1: Enter email and click Next
        print("  ✍️  Step 1: Entering email...")

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
                await email_field.fill(email)
                print(f"  ✅ Email entered: {email}")
                await human_delay(0.5, 1.0)
                break

        if not email_field:
            print("  ❌ Email field not found")
            await play_notification_sound()
            return False

        # Click Next button
        next_buttons = await page.query_selector_all('button, input[type="submit"]')
        for button in next_buttons:
            text = await button.inner_text() if await button.tag_name() == 'button' else await button.get_attribute('value')
            if text and 'next' in text.lower():
                print(f"  🖱️  Clicking: {text.strip()}")
                await button.click()
                await human_delay(2, 3)
                break

        # Step 2: Wait for password popup and enter password
        print("  ✍️  Step 2: Entering password in popup...")
        await human_delay(1, 2)

        password_selectors = [
            'input[type="password"]',
            'input[name*="password"]',
            'input[id*="password"]'
        ]

        password_field = None
        for selector in password_selectors:
            password_field = await page.query_selector(selector)
            if password_field:
                await password_field.fill(password)
                print(f"  ✅ Password entered: ********")
                await human_delay(0.5, 1.0)
                break

        if not password_field:
            print("  ❌ Password field not found")
            await play_notification_sound()
            return False

        # Click Log In button
        login_buttons = await page.query_selector_all('button, input[type="submit"]')
        for button in login_buttons:
            text = await button.inner_text() if await button.tag_name() == 'button' else await button.get_attribute('value')
            if text and any(s in text.lower() for s in ['log in', 'sign in', 'submit']):
                print(f"  🖱️  Clicking: {text.strip()}")
                await button.click()
                await human_delay(3, 5)
                break

        print("  ✅ iCIMS login completed")
        return True

    except Exception as e:
        print(f"  ❌ iCIMS login error: {e}")
        await play_notification_sound()
        return False


async def handle_icims_faster_login_prompt(page: Page) -> bool:
    """Handle the 'Log In Faster on This Device' prompt"""
    print("\n🔍 Checking for 'Log In Faster' prompt...")

    try:
        # Look for "Not on this device" button
        buttons = await page.query_selector_all('button, a')
        for button in buttons:
            text = await button.inner_text()
            if 'not on this device' in text.lower():
                print(f"  🖱️  Clicking: {text.strip()}")
                await button.click()
                await human_delay(2, 3)
                print("  ✅ Skipped 'Log In Faster' prompt")
                return True

        # If not found, might not be present (which is fine)
        print("  ℹ️  'Log In Faster' prompt not found (may not be required)")
        return True

    except Exception as e:
        print(f"  ⚠️  Error handling faster login prompt: {e}")
        return True  # Continue anyway


async def handle_icims_resume_upload(page: Page, resume_path: str) -> bool:
    """Handle iCIMS resume upload with 'My Computer' button"""
    print("\n📄 Handling iCIMS resume upload...")

    try:
        # Look for "My Computer" button specifically
        print("  🔍 Looking for 'My Computer' button...")

        buttons = await page.query_selector_all('button, a, label, div[role="button"]')
        for button in buttons:
            try:
                text = await button.inner_text()
                if 'my computer' in text.lower():
                    print(f"  🖱️  Clicking 'My Computer' button")
                    await button.click()
                    await human_delay(1, 2)

                    # Now find the file input that appeared
                    file_input = await page.query_selector('input[type="file"]')
                    if file_input:
                        await file_input.set_input_files(resume_path)
                        print(f"  ✅ Resume uploaded via 'My Computer'")
                        await human_delay(2, 3)
                        return True
            except Exception:
                continue

        # Fallback: try direct file input
        print("  ℹ️  'My Computer' button not found, trying direct file input...")
        file_input = await page.query_selector('input[type="file"]')
        if file_input:
            await file_input.set_input_files(resume_path)
            print(f"  ✅ Resume uploaded via direct file input")
            await human_delay(2, 3)
            return True

        print("  ❌ Could not upload resume")
        await play_notification_sound()
        return False

    except Exception as e:
        print(f"  ❌ Resume upload error: {e}")
        await play_notification_sound()
        return False


async def handle_icims_questions(page: Page, user_profile: dict) -> int:
    """Handle iCIMS-specific question pages"""
    print("\n❓ Handling iCIMS questions...")

    filled_count = 0

    try:
        # Handle common iCIMS questions

        # Education level
        education_selectors = ['select[name*="education"]', 'select[id*="education"]']
        for selector in education_selectors:
            try:
                select = await page.query_selector(selector)
                if select:
                    # Look for Bachelor's option
                    options = await select.query_selector_all('option')
                    for option in options:
                        text = await option.inner_text()
                        if "bachelor" in text.lower():
                            value = await option.get_attribute('value')
                            await select.select_option(value=value)
                            print(f"  ✅ Selected education: {text.strip()}")
                            filled_count += 1
                            await human_delay(0.5, 1.0)
                            break
            except Exception:
                continue

        # Work authorization
        auth_selectors = ['select[name*="authorized"]', 'select[id*="authorized"]']
        for selector in auth_selectors:
            try:
                select = await page.query_selector(selector)
                if select:
                    options = await select.query_selector_all('option')
                    for option in options:
                        text = await option.inner_text()
                        if "yes" in text.lower():
                            value = await option.get_attribute('value')
                            await select.select_option(value=value)
                            print(f"  ✅ Selected work authorization: {text.strip()}")
                            filled_count += 1
                            await human_delay(0.5, 1.0)
                            break
            except Exception:
                continue

        # Sponsorship
        sponsor_selectors = ['select[name*="sponsor"]', 'select[id*="sponsor"]', 'select[name*="visa"]']
        for selector in sponsor_selectors:
            try:
                select = await page.query_selector(selector)
                if select:
                    options = await select.query_selector_all('option')
                    for option in options:
                        text = await option.inner_text()
                        if "no" in text.lower() and "require" in await page.inner_text('body').lower():
                            value = await option.get_attribute('value')
                            await select.select_option(value=value)
                            print(f"  ✅ Selected sponsorship: {text.strip()}")
                            filled_count += 1
                            await human_delay(0.5, 1.0)
                            break
            except Exception:
                continue

        # Age verification (18+)
        age_selectors = ['select[name*="age"]', 'select[id*="18"]']
        for selector in age_selectors:
            try:
                select = await page.query_selector(selector)
                if select:
                    options = await select.query_selector_all('option')
                    for option in options:
                        text = await option.inner_text()
                        if "yes" in text.lower():
                            value = await option.get_attribute('value')
                            await select.select_option(value=value)
                            print(f"  ✅ Selected age verification: {text.strip()}")
                            filled_count += 1
                            await human_delay(0.5, 1.0)
                            break
            except Exception:
                continue

        # Non-compete agreement
        noncompete_selectors = ['select[name*="compete"]', 'select[id*="compete"]']
        for selector in noncompete_selectors:
            try:
                select = await page.query_selector(selector)
                if select:
                    options = await select.query_selector_all('option')
                    for option in options:
                        text = await option.inner_text()
                        if "no" in text.lower():
                            value = await option.get_attribute('value')
                            await select.select_option(value=value)
                            print(f"  ✅ Selected non-compete: {text.strip()}")
                            filled_count += 1
                            await human_delay(0.5, 1.0)
                            break
            except Exception:
                continue

        # Text fields for "N/A" responses
        text_inputs = await page.query_selector_all('input[type="text"]')
        for input_field in text_inputs:
            try:
                # Check if it's asking for relative info
                label_text = await page.evaluate('''(input) => {
                    const label = input.labels?.[0] ||
                                 document.querySelector(`label[for="${input.id}"]`);
                    return label?.textContent || '';
                }''', input_field)

                if 'relative' in label_text.lower() or 'board member' in label_text.lower():
                    current_value = await input_field.input_value()
                    if not current_value:
                        await input_field.fill("N/A")
                        print(f"  ✅ Filled text field with: N/A")
                        filled_count += 1
                        await human_delay(0.5, 1.0)
            except Exception:
                continue

        print(f"  ℹ️  Filled {filled_count} iCIMS-specific fields")

    except Exception as e:
        print(f"  ⚠️  Error handling iCIMS questions: {e}")

    return filled_count


async def find_icims_next_button(page: Page) -> Optional[ElementHandle]:
    """Find iCIMS Next button (not Finish Later)"""
    print("\n🔍 Looking for iCIMS Next button...")

    try:
        buttons = await page.query_selector_all('button, input[type="submit"], a[role="button"]')

        # First, look specifically for "Next" button
        for button in buttons:
            is_visible = await button.is_visible()
            if not is_visible:
                continue

            text = await button.inner_text() if await button.tag_name() != 'input' else await button.get_attribute('value')
            if text and text.strip().lower() == 'next':
                print(f"  ✅ Found Next button")
                return button

        # Avoid "Finish Later" button
        for button in buttons:
            is_visible = await button.is_visible()
            if not is_visible:
                continue

            text = await button.inner_text() if await button.tag_name() != 'input' else await button.get_attribute('value')
            if text and 'finish later' in text.lower():
                continue

            if text and any(s in text.lower() for s in ['continue', 'proceed', 'submit']):
                print(f"  ✅ Found button: {text.strip()}")
                return button

    except Exception as e:
        print(f"  ⚠️  Error finding Next button: {e}")

    return None


async def check_icims_thank_you(page: Page) -> bool:
    """Check if we've reached the iCIMS thank you page"""
    try:
        page_text = await page.inner_text('body')
        page_text_lower = page_text.lower()

        # Look for thank you indicators
        thank_you_patterns = [
            'thank you',
            'application submitted',
            'application received',
            'successfully submitted',
            'application complete'
        ]

        for pattern in thank_you_patterns:
            if pattern in page_text_lower:
                print(f"  ✅ Found confirmation: '{pattern}'")
                return True

        return False

    except Exception:
        return False
