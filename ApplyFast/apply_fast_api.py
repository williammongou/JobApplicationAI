"""
ApplyFast API - FastAPI backend for job application assistance
Runs on localhost:8000
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
from dotenv import load_dotenv
from resume_generator import generate_resume_with_analysis

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="ApplyFast API", version="1.0.0")

# Add CORS middleware to allow Chrome extension to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Anthropic client
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not found in environment variables")

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# Database file
DB_FILE = "applyfast.db"


# ══════════════════════════════════════════════════════════════════
#  DATABASE SETUP
# ══════════════════════════════════════════════════════════════════

def init_database():
    """Initialize SQLite database with applications table"""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_url TEXT NOT NULL,
                company TEXT,
                title TEXT,
                status TEXT,
                resume_used TEXT,
                timestamp TEXT NOT NULL,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()


@contextmanager
def get_db():
    """Context manager for database connections"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# Initialize database on startup
init_database()


# ══════════════════════════════════════════════════════════════════
#  PYDANTIC MODELS
# ══════════════════════════════════════════════════════════════════

class AnalyzeJobRequest(BaseModel):
    jobUrl: str
    jobText: str


class AnalyzeJobResponse(BaseModel):
    title: Optional[str]
    company: Optional[str]
    requirements: List[str]
    skills: List[str]
    experience: Optional[str]
    salary: Optional[str]
    location: Optional[str]
    disqualifiers: List[str]


class GenerateResumeRequest(BaseModel):
    jobRequirements: Dict[str, Any]
    userProfile: Dict[str, Any]


class GenerateResumeResponse(BaseModel):
    resumeText: str
    matchScore: int
    highlightedSkills: List[str]
    honestyConcerns: List[str]


class AnswerQuestionRequest(BaseModel):
    question: str
    userProfile: Dict[str, Any]
    jobContext: Dict[str, Any]


class AnswerQuestionResponse(BaseModel):
    answer: str
    confidence: str  # "auto", "review", or "manual"


class LogApplicationRequest(BaseModel):
    jobUrl: str
    company: Optional[str] = None
    title: Optional[str] = None
    status: str = "applied"
    resumeUsed: Optional[str] = None
    timestamp: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class LogApplicationResponse(BaseModel):
    success: bool
    applicationId: int


class Application(BaseModel):
    id: int
    job_url: str
    company: Optional[str]
    title: Optional[str]
    status: str
    resume_used: Optional[str]
    timestamp: str
    metadata: Optional[Dict[str, Any]]
    created_at: str


# ══════════════════════════════════════════════════════════════════
#  HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════

def call_claude(prompt: str, max_tokens: int = 2000) -> str:
    """
    Call Claude API with a prompt and return the response text
    """
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        return message.content[0].text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude API error: {str(e)}")


def parse_json_response(response_text: str) -> Dict[str, Any]:
    """
    Parse JSON from Claude's response, handling markdown code blocks
    """
    # Remove markdown code blocks if present
    text = response_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse Claude response as JSON: {str(e)}\nResponse: {response_text[:500]}"
        )


# ══════════════════════════════════════════════════════════════════
#  API ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "ApplyFast API",
        "version": "1.0.0"
    }


@app.post("/analyze-job", response_model=AnalyzeJobResponse)
def analyze_job(request: AnalyzeJobRequest):
    """
    Analyze a job posting and extract structured requirements using Claude
    """
    prompt = f"""Analyze this job posting and extract structured information. Return ONLY valid JSON with no additional text.

Job URL: {request.jobUrl}

Job Text:
{request.jobText}

Extract the following information and return as JSON:
{{
  "title": "Job title",
  "company": "Company name",
  "requirements": ["List of key requirements"],
  "skills": ["List of technical and soft skills required"],
  "experience": "Years of experience required (e.g., '5+ years') or null",
  "salary": "Salary range if mentioned or null",
  "location": "Job location or null",
  "disqualifiers": ["List of hard requirements that could disqualify candidates, e.g., 'US Citizenship Required', 'TS/SCI Clearance', 'PhD Required']"
}}

Be thorough but concise. Extract all relevant skills and requirements. Return ONLY the JSON object."""

    response_text = call_claude(prompt, max_tokens=3000)
    parsed_data = parse_json_response(response_text)

    return AnalyzeJobResponse(**parsed_data)


@app.post("/generate-resume", response_model=GenerateResumeResponse)
def generate_resume(request: GenerateResumeRequest):
    """
    Generate a tailored resume based on job requirements and user profile using Claude
    """
    try:
        # Use the dedicated resume generator with William's real profile
        result = generate_resume_with_analysis(
            job_requirements=request.jobRequirements,
            user_profile=request.userProfile if request.userProfile else None
        )

        return GenerateResumeResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume generation error: {str(e)}")


@app.post("/answer-question", response_model=AnswerQuestionResponse)
def answer_question(request: AnswerQuestionRequest):
    """
    Generate an answer to an application question using Claude
    """
    prompt = f"""You are helping a job applicant answer an application question honestly and effectively.

Question: {request.question}

User Profile:
{json.dumps(request.userProfile, indent=2)}

Job Context:
{json.dumps(request.jobContext, indent=2)}

Instructions:
1. Generate a thoughtful, honest answer based on the user's profile
2. Tailor the answer to the specific job context
3. Determine confidence level:
   - "auto": High confidence, can be submitted automatically
   - "review": Medium confidence, user should review before submitting
   - "manual": Low confidence or sensitive question, user must write manually

Return ONLY valid JSON with no additional text:
{{
  "answer": "Your thoughtful answer here",
  "confidence": "auto"
}}"""

    response_text = call_claude(prompt, max_tokens=2000)
    parsed_data = parse_json_response(response_text)

    return AnswerQuestionResponse(**parsed_data)


@app.post("/log-application", response_model=LogApplicationResponse)
def log_application(request: LogApplicationRequest):
    """
    Log a job application to the local SQLite database
    """
    timestamp = request.timestamp or datetime.now().isoformat()
    metadata_json = json.dumps(request.metadata) if request.metadata else None

    try:
        with get_db() as conn:
            cursor = conn.execute(
                """
                INSERT INTO applications
                (job_url, company, title, status, resume_used, timestamp, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    request.jobUrl,
                    request.company,
                    request.title,
                    request.status,
                    request.resumeUsed,
                    timestamp,
                    metadata_json
                )
            )
            conn.commit()
            application_id = cursor.lastrowid

        return LogApplicationResponse(success=True, applicationId=application_id)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/applications", response_model=List[Application])
def get_applications(
    limit: int = 100,
    status: Optional[str] = None,
    company: Optional[str] = None
):
    """
    Get all logged applications with optional filtering
    """
    try:
        with get_db() as conn:
            query = "SELECT * FROM applications WHERE 1=1"
            params = []

            if status:
                query += " AND status = ?"
                params.append(status)

            if company:
                query += " AND company LIKE ?"
                params.append(f"%{company}%")

            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)

            cursor = conn.execute(query, params)
            rows = cursor.fetchall()

            applications = []
            for row in rows:
                metadata = json.loads(row["metadata"]) if row["metadata"] else None
                applications.append(
                    Application(
                        id=row["id"],
                        job_url=row["job_url"],
                        company=row["company"],
                        title=row["title"],
                        status=row["status"],
                        resume_used=row["resume_used"],
                        timestamp=row["timestamp"],
                        metadata=metadata,
                        created_at=row["created_at"]
                    )
                )

            return applications

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.delete("/applications/{application_id}")
def delete_application(application_id: int):
    """
    Delete a logged application by ID
    """
    try:
        with get_db() as conn:
            cursor = conn.execute(
                "DELETE FROM applications WHERE id = ?",
                (application_id,)
            )
            conn.commit()

            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Application not found")

            return {"success": True, "message": f"Application {application_id} deleted"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/applications/stats")
def get_application_stats():
    """
    Get statistics about logged applications
    """
    try:
        with get_db() as conn:
            # Total applications
            total = conn.execute("SELECT COUNT(*) as count FROM applications").fetchone()["count"]

            # By status
            by_status = {}
            status_rows = conn.execute(
                "SELECT status, COUNT(*) as count FROM applications GROUP BY status"
            ).fetchall()
            for row in status_rows:
                by_status[row["status"]] = row["count"]

            # By company (top 10)
            by_company = {}
            company_rows = conn.execute(
                """
                SELECT company, COUNT(*) as count
                FROM applications
                WHERE company IS NOT NULL
                GROUP BY company
                ORDER BY count DESC
                LIMIT 10
                """
            ).fetchall()
            for row in company_rows:
                by_company[row["company"]] = row["count"]

            # Applications per day (last 30 days)
            per_day = {}
            day_rows = conn.execute(
                """
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM applications
                WHERE created_at >= datetime('now', '-30 days')
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                """
            ).fetchall()
            for row in day_rows:
                per_day[row["date"]] = row["count"]

            return {
                "total": total,
                "byStatus": by_status,
                "byCompany": by_company,
                "perDay": per_day
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ══════════════════════════════════════════════════════════════════
#  MAIN ENTRY POINT
# ══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn

    print("=" * 70)
    print("ApplyFast API Server")
    print("=" * 70)
    print(f"Starting server on http://localhost:8000")
    print(f"Database: {DB_FILE}")
    print(f"API Docs: http://localhost:8000/docs")
    print(f"OpenAPI JSON: http://localhost:8000/openapi.json")
    print("=" * 70)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
