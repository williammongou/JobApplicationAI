# ApplyFast API

FastAPI backend for the ApplyFast Chrome extension, providing AI-powered job analysis, resume generation, and application tracking.

## Features

- 🤖 **AI Job Analysis** - Extract structured requirements from job postings using Claude
- 📄 **Resume Generation** - Create tailored resumes with match scoring
- 💬 **Answer Questions** - Generate thoughtful answers to application questions
- 📊 **Application Tracking** - Log and track all job applications in SQLite
- 📈 **Statistics** - Get insights on your application history

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

Create a `.env` file with your Anthropic API key:

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Run the Server

```bash
python apply_fast_api.py
```

The server will start on `http://localhost:8000`

### 4. Access API Documentation

- **Interactive Docs**: http://localhost:8000/docs
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## API Endpoints

### 📋 `POST /analyze-job`

Analyze a job posting and extract structured information.

**Request:**
```json
{
  "jobUrl": "https://linkedin.com/jobs/123",
  "jobText": "Full job posting text..."
}
```

**Response:**
```json
{
  "title": "Senior Software Engineer",
  "company": "Acme Corp",
  "requirements": [
    "5+ years of Python experience",
    "Experience with FastAPI"
  ],
  "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
  "experience": "5+ years",
  "salary": "$150,000 - $200,000",
  "location": "San Francisco, CA (Remote)",
  "disqualifiers": ["US Citizenship Required", "TS/SCI Clearance"]
}
```

### 📄 `POST /generate-resume`

Generate a tailored resume for a specific job.

**Request:**
```json
{
  "jobRequirements": {
    "title": "Software Engineer",
    "skills": ["Python", "FastAPI"],
    "experience": "3+ years"
  },
  "userProfile": {
    "name": "John Doe",
    "experience": 4,
    "skills": ["Python", "FastAPI", "React"]
  }
}
```

**Response:**
```json
{
  "resumeText": "JOHN DOE\n\nSENIOR SOFTWARE ENGINEER\n\n...",
  "matchScore": 85,
  "highlightedSkills": ["Python", "FastAPI"],
  "honestyConcerns": [
    "Job requires 5+ years but you have 4 years - emphasize quality over quantity"
  ]
}
```

### 💬 `POST /answer-question`

Generate an answer to an application question.

**Request:**
```json
{
  "question": "Why do you want to work at our company?",
  "userProfile": {
    "name": "John Doe",
    "interests": ["AI", "scalable systems"]
  },
  "jobContext": {
    "company": "Acme Corp",
    "title": "Software Engineer"
  }
}
```

**Response:**
```json
{
  "answer": "I'm excited about Acme Corp because...",
  "confidence": "review"
}
```

**Confidence Levels:**
- `"auto"` - High confidence, can submit automatically
- `"review"` - Medium confidence, user should review
- `"manual"` - Low confidence, user must write manually

### 📝 `POST /log-application`

Log a job application to the database.

**Request:**
```json
{
  "jobUrl": "https://linkedin.com/jobs/123",
  "company": "Acme Corp",
  "title": "Software Engineer",
  "status": "applied",
  "resumeUsed": "tailored_resume_v1.pdf",
  "timestamp": "2024-01-15T10:30:00Z",
  "metadata": {
    "matchScore": 85,
    "platform": "linkedin"
  }
}
```

**Response:**
```json
{
  "success": true,
  "applicationId": 42
}
```

### 📊 `GET /applications`

Get all logged applications.

**Query Parameters:**
- `limit` (default: 100) - Maximum number of applications to return
- `status` (optional) - Filter by status (e.g., "applied", "interviewed", "rejected")
- `company` (optional) - Filter by company name

**Response:**
```json
[
  {
    "id": 1,
    "job_url": "https://linkedin.com/jobs/123",
    "company": "Acme Corp",
    "title": "Software Engineer",
    "status": "applied",
    "resume_used": "tailored_resume_v1.pdf",
    "timestamp": "2024-01-15T10:30:00Z",
    "metadata": { "matchScore": 85 },
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### 📈 `GET /applications/stats`

Get statistics about your applications.

**Response:**
```json
{
  "total": 150,
  "byStatus": {
    "applied": 100,
    "interviewed": 30,
    "rejected": 15,
    "offered": 5
  },
  "byCompany": {
    "Acme Corp": 10,
    "TechCo": 8,
    "StartupXYZ": 5
  },
  "perDay": {
    "2024-01-15": 5,
    "2024-01-14": 3,
    "2024-01-13": 7
  }
}
```

### 🗑️ `DELETE /applications/{application_id}`

Delete an application by ID.

**Response:**
```json
{
  "success": true,
  "message": "Application 42 deleted"
}
```

## Database Schema

The SQLite database (`applyfast.db`) contains:

```sql
CREATE TABLE applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_url TEXT NOT NULL,
    company TEXT,
    title TEXT,
    status TEXT,
    resume_used TEXT,
    timestamp TEXT NOT NULL,
    metadata TEXT,  -- JSON string with additional data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Usage Examples

### Python Client

```python
import requests

API_BASE = "http://localhost:8000"

# Analyze a job
response = requests.post(f"{API_BASE}/analyze-job", json={
    "jobUrl": "https://linkedin.com/jobs/123",
    "jobText": "We are looking for a Senior Software Engineer..."
})
job_data = response.json()
print(f"Title: {job_data['title']}")
print(f"Skills: {job_data['skills']}")

# Log an application
response = requests.post(f"{API_BASE}/log-application", json={
    "jobUrl": "https://linkedin.com/jobs/123",
    "company": "Acme Corp",
    "title": "Software Engineer",
    "status": "applied"
})
print(f"Application ID: {response.json()['applicationId']}")

# Get all applications
response = requests.get(f"{API_BASE}/applications")
applications = response.json()
print(f"Total applications: {len(applications)}")
```

### JavaScript/Chrome Extension

```javascript
const API_BASE = "http://localhost:8000";

// Analyze a job
async function analyzeJob(jobUrl, jobText) {
  const response = await fetch(`${API_BASE}/analyze-job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobUrl, jobText })
  });
  return await response.json();
}

// Log an application
async function logApplication(data) {
  const response = await fetch(`${API_BASE}/log-application`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await response.json();
}

// Get statistics
async function getStats() {
  const response = await fetch(`${API_BASE}/applications/stats`);
  return await response.json();
}
```

## Error Handling

All endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid input)
- `404` - Not Found
- `500` - Internal Server Error (Claude API or database error)

Error responses include a detail message:

```json
{
  "detail": "Claude API error: Invalid API key"
}
```

## Development

### Running with Auto-Reload

```bash
uvicorn apply_fast_api:app --reload --host 0.0.0.0 --port 8000
```

### Testing Endpoints

Use the interactive docs at http://localhost:8000/docs to test all endpoints.

Or use curl:

```bash
# Health check
curl http://localhost:8000/

# Analyze job
curl -X POST http://localhost:8000/analyze-job \
  -H "Content-Type: application/json" \
  -d '{"jobUrl": "test", "jobText": "Looking for Python developer with 3+ years experience"}'
```

## Production Deployment

For production use:

1. **Set CORS origins** - Update `allow_origins` in CORS middleware to specific domains
2. **Use environment variables** - Never commit `.env` file
3. **Add authentication** - Implement API key or OAuth for security
4. **Use production database** - Consider PostgreSQL instead of SQLite
5. **Add rate limiting** - Protect against abuse
6. **Enable HTTPS** - Use reverse proxy (nginx) with SSL

## License

MIT License - See LICENSE file for details
