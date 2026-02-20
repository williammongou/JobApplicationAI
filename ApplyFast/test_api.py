"""
Test script for ApplyFast API
Run this after starting the API server to verify all endpoints work
"""

import requests
import json
from datetime import datetime

API_BASE = "http://localhost:8000"


def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def test_health_check():
    """Test the root health check endpoint"""
    print_section("Testing Health Check")
    response = requests.get(f"{API_BASE}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200
    print("✅ Health check passed")


def test_analyze_job():
    """Test the analyze-job endpoint"""
    print_section("Testing Job Analysis")

    job_text = """
    Senior Software Engineer - Acme Corp

    We are looking for a Senior Software Engineer with 5+ years of experience
    in Python and FastAPI development.

    Requirements:
    - 5+ years of professional Python experience
    - Experience with FastAPI, Django, or Flask
    - Strong understanding of RESTful APIs
    - Experience with PostgreSQL or MySQL
    - Docker and Kubernetes experience
    - US Citizenship Required
    - Active TS/SCI Clearance

    Nice to have:
    - AWS or GCP experience
    - React or Vue.js knowledge

    Salary: $150,000 - $200,000
    Location: San Francisco, CA (Remote OK)
    """

    payload = {
        "jobUrl": "https://example.com/job/123",
        "jobText": job_text
    }

    print(f"Sending request to /analyze-job...")
    response = requests.post(f"{API_BASE}/analyze-job", json=payload)
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\nExtracted Job Data:")
        print(f"  Title: {data.get('title')}")
        print(f"  Company: {data.get('company')}")
        print(f"  Experience: {data.get('experience')}")
        print(f"  Salary: {data.get('salary')}")
        print(f"  Location: {data.get('location')}")
        print(f"  Skills: {', '.join(data.get('skills', []))}")
        print(f"  Disqualifiers: {', '.join(data.get('disqualifiers', []))}")
        print("✅ Job analysis passed")
        return data
    else:
        print(f"❌ Error: {response.text}")
        return None


def test_generate_resume():
    """Test the generate-resume endpoint"""
    print_section("Testing Resume Generation")

    payload = {
        "jobRequirements": {
            "title": "Senior Software Engineer",
            "skills": ["Python", "FastAPI", "PostgreSQL"],
            "experience": "5+ years"
        },
        "userProfile": {
            "name": "John Doe",
            "email": "john@example.com",
            "experience": 4,
            "skills": ["Python", "FastAPI", "React", "Docker"],
            "workHistory": [
                {
                    "company": "Tech Startup",
                    "title": "Software Engineer",
                    "duration": "2020-2024",
                    "achievements": [
                        "Built REST APIs with FastAPI",
                        "Improved performance by 40%"
                    ]
                }
            ]
        }
    }

    print(f"Sending request to /generate-resume...")
    response = requests.post(f"{API_BASE}/generate-resume", json=payload)
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\nResume Generated:")
        print(f"  Match Score: {data.get('matchScore')}%")
        print(f"  Highlighted Skills: {', '.join(data.get('highlightedSkills', []))}")
        print(f"  Honesty Concerns: {data.get('honestyConcerns')}")
        print(f"\n  Resume Preview (first 500 chars):")
        print(f"  {data.get('resumeText', '')[:500]}...")
        print("✅ Resume generation passed")
        return data
    else:
        print(f"❌ Error: {response.text}")
        return None


def test_answer_question():
    """Test the answer-question endpoint"""
    print_section("Testing Question Answering")

    payload = {
        "question": "Why do you want to work at our company?",
        "userProfile": {
            "name": "John Doe",
            "interests": ["distributed systems", "AI/ML"],
            "careerGoals": "Work on cutting-edge technology"
        },
        "jobContext": {
            "company": "Acme Corp",
            "title": "Senior Software Engineer",
            "description": "Building scalable AI systems"
        }
    }

    print(f"Sending request to /answer-question...")
    response = requests.post(f"{API_BASE}/answer-question", json=payload)
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\nGenerated Answer:")
        print(f"  Confidence: {data.get('confidence')}")
        print(f"  Answer: {data.get('answer')}")
        print("✅ Question answering passed")
        return data
    else:
        print(f"❌ Error: {response.text}")
        return None


def test_log_application():
    """Test the log-application endpoint"""
    print_section("Testing Application Logging")

    payload = {
        "jobUrl": "https://example.com/job/123",
        "company": "Acme Corp",
        "title": "Senior Software Engineer",
        "status": "applied",
        "resumeUsed": "tailored_resume_v1.pdf",
        "timestamp": datetime.now().isoformat(),
        "metadata": {
            "matchScore": 85,
            "platform": "linkedin",
            "appliedVia": "chrome_extension"
        }
    }

    print(f"Sending request to /log-application...")
    response = requests.post(f"{API_BASE}/log-application", json=payload)
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\nApplication Logged:")
        print(f"  Success: {data.get('success')}")
        print(f"  Application ID: {data.get('applicationId')}")
        print("✅ Application logging passed")
        return data.get('applicationId')
    else:
        print(f"❌ Error: {response.text}")
        return None


def test_get_applications():
    """Test the get applications endpoint"""
    print_section("Testing Get Applications")

    print(f"Sending request to /applications...")
    response = requests.get(f"{API_BASE}/applications?limit=10")
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\nApplications Retrieved:")
        print(f"  Total: {len(data)}")
        if data:
            print(f"\n  Most Recent Application:")
            app = data[0]
            print(f"    ID: {app.get('id')}")
            print(f"    Company: {app.get('company')}")
            print(f"    Title: {app.get('title')}")
            print(f"    Status: {app.get('status')}")
            print(f"    Timestamp: {app.get('timestamp')}")
        print("✅ Get applications passed")
        return data
    else:
        print(f"❌ Error: {response.text}")
        return None


def test_get_stats():
    """Test the get statistics endpoint"""
    print_section("Testing Application Statistics")

    print(f"Sending request to /applications/stats...")
    response = requests.get(f"{API_BASE}/applications/stats")
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\nApplication Statistics:")
        print(f"  Total Applications: {data.get('total')}")
        print(f"  By Status: {data.get('byStatus')}")
        print(f"  Top Companies: {data.get('byCompany')}")
        print("✅ Statistics passed")
        return data
    else:
        print(f"❌ Error: {response.text}")
        return None


def test_delete_application(application_id):
    """Test the delete application endpoint"""
    print_section("Testing Delete Application")

    print(f"Sending request to DELETE /applications/{application_id}...")
    response = requests.delete(f"{API_BASE}/applications/{application_id}")
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\nApplication Deleted:")
        print(f"  Success: {data.get('success')}")
        print(f"  Message: {data.get('message')}")
        print("✅ Delete application passed")
        return True
    else:
        print(f"❌ Error: {response.text}")
        return False


def run_all_tests():
    """Run all API tests"""
    print("\n" + "🚀" * 35)
    print("  ApplyFast API Test Suite")
    print("🚀" * 35)

    try:
        # Basic tests
        test_health_check()

        # AI-powered endpoints (require Claude API key)
        print("\n⚠️  The following tests require a valid ANTHROPIC_API_KEY in .env")
        input("Press Enter to continue with AI tests, or Ctrl+C to skip...")

        test_analyze_job()
        test_generate_resume()
        test_answer_question()

        # Database tests
        application_id = test_log_application()
        test_get_applications()
        test_get_stats()

        # Cleanup
        if application_id:
            test_delete_application(application_id)

        print("\n" + "=" * 70)
        print("  ✅ All tests passed!")
        print("=" * 70)

    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to API server")
        print("Make sure the server is running: python apply_fast_api.py")
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")


if __name__ == "__main__":
    run_all_tests()
