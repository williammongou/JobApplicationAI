# Dynamic Address Feature - Resume Generator

## 📍 How It Works

The resume generator automatically adjusts your contact address based on the job location to increase your chances of getting past initial screening filters.

## 🏠 Address Logic

### ✅ Oklahoma Jobs → Real Address
If the job is located in **Oklahoma**, your resume will show:
```
2712 Dennis Drive, Yukon, OK 73099 | (580) 447-9539 | williammongou@gmail.com
```

**Triggers:**
- Location contains: "Oklahoma", "OK", "OKC", "Tulsa", "Norman", "Yukon"

---

### 🚀 Relocatable States → Job Location
For jobs in these states, your resume shows the **job's city and state**:

- **TX** (Texas)
- **AK** (Alaska)
- **CO** (Colorado)
- **KS** (Kansas)
- **GA** (Georgia)
- **IL** (Illinois)
- **CA** (California)
- **NY** (New York)

**Example:**
- Job Location: "Austin, TX"
- Resume Shows: `Austin, TX | (580) 447-9539 | williammongou@gmail.com`

---

### 🌐 Remote or Other States → Oklahoma Address
For remote jobs or states not in the relocatable list, use Oklahoma address:
```
2712 Dennis Drive, Yukon, OK 73099 | (580) 447-9539 | williammongou@gmail.com
```

## 📋 Examples

| Job Location | Resume Address |
|-------------|----------------|
| Oklahoma City, OK | 2712 Dennis Drive, Yukon, OK 73099 |
| Tulsa, Oklahoma | 2712 Dennis Drive, Yukon, OK 73099 |
| Remote - Oklahoma | 2712 Dennis Drive, Yukon, OK 73099 |
| Austin, TX | Austin, TX |
| Denver, CO | Denver, CO |
| San Francisco, CA | San Francisco, CA |
| New York, NY | New York, NY |
| Remote | 2712 Dennis Drive, Yukon, OK 73099 |
| Seattle, WA | 2712 Dennis Drive, Yukon, OK 73099 |
| (No location) | 2712 Dennis Drive, Yukon, OK 73099 |

## 🧪 Testing

Run this command to test the dynamic address logic:

```bash
python resume_generator.py
```

This will:
1. Show how different job locations map to different addresses
2. Generate sample resumes for Oklahoma and Texas jobs
3. Display the contact section to verify correct address

## 🔌 API Usage

When calling the API, make sure to include the `location` field:

```javascript
const response = await fetch('http://localhost:8000/generate-resume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobRequirements: {
      title: "Software Engineer",
      company: "Tech Corp",
      location: "Austin, TX",  // 👈 This determines the address
      skills: ["Python", "AWS"],
      description: "Job description..."
    },
    userProfile: null  // Uses William's profile by default
  })
});
```

## ⚙️ Customization

To add more states to the relocatable list, edit `resume_generator.py`:

```python
relocatable_states = {
    'tx': 'Texas', 'texas': 'Texas',
    # Add more states here:
    'fl': 'Florida', 'florida': 'Florida',
    'az': 'Arizona', 'arizona': 'Arizona',
    # etc.
}
```

## 🎯 Why This Matters

Many companies use ATS (Applicant Tracking Systems) that:
- Filter out candidates who appear to be relocating
- Prioritize local candidates
- Flag addresses that don't match job location

By showing a local address (for states you're willing to relocate to), you:
- ✅ Pass initial ATS filters
- ✅ Appear as a "local" candidate
- ✅ Increase chances of getting to human review
- ✅ Can explain relocation details during interview

## ⚠️ Important Notes

1. **Be honest in interviews** - If asked about your location, explain you're planning to relocate
2. **Phone number stays the same** - Your Oklahoma number is consistent across all resumes
3. **Email stays the same** - williammongou@gmail.com on all resumes
4. **Only address changes** - Based on job location

## 🔄 How It's Integrated

The dynamic address feature is automatically used by:
- ✅ `/generate-resume` API endpoint
- ✅ `generate_tailored_resume()` function
- ✅ `generate_resume_with_analysis()` function

No additional configuration needed - just pass the job location in `jobRequirements`!
