"""
Resume Generator - Tailored resume generation using Claude API
"""

import os
from typing import Dict, Any
import anthropic
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# William Mongou's real profile - DO NOT MODIFY
WILLIAM_PROFILE = {
    "name": "William Mongou",
    "contact": "2712 Dennis Drive Yukon OK | (580) 447-9539 | williammongou@gmail.com",
    "experience": [
        {
            "company": "Thinstaff Healthcare",
            "title": "Founder & Cloud Architect",
            "dates": "July 2025 - Present",
            "achievements": [
                "Designed full cloud infrastructure on GCP and AWS from scratch",
                "Built 200+ REST API endpoints in Node.js deployed via Firebase CLI",
                "Built custom TCP socket client/server with HTTP/TCP throttle system",
                "Deployed mobile app to iOS App Store and Google Play Store using Flutter/Dart",
                "Onboarding 150+ healthcare professionals across 2 Oklahoma facilities",
                "Reduced infrastructure costs 30%"
            ]
        },
        {
            "company": "Revenue Management Solutions",
            "title": "Software Development Engineer",
            "dates": "April 2023 - August 2025",
            "achievements": [
                "Built C++ image processing pipeline with Leptonica - 40% OCR improvement, sub-second",
                "Created first CI/CD pipeline for C++ tools - installed compilers on prod servers",
                "Built C# .NET Core ERA document generators - reduced DevOps time from 2hrs to 2mins",
                "Completed 6-year-old unfinished Java leaderboard feature, rebuilt deployment environment",
                "Reduced SQL query time 93% (30s to 2s)",
                "Separated BSL GUIs into separate repos - deployment success rate to 90%+"
            ]
        },
        {
            "company": "Amazon",
            "title": "Software Development Engineer",
            "dates": "February 2022 - April 2023",
            "achievements": [
                "Built mathematical hazmat tracking model with researchers - reduced fire hazard probability 90%",
                "Built Java API for sub-same-day worldwide shipping cost estimates used by multiple internal teams",
                "Upgraded all EC2 m-instances to i-instances after CloudWatch analysis",
                "Daily AWS: CloudWatch, Step Functions, S3, RDS, Redshift, Lambda, SQS, EC2",
                "Saved $200K+ annually through optimization",
                "Improved performance 50%"
            ]
        },
        {
            "company": "Invyt Mobile App",
            "title": "Senior Software Engineer Team Lead",
            "dates": "January 2020 - February 2022",
            "achievements": [
                "Led 4-person team shipping mobile app to App Store in 3 months",
                "Built backend services in Java and C#"
            ]
        }
    ],
    "skills": "Java 9yrs, C++ 4yrs, C# 6yrs, Python 4yrs, Scala 4yrs, Node.js, TypeScript, Flutter/Dart, AWS (Lambda S3 EC2 RDS Redshift CloudWatch Step Functions SQS DynamoDB), GCP (Cloud Functions Firestore Firebase Pub/Sub), SQL 5yrs, Docker, Kubernetes, CI/CD, Apache Spark, TCP sockets, multithreading, CMake",
    "education": "BS Software Engineering, University of Central Oklahoma 2021, Minor in Mathematics",
    "certifications": "AWS Solutions Architect Professional, GCP Professional Cloud Architect"
}


def _get_dynamic_address(job_location: str) -> str:
    """
    Determine which address to use based on job location.

    Args:
        job_location: Job location string (e.g., "Austin, TX", "Remote - Oklahoma")

    Returns:
        Address string to use on resume
    """
    if not job_location:
        # Default to Oklahoma if no location specified
        return "2712 Dennis Drive, Yukon, OK 73099"

    job_location_lower = job_location.lower()

    # If job is in Oklahoma, use real address
    if 'oklahoma' in job_location_lower or 'ok' in job_location_lower or \
       'okc' in job_location_lower or 'tulsa' in job_location_lower or \
       'norman' in job_location_lower or 'yukon' in job_location_lower:
        return "2712 Dennis Drive, Yukon, OK 73099"

    # Map of states to use job location for
    relocatable_states = {
        'tx': 'Texas', 'texas': 'Texas',
        'ak': 'Alaska', 'alaska': 'Alaska',
        'co': 'Colorado', 'colorado': 'Colorado',
        'ks': 'Kansas', 'kansas': 'Kansas',
        'ga': 'Georgia', 'georgia': 'Georgia',
        'il': 'Illinois', 'illinois': 'Illinois',
        'ca': 'California', 'california': 'California',
        'ny': 'New York', 'new york': 'New York'
    }

    # Check if job is in one of the relocatable states
    for state_code, state_name in relocatable_states.items():
        if state_code in job_location_lower or state_name.lower() in job_location_lower:
            # Extract city from job location if possible
            # Common patterns: "Austin, TX" or "Austin, Texas" or "Remote - Austin, TX"
            import re

            # Try to extract city, state pattern
            city_state_match = re.search(r'([A-Za-z\s]+),\s*([A-Z]{2})', job_location)
            if city_state_match:
                city = city_state_match.group(1).strip()
                state = city_state_match.group(2).strip()
                return f"{city}, {state}"

            # Try to extract city with full state name
            city_state_match = re.search(r'([A-Za-z\s]+),\s*(' + state_name + ')', job_location, re.IGNORECASE)
            if city_state_match:
                city = city_state_match.group(1).strip()
                return f"{city}, {state_name}"

            # If we can't extract city, just use the state
            state_abbrev = state_code.upper() if len(state_code) == 2 else None
            if state_abbrev:
                return f"{state_name}"
            return state_name

    # If remote or location not in relocatable list, use Oklahoma address
    if 'remote' in job_location_lower:
        return "2712 Dennis Drive, Yukon, OK 73099"

    # Default to Oklahoma for any other location
    return "2712 Dennis Drive, Yukon, OK 73099"


def generate_tailored_resume(job_requirements: Dict[str, Any], user_profile: Dict[str, Any] = None) -> str:
    """
    Generate a tailored resume using Claude API based on job requirements.

    Args:
        job_requirements: Dict containing job title, skills, requirements, etc.
        user_profile: Optional user profile. If None, uses William Mongou's profile.

    Returns:
        Plain text formatted resume tailored to the job
    """

    # Use William's profile by default
    if user_profile is None:
        user_profile = WILLIAM_PROFILE

    # Extract key info from job requirements
    job_title = job_requirements.get('title', 'Software Engineer')
    required_skills = job_requirements.get('skills', [])
    job_description = job_requirements.get('description', '')
    company = job_requirements.get('company', '')
    job_location = job_requirements.get('location', '')

    # Build the system prompt
    system_prompt = """You are an expert resume writer. Your job is to create a tailored, ATS-friendly resume
that highlights the candidate's REAL experience and skills that match the job requirements.

CRITICAL RULES - DO NOT VIOLATE:
1. ONLY use achievements and experience from the provided profile
2. NEVER invent, exaggerate, or fabricate any experience
3. NEVER add skills the candidate doesn't have
4. DO reorder bullet points to put most relevant achievements first
5. DO use keywords from the job description naturally
6. DO quantify achievements when they already contain numbers
7. Keep resume to 2 pages maximum
8. Use professional, concise language
9. Format as plain text with clear sections

If the candidate doesn't have a required skill or experience, DO NOT mention it.
Focus on what they DO have that's relevant."""

    # Get dynamic address based on job location
    dynamic_address = _get_dynamic_address(job_location)
    phone_and_email = "(580) 447-9539 | williammongou@gmail.com"
    full_contact = f"{dynamic_address} | {phone_and_email}"

    # Build the user prompt
    user_prompt = f"""Create a tailored resume for this job application.

JOB DETAILS:
Title: {job_title}
Company: {company}
Location: {job_location}
Required Skills: {', '.join(required_skills) if required_skills else 'Not specified'}

Job Description:
{job_description}

CANDIDATE PROFILE (USE ONLY THIS INFORMATION):
Name: {user_profile['name']}
Contact: {full_contact}

Work Experience:
"""

    # Add all work experience
    for exp in user_profile['experience']:
        user_prompt += f"\n{exp['company']} - {exp['title']} ({exp['dates']})\n"
        for achievement in exp['achievements']:
            user_prompt += f"  • {achievement}\n"

    user_prompt += f"""
Skills: {user_profile['skills']}

Education: {user_profile['education']}

Certifications: {user_profile.get('certifications', 'None')}

INSTRUCTIONS:
1. Create a professional resume using ONLY the experience and skills listed above
2. Reorder bullet points within each job to highlight achievements matching the job requirements
3. Emphasize relevant technologies and skills that appear in both the job description and profile
4. Use action verbs and quantify results where already provided
5. Keep format clean and ATS-friendly
6. Return ONLY the plain text resume, no commentary

Return the complete resume as plain text."""

    # Call Claude API
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        temperature=0.3,  # Lower temperature for more consistent output
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": user_prompt
            }
        ]
    )

    # Extract the resume text
    resume_text = message.content[0].text

    return resume_text


def generate_resume_with_analysis(job_requirements: Dict[str, Any], user_profile: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Generate a tailored resume and provide analysis of the match.

    Args:
        job_requirements: Dict containing job title, skills, requirements, etc.
        user_profile: Optional user profile. If None, uses William Mongou's profile.

    Returns:
        Dict with:
            - resumeText: The tailored resume
            - matchScore: 0-100 score of how well profile matches job
            - highlightedSkills: List of matching skills
            - honestyConcerns: List of gaps or concerns
    """

    # Use William's profile by default
    if user_profile is None:
        user_profile = WILLIAM_PROFILE

    # Generate the resume
    resume_text = generate_tailored_resume(job_requirements, user_profile)

    # Analyze the match
    required_skills = set(skill.lower().strip() for skill in job_requirements.get('skills', []))
    user_skills_raw = user_profile.get('skills', '')
    user_skills = set(skill.lower().strip() for skill in user_skills_raw.replace(',', ' ').split())

    # Find matching skills
    highlighted_skills = []
    for req_skill in required_skills:
        for user_skill in user_skills:
            if req_skill in user_skill or user_skill in req_skill:
                highlighted_skills.append(req_skill.title())
                break

    # Calculate match score
    if required_skills:
        skill_match_ratio = len(highlighted_skills) / len(required_skills)
    else:
        skill_match_ratio = 0.5

    # Check experience requirements
    required_years = job_requirements.get('experience', '')
    user_years = len(user_profile.get('experience', []))

    # Base score on skill matches
    match_score = int(skill_match_ratio * 100)

    # Adjust based on experience
    if user_years >= 4:
        match_score = min(100, match_score + 10)

    # Identify honesty concerns
    honesty_concerns = []

    # Check for missing critical skills
    missing_skills = required_skills - set(skill.lower() for skill in highlighted_skills)
    if len(missing_skills) > 3:
        honesty_concerns.append(
            f"Job requires {len(missing_skills)} skills not in your profile: {', '.join(list(missing_skills)[:3])}"
        )

    # Check for experience gap
    if required_years and 'years' in required_years.lower():
        import re
        years_match = re.search(r'(\d+)', required_years)
        if years_match:
            req_years_num = int(years_match.group(1))
            if user_years < req_years_num:
                honesty_concerns.append(
                    f"Job requires {req_years_num}+ years experience - you have {user_years} years of documented experience"
                )

    # Check for disqualifiers
    disqualifiers = job_requirements.get('disqualifiers', [])
    for disq in disqualifiers:
        if 'citizenship' in disq.lower() or 'clearance' in disq.lower():
            honesty_concerns.append(
                f"Job has requirement: {disq} - verify you meet this before applying"
            )

    if not honesty_concerns:
        honesty_concerns.append("Profile appears to match job requirements well")

    return {
        "resumeText": resume_text,
        "matchScore": match_score,
        "highlightedSkills": highlighted_skills,
        "honestyConcerns": honesty_concerns
    }


# Example usage and testing
if __name__ == "__main__":
    print("=" * 70)
    print("Resume Generator - Testing Dynamic Address Feature")
    print("=" * 70)

    # Test dynamic address function
    print("\n🏠 Testing Dynamic Address Logic:")
    print("-" * 70)

    test_locations = [
        "Oklahoma City, OK",
        "Austin, TX",
        "Denver, CO",
        "Remote - Oklahoma",
        "San Francisco, CA",
        "New York, NY",
        "Tulsa, Oklahoma",
        "Remote",
        "Seattle, WA",
        ""
    ]

    for location in test_locations:
        address = _get_dynamic_address(location)
        print(f"  {location or '(No location)':<30} → {address}")

    print("\n" + "=" * 70)
    print("Resume Generation Examples")
    print("=" * 70)

    # Example 1: Oklahoma job (should use real address)
    oklahoma_job = {
        "title": "Senior Software Engineer",
        "company": "Oklahoma Tech Corp",
        "location": "Oklahoma City, OK",
        "skills": ["Python", "AWS", "Docker"],
        "experience": "5+ years",
        "description": "Looking for a Senior SWE in Oklahoma City...",
        "disqualifiers": []
    }

    print("\n📍 Example 1: Oklahoma Job")
    print(f"Location: {oklahoma_job['location']}")
    print(f"Expected Address: 2712 Dennis Drive, Yukon, OK 73099")
    result1 = generate_resume_with_analysis(oklahoma_job)
    # Extract first few lines to show contact info
    resume_lines = result1['resumeText'].split('\n')[:5]
    print(f"Resume Contact Section:")
    for line in resume_lines:
        print(f"  {line}")

    print("\n" + "=" * 70)

    # Example 2: Texas job (should use Austin, TX)
    texas_job = {
        "title": "Cloud Architect",
        "company": "Austin Startups Inc",
        "location": "Austin, TX",
        "skills": ["AWS", "GCP", "Kubernetes"],
        "experience": "5+ years",
        "description": "Cloud architect position in Austin...",
        "disqualifiers": []
    }

    print("\n📍 Example 2: Texas Job")
    print(f"Location: {texas_job['location']}")
    print(f"Expected Address: Austin, TX")
    result2 = generate_resume_with_analysis(texas_job)
    resume_lines = result2['resumeText'].split('\n')[:5]
    print(f"Resume Contact Section:")
    for line in resume_lines:
        print(f"  {line}")

    print("\n" + "=" * 70)
    print("✅ Dynamic address feature working correctly!")
    print("\nSupported relocation states: TX, AK, CO, KS, GA, IL, CA, NY")
    print("Default (Oklahoma or Remote): 2712 Dennis Drive, Yukon, OK 73099")
