# ApplyFast API - Complete Setup Guide

## 📋 What You've Got

A complete FastAPI backend with:
- ✅ Claude AI integration for job analysis
- ✅ Resume generation with match scoring
- ✅ Application question answering
- ✅ SQLite database for tracking applications
- ✅ Full REST API with interactive docs
- ✅ CORS enabled for Chrome extension integration

## 🚀 Quick Start (5 minutes)

### Step 1: Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `anthropic` - Claude API client
- `python-dotenv` - Environment variable management
- `pydantic` - Data validation

### Step 2: Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new API key
5. Copy it (starts with `sk-ant-...`)

### Step 3: Create .env File

```bash
# Create .env file
copy .env.example .env

# Edit .env and add your API key
notepad .env
```

Add this line:
```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### Step 4: Start the Server

**Option A: Using the batch file (Windows)**
```bash
start_api.bat
```

**Option B: Manually**
```bash
python apply_fast_api.py
```

The server will start on `http://localhost:8000`

### Step 5: Test It!

Open your browser and visit:
- **Interactive API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/

Or run the test script:
```bash
python test_api.py
```

## 📚 API Endpoints Overview

### 1. **POST /analyze-job** - Extract Job Requirements
Analyzes a job posting using Claude AI and returns structured data.

**Use Case**: When user clicks on a job, send the full job text to get extracted requirements, skills, and disqualifiers.

**Example:**
```javascript
const response = await fetch('http://localhost:8000/analyze-job', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobUrl: 'https://linkedin.com/jobs/123',
    jobText: 'Full job description here...'
  })
});
const jobData = await response.json();
// jobData = { title, company, skills, disqualifiers, ... }
```

### 2. **POST /generate-resume** - AI Resume Tailoring
Generates a customized resume for a specific job.

**Use Case**: One-click resume generation that highlights relevant skills and experience.

**Example:**
```javascript
const response = await fetch('http://localhost:8000/generate-resume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobRequirements: jobData,  // From /analyze-job
    userProfile: {
      name: 'John Doe',
      experience: 5,
      skills: ['Python', 'React'],
      // ... rest of profile
    }
  })
});
const resume = await response.json();
// resume = { resumeText, matchScore, highlightedSkills, honestyConcerns }
```

### 3. **POST /answer-question** - Application Question Helper
Generates thoughtful answers to application questions.

**Use Case**: Auto-fill application questions with AI-generated, honest answers.

**Example:**
```javascript
const response = await fetch('http://localhost:8000/answer-question', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'Why do you want to work here?',
    userProfile: userProfile,
    jobContext: { company: 'Acme Corp', title: 'SWE' }
  })
});
const answer = await response.json();
// answer = { answer: "...", confidence: "auto" | "review" | "manual" }
```

### 4. **POST /log-application** - Track Applications
Saves application to local database.

**Use Case**: Every time user applies, log it for tracking.

**Example:**
```javascript
const response = await fetch('http://localhost:8000/log-application', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobUrl: 'https://linkedin.com/jobs/123',
    company: 'Acme Corp',
    title: 'Software Engineer',
    status: 'applied',
    resumeUsed: 'tailored_v1.pdf',
    metadata: { matchScore: 85, platform: 'linkedin' }
  })
});
const result = await response.json();
// result = { success: true, applicationId: 42 }
```

### 5. **GET /applications** - Retrieve Application History
Get all logged applications with filtering.

**Use Case**: Dashboard showing all past applications.

**Example:**
```javascript
// Get all applications
const all = await fetch('http://localhost:8000/applications').then(r => r.json());

// Filter by status
const interviewed = await fetch('http://localhost:8000/applications?status=interviewed').then(r => r.json());

// Filter by company
const acme = await fetch('http://localhost:8000/applications?company=Acme').then(r => r.json());
```

### 6. **GET /applications/stats** - Analytics
Get statistics about your applications.

**Use Case**: Dashboard with charts and insights.

**Example:**
```javascript
const stats = await fetch('http://localhost:8000/applications/stats').then(r => r.json());
/*
stats = {
  total: 150,
  byStatus: { applied: 100, interviewed: 30, rejected: 15 },
  byCompany: { 'Acme Corp': 10, 'TechCo': 8 },
  perDay: { '2024-01-15': 5, '2024-01-14': 3 }
}
*/
```

## 🔌 Integrating with Chrome Extension

### Update manifest.json

Add host permissions for localhost:

```json
{
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "tabs"
  ],
  "host_permissions": [
    "http://localhost:8000/*"
  ]
}
```

### Create API client in extension

```javascript
// api-client.js
const API_BASE = 'http://localhost:8000';

class ApplyFastAPI {
  async analyzeJob(jobUrl, jobText) {
    const response = await fetch(`${API_BASE}/analyze-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobUrl, jobText })
    });
    return response.json();
  }

  async generateResume(jobRequirements, userProfile) {
    const response = await fetch(`${API_BASE}/generate-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobRequirements, userProfile })
    });
    return response.json();
  }

  async logApplication(data) {
    const response = await fetch(`${API_BASE}/log-application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async getApplications(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE}/applications?${params}`);
    return response.json();
  }

  async getStats() {
    const response = await fetch(`${API_BASE}/applications/stats`);
    return response.json();
  }
}

// Export singleton
const api = new ApplyFastAPI();
```

### Use in content script

```javascript
// In content.js
async function enhancedJobAnalysis() {
  const jobText = scrapeJob(); // Your existing scraper
  const jobUrl = window.location.href;

  // Call API for AI analysis
  const analysis = await api.analyzeJob(jobUrl, jobText);

  // Show enhanced UI with AI insights
  displayJobAnalysis(analysis);
}

// When user applies
async function onApplyClick() {
  const jobData = getCurrentJob();

  // Log the application
  await api.logApplication({
    jobUrl: window.location.href,
    company: jobData.company,
    title: jobData.title,
    status: 'applied',
    metadata: { matchScore: jobData.score }
  });
}
```

## 🗄️ Database

The API automatically creates `applyfast.db` SQLite database with this schema:

```sql
CREATE TABLE applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_url TEXT NOT NULL,
    company TEXT,
    title TEXT,
    status TEXT,
    resume_used TEXT,
    timestamp TEXT NOT NULL,
    metadata TEXT,  -- JSON string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Viewing the database

**Using DB Browser for SQLite** (Recommended):
1. Download from https://sqlitebrowser.org/
2. Open `applyfast.db`
3. Browse data, run queries

**Using Python:**
```python
import sqlite3
conn = sqlite3.connect('applyfast.db')
cursor = conn.execute('SELECT * FROM applications ORDER BY created_at DESC LIMIT 10')
for row in cursor:
    print(row)
```

**Using SQLite CLI:**
```bash
sqlite3 applyfast.db
> SELECT * FROM applications;
> .quit
```

## 🧪 Testing

### Manual Testing with cURL

```bash
# Health check
curl http://localhost:8000/

# Analyze job
curl -X POST http://localhost:8000/analyze-job \
  -H "Content-Type: application/json" \
  -d '{"jobUrl": "test", "jobText": "Senior Python Developer with 5+ years experience"}'

# Get applications
curl http://localhost:8000/applications
```

### Automated Testing

```bash
python test_api.py
```

This runs a full test suite covering all endpoints.

## 📊 API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:8000/docs
  - Interactive API documentation
  - Test endpoints directly in browser
  - See request/response schemas

- **ReDoc**: http://localhost:8000/redoc
  - Alternative API documentation
  - Better for reading/printing

- **OpenAPI JSON**: http://localhost:8000/openapi.json
  - Machine-readable API specification
  - Use for generating clients

## 🔐 Security Notes

### Current State (Development)
- ✅ CORS allows all origins (`*`)
- ✅ No authentication required
- ✅ Runs on localhost only

### For Production (Future)
You'll need to add:

1. **Authentication**
   - API key authentication
   - JWT tokens
   - OAuth integration

2. **Rate Limiting**
   - Prevent abuse
   - Limit requests per user/IP

3. **CORS Restriction**
   - Only allow your extension ID
   - Whitelist specific domains

4. **HTTPS**
   - Use reverse proxy (nginx)
   - SSL certificates

5. **Database Migration**
   - Move from SQLite to PostgreSQL
   - Add connection pooling
   - Regular backups

## 💰 Cost Estimation

### Claude API Costs

**Sonnet 4.5 Pricing** (as of 2024):
- Input: $3 per million tokens
- Output: $15 per million tokens

**Estimated costs per request:**
- `/analyze-job`: ~$0.01 - $0.02 per job
- `/generate-resume`: ~$0.03 - $0.05 per resume
- `/answer-question`: ~$0.005 - $0.01 per question

**For 100 job applications:**
- 100 job analyses: ~$1.50
- 10 resume generations: ~$0.40
- 200 question answers: ~$1.50
- **Total: ~$3.40**

Pretty affordable for serious job hunting!

## 🐛 Troubleshooting

### Error: "ANTHROPIC_API_KEY not found"
- Make sure `.env` file exists in the same directory as `apply_fast_api.py`
- Check that the key is formatted correctly: `ANTHROPIC_API_KEY=sk-ant-...`
- Restart the server after adding the key

### Error: "Could not connect to API"
- Make sure the server is running (`python apply_fast_api.py`)
- Check that nothing else is using port 8000
- Try http://localhost:8000/ in your browser

### Error: "Claude API error: Invalid API key"
- Verify your API key at https://console.anthropic.com/
- Make sure you have credits/billing set up
- Try generating a new API key

### Database locked error
- Close any other programs accessing `applyfast.db`
- On Windows, check if SQLite browser is open

### CORS errors in Chrome extension
- Make sure API is running
- Check that CORS middleware is enabled
- Verify `allow_origins` includes `*` or your extension origin

## 🚀 Next Steps

Now that your API is running, you can:

1. **Integrate with Chrome Extension**
   - Add API calls to existing content.js
   - Create dashboard for viewing applications
   - Add resume generation button

2. **Add Features**
   - Cover letter generation
   - Interview prep questions
   - Salary negotiation tips
   - Email templates

3. **Build Dashboard**
   - Create web interface to view applications
   - Charts and analytics
   - Export to CSV/PDF

4. **Deploy to Production**
   - Host on AWS/GCP/Heroku
   - Add authentication
   - Set up monitoring

## 📞 Support

If you run into issues:
1. Check the API logs (in the terminal where server is running)
2. Review the test script output
3. Check the interactive docs at http://localhost:8000/docs
4. Review error messages in Chrome DevTools console

---

**Happy job hunting! 🎯**
