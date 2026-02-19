// ── DOM References ──────────────────────────────────────────────
const jobView = document.getElementById('job-view');
const settingsView = document.getElementById('settings-view');
const settingsBtn = document.getElementById('settings-btn');
const backBtn = document.getElementById('back-btn');
const refreshBtn = document.getElementById('refresh-btn');
const saveBtn = document.getElementById('save-btn');
const applyBtn = document.getElementById('apply-btn');

const noJobMsg = document.getElementById('no-job-msg');
const jobCard = document.getElementById('job-card');
const jobTitleEl = document.getElementById('job-title');
const jobCompanyEl = document.getElementById('job-company');
const jobLocationEl = document.getElementById('job-location');
const scoreCircle = document.getElementById('score-circle');
const scoreValue = document.getElementById('score-value');
const scoreVerdict = document.getElementById('score-verdict');
const skillTagsEl = document.getElementById('skill-tags');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const toast = document.getElementById('toast');

// ── View Navigation ─────────────────────────────────────────────
settingsBtn.addEventListener('click', () => {
  jobView.classList.remove('active');
  settingsView.classList.add('active');
  loadProfile();
});

backBtn.addEventListener('click', () => {
  settingsView.classList.remove('active');
  jobView.classList.add('active');
});

// ── Profile Save / Load ─────────────────────────────────────────
function loadProfile() {
  chrome.storage.local.get('userProfile', (data) => {
    const p = data.userProfile || {};
    document.getElementById('user-name').value = p.name || '';
    document.getElementById('user-title').value = p.title || '';
    document.getElementById('user-skills').value = p.skills || '';
    document.getElementById('user-experience').value = p.experience || '';
    document.getElementById('user-location').value = p.location || '';
  });
}

saveBtn.addEventListener('click', () => {
  const profile = {
    name: document.getElementById('user-name').value.trim(),
    title: document.getElementById('user-title').value.trim(),
    skills: document.getElementById('user-skills').value.trim(),
    experience: document.getElementById('user-experience').value.trim(),
    location: document.getElementById('user-location').value.trim(),
  };
  chrome.storage.local.set({ userProfile: profile }, () => {
    showToast('Profile saved!');
  });
});

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ── Score Calculation ───────────────────────────────────────────
function computeMatchScore(jobData, profile) {
  if (!profile || !profile.skills) return { score: 0, matched: [], missing: [] };

  const userSkills = profile.skills
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const jobText = (
    (jobData.title || '') +
    ' ' +
    (jobData.description || '')
  ).toLowerCase();

  const matched = [];
  const missing = [];

  userSkills.forEach((skill) => {
    if (jobText.includes(skill)) {
      matched.push(skill);
    }
  });

  // Extract common tech keywords from job text that user might be missing
  const commonKeywords = [
    'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue',
    'node', 'sql', 'aws', 'docker', 'kubernetes', 'git', 'agile', 'rest',
    'graphql', 'css', 'html', 'mongodb', 'postgresql', 'redis', 'linux',
    'ci/cd', 'terraform', 'figma', 'swift', 'kotlin', 'rust', 'go',
  ];

  commonKeywords.forEach((kw) => {
    if (jobText.includes(kw) && !userSkills.includes(kw)) {
      missing.push(kw);
    }
  });

  // Cap missing at 5 most relevant
  const topMissing = missing.slice(0, 5);

  // Score: ratio of matched skills to (matched + missing) with some weighting
  const total = matched.length + topMissing.length;
  const score = total > 0 ? Math.round((matched.length / total) * 100) : 0;

  return { score, matched, missing: topMissing };
}

// ── Render Job Data ─────────────────────────────────────────────
function renderJob(jobData, profile) {
  noJobMsg.style.display = 'none';
  jobCard.style.display = 'block';

  jobTitleEl.textContent = jobData.title || 'Unknown Title';
  jobCompanyEl.textContent = jobData.company || 'Unknown Company';
  jobLocationEl.textContent = jobData.location || '';

  const { score, matched, missing } = computeMatchScore(jobData, profile);

  // Animate score ring
  const circumference = 150.8; // 2 * PI * 24
  const offset = circumference - (score / 100) * circumference;
  scoreCircle.style.strokeDashoffset = offset;

  // Color the ring based on score
  if (score >= 70) {
    scoreCircle.style.stroke = '#22c55e';
  } else if (score >= 40) {
    scoreCircle.style.stroke = '#eab308';
  } else {
    scoreCircle.style.stroke = '#ef4444';
  }

  scoreValue.textContent = score + '%';

  // Verdict
  if (score >= 70) {
    scoreVerdict.textContent = 'Strong Match';
    scoreVerdict.className = 'verdict high';
  } else if (score >= 40) {
    scoreVerdict.textContent = 'Partial Match';
    scoreVerdict.className = 'verdict medium';
  } else {
    scoreVerdict.textContent = 'Weak Match';
    scoreVerdict.className = 'verdict low';
  }

  // Skill tags
  skillTagsEl.innerHTML = '';
  matched.forEach((s) => {
    const tag = document.createElement('span');
    tag.className = 'skill-tag matched';
    tag.textContent = s;
    skillTagsEl.appendChild(tag);
  });
  missing.forEach((s) => {
    const tag = document.createElement('span');
    tag.className = 'skill-tag missing';
    tag.textContent = s;
    skillTagsEl.appendChild(tag);
  });

  setStatus(true, 'Job detected');
}

function setStatus(active, text) {
  statusDot.className = 'status-dot ' + (active ? 'active' : 'inactive');
  statusText.textContent = text;
}

// ── Scrape Active Tab ───────────────────────────────────────────
function scrapeActiveTab() {
  setStatus(false, 'Scanning page...');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) {
      setStatus(false, 'No active tab');
      return;
    }

    const url = tab.url || '';
    const isJobPage =
      url.includes('linkedin.com/jobs') ||
      url.includes('linkedin.com/job') ||
      url.includes('indeed.com/viewjob') ||
      url.includes('indeed.com/jobs') ||
      url.includes('boards.greenhouse.io') ||
      url.includes('jobs.lever.co') ||
      url.includes('myworkdayjobs.com');

    if (!isJobPage) {
      noJobMsg.style.display = 'block';
      jobCard.style.display = 'none';
      setStatus(false, 'Not a job page');
      return;
    }

    // Send message to content script to scrape
    chrome.tabs.sendMessage(tab.id, { action: 'scrapeJob' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        // Content script might not be injected yet — try injecting it
        setStatus(false, 'Injecting scraper...');
        chrome.scripting.executeScript(
          { target: { tabId: tab.id }, files: ['content.js'] },
          () => {
            if (chrome.runtime.lastError) {
              console.error('[ApplyFast]', chrome.runtime.lastError.message);
              setStatus(false, 'Cannot access page — try refreshing');
              return;
            }
            // Give LinkedIn/SPA time to have DOM ready, then ask content script
            // Content script itself retries internally, so one message is enough
            setStatus(false, 'Waiting for page content...');
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: 'scrapeJob' }, (res) => {
                if (chrome.runtime.lastError) {
                  setStatus(false, 'Script lost — refresh the page');
                  return;
                }
                if (res && res.success) {
                  loadProfileAndRender(res.data);
                } else {
                  setStatus(false, 'Could not read job data — try refreshing');
                }
              });
            }, 2000);
        return;
      });

      loadProfileAndRender(response.data);
    }
  })
  })
}

function loadProfileAndRender(jobData) {
  chrome.storage.local.get('userProfile', (data) => {
    renderJob(jobData, data.userProfile);
  });
}

// ── Apply Button ────────────────────────────────────────────────
applyBtn.addEventListener('click', () => {
  applyBtn.disabled = true;
  applyBtn.innerHTML = '&#x23F3; Generating resume...';

  // Simulate resume generation (placeholder for real API integration)
  setTimeout(() => {
    applyBtn.innerHTML = '&#x2705; Resume ready! Redirecting...';
    setTimeout(() => {
      applyBtn.disabled = false;
      applyBtn.innerHTML = '&#x1F680; Build Resume &amp; Apply';
      showToast('Resume generated! (Demo)');
    }, 2000);
  }, 2000);
});

// ── Refresh ─────────────────────────────────────────────────────
refreshBtn.addEventListener('click', scrapeActiveTab);

// ── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', scrapeActiveTab);
