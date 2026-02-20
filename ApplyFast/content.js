// ══════════════════════════════════════════════════════════════════
//  ApplyFast - Content Script
//  Multi-platform job scraper for LinkedIn, Indeed, Greenhouse, Lever, Workday
//  Includes: Utilities, Validators, Scrapers, UI, Navigation, Disqualifiers
// ══════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  if (window.__applyFastInjected) return;
  window.__applyFastInjected = true;

  // ════════════════════════════════════════════════════════════════
  //  DEBUG MODE & LOGGING
  // ════════════════════════════════════════════════════════════════

  const DEBUG = false;

  function log(...args) {
    if (DEBUG) console.log('[ApplyFast]', ...args);
  }

  function error(...args) {
    console.error('[ApplyFast]', ...args);
  }

  // ════════════════════════════════════════════════════════════════
  //  UTILITIES
  // ════════════════════════════════════════════════════════════════

  /** Return trimmed innerText of the first element matching any selector */
  function getText(...selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const txt = el.innerText.trim();
        if (txt) return txt;
      }
    }
    return null;
  }

  /** Return the first element matching any selector */
  function getEl(...selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  /** Collapse whitespace */
  function clean(str) {
    return str ? str.replace(/\s+/g, ' ').trim() : null;
  }

  /** Get a CSS selector string that uniquely targets the given element */
  function getSelector(el) {
    if (!el) return null;
    if (el.id) return '#' + el.id;
    // Build a reasonably specific selector
    const parts = [];
    let node = el;
    while (node && node !== document.body) {
      let seg = node.tagName.toLowerCase();
      if (node.id) { seg = '#' + node.id; parts.unshift(seg); break; }
      if (node.className && typeof node.className === 'string') {
        const cls = node.className.trim().split(/\s+/).slice(0, 2).join('.');
        if (cls) seg += '.' + cls;
      }
      parts.unshift(seg);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  /** Shorten text to a maximum length */
  function shortenText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /** Create an empty result object */
  function emptyResult(platform) {
    return {
      platform,
      url: window.location.href,
      scrapedAt: new Date().toISOString(),
      title: null,
      company: null,
      location: null,
      description: null,
      requiredSkills: null,
      yearsOfExperience: null,
      remotePolicy: null,
      salary: null,
      clearanceRequirements: null,
      applyButtonSelector: null,
    };
  }

  // ════════════════════════════════════════════════════════════════
  //  JOB TITLE MATCHING
  // ════════════════════════════════════════════════════════════════

  /**
   * Job title aliases and related positions
   */
  const JOB_TITLE_ALIASES = {
    'software engineer': ['backend engineer', 'frontend engineer', 'full stack engineer', 'fullstack engineer',
                          'software developer', 'software dev', 'app developer', 'application developer',
                          'sde', 'swe', 'swd', 'developer', 'engineer', 'full stack developer',
                          'backend developer', 'frontend developer', 'web developer', 'application engineer'],
    'data scientist': ['data analyst', 'machine learning engineer', 'ml engineer', 'ai engineer',
                       'data engineer', 'analytics engineer', 'research scientist', 'applied scientist',
                       'mlops engineer', 'ai researcher'],
    'product manager': ['product owner', 'technical product manager', 'associate product manager',
                        'senior product manager', 'product lead', 'program manager', 'tpm'],
    'designer': ['ui designer', 'ux designer', 'ui/ux designer', 'product designer',
                 'visual designer', 'graphic designer', 'interaction designer', 'experience designer'],
    'devops engineer': ['site reliability engineer', 'sre', 'platform engineer', 'infrastructure engineer',
                        'cloud engineer', 'systems engineer', 'build engineer', 'release engineer'],
    'qa engineer': ['quality assurance engineer', 'test engineer', 'sdet', 'automation engineer',
                    'software tester', 'qa analyst', 'quality engineer'],
    'security engineer': ['cybersecurity engineer', 'information security engineer', 'security analyst',
                          'infosec engineer', 'application security engineer', 'appsec engineer'],
    'mobile developer': ['ios developer', 'android developer', 'mobile engineer', 'ios engineer',
                         'android engineer', 'mobile app developer'],
    'data engineer': ['etl developer', 'big data engineer', 'data pipeline engineer',
                      'analytics engineer', 'data platform engineer'],
    'solutions architect': ['cloud architect', 'enterprise architect', 'technical architect',
                            'software architect', 'systems architect'],
  };

  /**
   * Check if job title matches user's preferred title
   */
  function isJobTitleMatch(jobTitle, userPreferredTitle) {
    if (!jobTitle || !userPreferredTitle) return true; // No warning if either is missing

    const normalizedJobTitle = jobTitle.toLowerCase().trim();
    const normalizedUserTitle = userPreferredTitle.toLowerCase().trim();

    // Direct match
    if (normalizedJobTitle.includes(normalizedUserTitle) ||
        normalizedUserTitle.includes(normalizedJobTitle)) {
      return true;
    }

    // Check aliases - both ways
    for (const [baseTitle, aliases] of Object.entries(JOB_TITLE_ALIASES)) {
      const allTitles = [baseTitle, ...aliases];

      // Check if user's title is in this group
      const userTitleInGroup = allTitles.some(title =>
        normalizedUserTitle.includes(title) || title.includes(normalizedUserTitle)
      );

      // Check if job title is in this group
      const jobTitleInGroup = allTitles.some(title =>
        normalizedJobTitle.includes(title) || title.includes(normalizedJobTitle)
      );

      // If both are in the same group, they match
      if (userTitleInGroup && jobTitleInGroup) {
        return true;
      }
    }

    // Check for common abbreviations
    const abbreviations = {
      'sde': 'software development engineer',
      'swe': 'software engineer',
      'swd': 'software developer',
      'sre': 'site reliability engineer',
      'tpm': 'technical program manager',
      'pm': 'product manager',
      'sdet': 'software development engineer in test',
      'qa': 'quality assurance',
    };

    for (const [abbr, full] of Object.entries(abbreviations)) {
      if ((normalizedJobTitle === abbr && normalizedUserTitle.includes(full)) ||
          (normalizedUserTitle === abbr && normalizedJobTitle.includes(full))) {
        return true;
      }
    }

    return false;
  }

  // ════════════════════════════════════════════════════════════════
  //  JOB DESCRIPTION VALIDATION
  // ════════════════════════════════════════════════════════════════

  /**
   * Predefined phrases that indicate a valid job description is present.
   */
  const VALID_JOB_DESCRIPTION_PHRASES = [
    'Job Description & Summary',
    'Job Description',
    'About the Role',
    'About the Job',
    'About the Position',
    'Position Summary',
    'Role Summary',
    'What You\'ll Do',
    'Responsibilities',
    'Job Summary',
    'Role Description',
    'Position Description',
    'Job Details',
    'Role Details',
    'Job Posting',
    'Career Opportunity',
    'Open Position',
    'We\'re Hiring',
    'Join Our Team',
    'Qualifications',
    'Requirements',
    'Key Responsibilities',
    'Your Responsibilities'
  ];

  /**
   * Checks if the current page contains a valid job description.
   * Returns a promise that resolves to true/false after waiting for content to load.
   */
  function hasValidJobDescription(maxWaitMs = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = 200;

      function check() {
        const pageText = document.body.innerText || '';
        const normalizedText = pageText.toLowerCase();

        for (const phrase of VALID_JOB_DESCRIPTION_PHRASES) {
          if (normalizedText.includes(phrase.toLowerCase())) {
            log('Found valid job description phrase:', phrase);
            resolve(true);
            return;
          }
        }

        const elapsed = Date.now() - startTime;
        if (elapsed >= maxWaitMs) {
          log('No valid job description phrases found after', elapsed, 'ms');
          resolve(false);
          return;
        }

        setTimeout(check, checkInterval);
      }

      check();
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  NLP-STYLE EXTRACTORS
  // ════════════════════════════════════════════════════════════════

  /**
   * Split a job description into the section that contains required /
   * must-have / minimum qualifications, vs. everything else.
   */
  function extractRequiredSection(text) {
    if (!text) return { required: null, full: null };

    const patterns = [
      /(?:required|minimum|must[ -]have|basic)\s*(?:skills|qualifications|requirements|experience)[:\s]*/i,
      /what\s+you(?:'ll)?\s+need[:\s]*/i,
      /qualifications[:\s]*/i,
      /requirements[:\s]*/i,
    ];

    for (const pat of patterns) {
      const match = text.match(pat);
      if (match) {
        const start = match.index + match[0].length;
        const rest = text.slice(start);
        const nextSection = rest.search(
          /\n\s*(?:preferred|nice to have|bonus|benefits|about us|about the|what we offer|responsibilities|perks|additional|desired|compensation)/i
        );
        const section = nextSection > 0 ? rest.slice(0, nextSection) : rest.slice(0, 2000);
        return { required: section.trim(), full: text };
      }
    }
    return { required: null, full: text };
  }

  /** Pull out explicit years-of-experience mentions */
  function extractYearsOfExperience(text) {
    if (!text) return null;
    const patterns = [
      /(\d+)\+?\s*(?:to|-)\s*(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience|exp)/i,
      /(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience|exp|professional|relevant|related|work)/i,
      /(?:experience|exp)[:\s]*(\d+)\+?\s*years?/i,
      /minimum\s+(?:of\s+)?(\d+)\+?\s*years?/i,
      /at\s+least\s+(\d+)\+?\s*years?/i,
    ];
    for (const pat of patterns) {
      const m = text.match(pat);
      if (m) {
        if (m[2]) return m[1] + '-' + m[2] + ' years';
        return m[1] + '+ years';
      }
    }
    return null;
  }

  /** Detect remote / hybrid / on-site signals */
  function extractRemotePolicy(text, locationStr) {
    const combined = ((text || '') + ' ' + (locationStr || '')).toLowerCase();
    if (/\bfully\s*remote\b/.test(combined)) return 'Remote';
    if (/\bremote\b/.test(combined) && /\bhybrid\b/.test(combined)) return 'Hybrid / Remote';
    if (/\bhybrid\b/.test(combined)) return 'Hybrid';
    if (/\bremote\b/.test(combined)) return 'Remote';
    if (/\bon[- ]?site\b/.test(combined) || /\bin[- ]?office\b/.test(combined)) return 'On-site';
    return null;
  }

  /** Extract salary / compensation range */
  function extractSalary(text) {
    if (!text) return null;
    const patterns = [
      /\$\s*([\d,]+\.?\d*)\s*[kK]?\s*(?:[-–—to]+)\s*\$\s*([\d,]+\.?\d*)\s*[kK]?\s*(?:per\s+(?:year|annum|yr)|\/?(?:yr|year|annual))?/,
      /\$\s*([\d,]+\.?\d*)\s*[kK]?\s*(?:per\s+(?:year|annum|yr)|\/?(?:yr|year|annual))/i,
      /\$\s*([\d,]+\.?\d*)\s*(?:[-–—to]+)\s*\$\s*([\d,]+\.?\d*)\s*(?:per\s+hour|\/\s*hr|\/\s*hour)/i,
    ];
    for (const pat of patterns) {
      const m = text.match(pat);
      if (m) return m[0].trim();
    }
    return null;
  }

  /** Detect citizenship / security clearance requirements */
  function extractClearance(text) {
    if (!text) return null;
    const flags = [];
    const lower = text.toLowerCase();

    if (/\bus\s+citizen/.test(lower) || /united\s+states\s+citizen/.test(lower) ||
        /\bu\.s\.\s+citizen/.test(lower))
      flags.push('US Citizenship Required');
    if (/\bgreen\s*card\b/.test(lower))
      flags.push('Green Card Acceptable');
    if (/\bsecurity\s+clearance\b/.test(lower))
      flags.push('Security Clearance Required');
    if (/\btop\s+secret\b/i.test(lower))
      flags.push('Top Secret Clearance');
    if (/\bts\/sci\b/i.test(lower))
      flags.push('TS/SCI Clearance');
    if (/\bpublic\s+trust\b/i.test(lower))
      flags.push('Public Trust Clearance');
    if (/\bauthori[sz]ed\s+to\s+work\b/.test(lower))
      flags.push('Work Authorization Required');
    if (/\bexport\s+control\b/.test(lower) || /\bitar\b/.test(lower) || /\bear\b/.test(lower))
      flags.push('Export Control / ITAR');

    return flags.length > 0 ? flags : null;
  }

  /** Extract skills from the required-qualifications section */
  function extractSkills(reqSection, fullText) {
    const source = reqSection || fullText || '';

    const knownSkills = [
      'javascript', 'typescript', 'python', 'java', 'c\\+\\+', 'c#', 'go', 'golang',
      'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r\\b',
      'react', 'angular', 'vue', 'svelte', 'next\\.?js', 'nuxt',
      'node\\.?js', 'express', 'django', 'flask', 'fastapi', 'spring',
      'rails', 'laravel', 'asp\\.net',
      'html', 'css', 'sass', 'tailwind', 'bootstrap',
      'sql', 'nosql', 'postgresql', 'postgres', 'mysql', 'mongodb', 'redis',
      'dynamodb', 'cassandra', 'elasticsearch',
      'aws', 'azure', 'gcp', 'google cloud',
      'docker', 'kubernetes', 'k8s', 'terraform', 'ansible',
      'ci/cd', 'jenkins', 'github actions', 'gitlab',
      'git', 'linux', 'unix', 'bash',
      'rest', 'graphql', 'grpc', 'api',
      'machine learning', 'deep learning', 'nlp', 'computer vision',
      'tensorflow', 'pytorch', 'scikit-learn',
      'data analysis', 'data engineering', 'etl', 'spark', 'hadoop',
      'tableau', 'power bi', 'excel',
      'figma', 'sketch', 'adobe',
      'agile', 'scrum', 'jira', 'kanban',
      'product management', 'project management',
      'communication', 'leadership', 'problem.solving',
    ];

    const lower = source.toLowerCase();
    const found = [];

    for (const skill of knownSkills) {
      const re = new RegExp('\\b' + skill + '\\b', 'i');
      if (re.test(lower)) {
        const m = source.match(new RegExp('\\b(' + skill + ')\\b', 'i'));
        const label = m ? m[1] : skill;
        const normalized = label.toLowerCase().replace(/\./g, '');
        if (!found.some((f) => f.toLowerCase().replace(/\./g, '') === normalized)) {
          found.push(label);
        }
      }
    }
    return found.length > 0 ? found : null;
  }

  /** Run all NLP extractors on description text */
  function analyzeDescription(description, locationHint) {
    const { required, full } = extractRequiredSection(description);
    return {
      requiredSkills: extractSkills(required, full),
      yearsOfExperience: extractYearsOfExperience(full),
      remotePolicy: extractRemotePolicy(full, locationHint),
      salary: extractSalary(full),
      clearanceRequirements: extractClearance(full),
    };
  }

  // ════════════════════════════════════════════════════════════════
  //  DISQUALIFIER ENGINE
  // ════════════════════════════════════════════════════════════════

  /**
   * Analyzes job description text against a user profile and returns
   * a structured verdict: score, status, disqualifiers, warnings, matches, missing skills
   */
  function detectDisqualifiers(jobText, userProfile) {
    const text = (jobText || '').toLowerCase();
    const profile = userProfile || {};

    const disqualifiers = [];
    const warnings = [];
    const matches = [];
    const missingSkills = [];

    let score = 100;

    // ── Citizenship & Work Authorization ──────────────────────────
    const citizenshipPatterns = [
      { re: /\b(?:must\s+be|requires?|only)\s+(?:a\s+)?(?:u\.?s\.?\s+citizen|united\s+states\s+citizen)/i, label: 'Requires US Citizenship' },
      { re: /\bu\.?s\.?\s+citizen(?:ship)?\s+(?:is\s+)?required/i, label: 'Requires US Citizenship' },
      { re: /\bcitizens?\s+only\b/i, label: 'Requires US Citizenship' },
      { re: /\bmust\s+(?:hold|have|possess)\s+(?:a\s+)?(?:u\.?s\.?\s+citizen)/i, label: 'Requires US Citizenship' },
      { re: /\bonly\s+u\.?s\.?\s+citizens?\b/i, label: 'Requires US Citizenship' },
      { re: /\busc\b/i, label: 'Requires US Citizenship' },
      { re: /\bu\.?s\.?\s+citizen(?:ship)?\b/i, label: 'Requires US Citizenship' },
      { re: /\busc\s+or\s+(?:gc|green\s*card)\s*holder/i, label: 'Requires USC or Green Card Holder' },
      { re: /\bu\.?s\.?\s+citizen(?:ship)?\s+or\s+green\s*card\s*holder/i, label: 'Requires USC or Green Card Holder' },
      { re: /\bgreen\s*card\s*holder\s+or\s+u\.?s\.?\s+citizen/i, label: 'Requires USC or Green Card Holder' },
      { re: /\b(?:must\s+be|requires?)\s+(?:a\s+)?(?:u\.?s\.?\s+citizen|usc)\s+or\s+(?:green\s*card|gc)\s*holder/i, label: 'Requires USC or Green Card Holder' },
      { re: /\bgc\s+holder\b/i, label: 'Requires Green Card Holder' },
      { re: /\bgreen\s*card\s*holder\b/i, label: 'Requires Green Card Holder' },
      { re: /\bmust\s+(?:hold|have|possess)\s+(?:a\s+)?green\s*card/i, label: 'Requires Green Card Holder' },
      { re: /\bgreen\s*card\s+required\b/i, label: 'Requires Green Card Holder' },
      { re: /\bpermanent\s+resident\b/i, label: 'Requires Green Card Holder' },
      { re: /\bnot\s+(?:able|willing)\s+to\s+sponsor/i, label: 'No visa sponsorship' },
      { re: /\bunable\s+to\s+(?:provide\s+)?sponsor/i, label: 'No visa sponsorship' },
      { re: /\bwill\s+not\s+sponsor/i, label: 'No visa sponsorship' },
      { re: /\bno\s+(?:visa\s+)?sponsorship/i, label: 'No visa sponsorship' },
      { re: /\bwithout\s+(?:the\s+)?need\s+for\s+(?:current\s+or\s+future\s+)?sponsorship/i, label: 'No visa sponsorship' },
    ];

    const seenCitizenshipFlags = new Set();

    for (const { re, label } of citizenshipPatterns) {
      if (re.test(text) && !seenCitizenshipFlags.has(label)) {
        seenCitizenshipFlags.add(label);

        const citizenship = (profile.citizenship || '').toLowerCase();

        if (label === 'Requires US Citizenship') {
          if (citizenship === 'us_citizen') {
            matches.push('US Citizenship required — you qualify');
          } else {
            disqualifiers.push(label);
            score -= 40;
          }
        }

        if (label === 'Requires USC or Green Card Holder') {
          if (citizenship === 'us_citizen' || citizenship === 'green_card') {
            matches.push('USC or Green Card required — you qualify');
          } else {
            disqualifiers.push(label);
            score -= 38;
          }
        }

        if (label === 'Requires Green Card Holder') {
          if (citizenship === 'us_citizen' || citizenship === 'green_card') {
            matches.push('Green Card / USC required — you qualify');
          } else {
            disqualifiers.push(label);
            score -= 35;
          }
        }

        if (label === 'No visa sponsorship') {
          if (profile.needsSponsorship) {
            disqualifiers.push(label);
            score -= 35;
          } else {
            matches.push('No sponsorship needed — you qualify');
          }
        }
      }
    }

    // ── Security Clearance ────────────────────────────────────────
    const clearancePatterns = [
      { re: /\bts\s*\/\s*sci\b/i, label: 'Requires TS/SCI Clearance', weight: 40 },
      { re: /\btop\s+secret\b/i, label: 'Requires Top Secret Clearance', weight: 40 },
      { re: /\bsecret\s+clearance\b/i, label: 'Requires Secret Clearance', weight: 35 },
      { re: /\bactive\s+(?:security\s+)?clearance\b/i, label: 'Requires active security clearance', weight: 35 },
      { re: /\bclearance\s+(?:is\s+)?required\b/i, label: 'Security clearance required', weight: 35 },
      { re: /\bmust\s+(?:have|hold|possess|maintain)\s+(?:an?\s+)?(?:active\s+)?(?:security\s+)?clearance/i, label: 'Security clearance required', weight: 35 },
      { re: /\bpublic\s+trust\b/i, label: 'Requires Public Trust clearance', weight: 20 },
      { re: /\bsuitability\s+determination\b/i, label: 'Requires suitability determination', weight: 15 },
    ];

    const seenClearanceFlags = new Set();

    for (const { re, label, weight } of clearancePatterns) {
      if (re.test(text) && !seenClearanceFlags.has(label)) {
        seenClearanceFlags.add(label);

        const preferred = isInPreferredContext(text, re);

        if (preferred) {
          warnings.push('Prefers: ' + label);
          score -= Math.round(weight * 0.3);
        } else {
          disqualifiers.push(label);
          score -= weight;
        }
      }
    }

    // ── Years of Experience ───────────────────────────────────────
    const yoePatterns = [
      /(\d+)\+?\s*(?:to|-|–)\s*(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience|professional|relevant)/i,
      /(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience|professional|relevant|related|hands[\s-]on|work|industry)/i,
      /(?:minimum|at\s+least|no\s+less\s+than)\s+(?:of\s+)?(\d+)\+?\s*years?/i,
      /(\d+)\+?\s*years?\s+(?:or\s+more\s+)?(?:of\s+)?(?:experience|exp\.?)\b/i,
    ];

    let requiredYears = null;

    for (const pat of yoePatterns) {
      const m = text.match(pat);
      if (m) {
        const parsed = parseInt(m[2] || m[1], 10);
        if (requiredYears === null || parsed > requiredYears) {
          requiredYears = parsed;
        }
      }
    }

    if (requiredYears !== null) {
      const userYears = profile.yearsExperience || 0;
      const gap = requiredYears - userYears;

      if (gap <= 0) {
        matches.push(
          'Requires ' + requiredYears + '+ years experience — you have ' + userYears
        );
      } else if (gap <= 2) {
        warnings.push(
          'Requires ' + requiredYears + '+ years — you have ' + userYears + ' (close)'
        );
        score -= 8 * gap;
      } else {
        disqualifiers.push(
          'Requires ' + requiredYears + '+ years experience — you have ' + userYears
        );
        score -= Math.min(10 * gap, 35);
      }
    }

    // ── Education Requirements ────────────────────────────────────
    const eduPatterns = [
      { re: /\b(?:ph\.?d|doctorate)\b.*?\brequired\b/i, label: 'Requires PhD', weight: 25 },
      { re: /\brequired\b.*?\b(?:ph\.?d|doctorate)\b/i, label: 'Requires PhD', weight: 25 },
      { re: /\bmaster(?:'?s)?\s+degree\b.*?\brequired\b/i, label: 'Requires Master\'s degree', weight: 20 },
      { re: /\brequired\b.*?\bmaster(?:'?s)?\s+degree\b/i, label: 'Requires Master\'s degree', weight: 20 },
    ];

    for (const { re, label, weight } of eduPatterns) {
      if (re.test(text)) {
        warnings.push(label);
        score -= weight;
        break;
      }
    }

    // ── Location & Relocation ─────────────────────────────────────
    const userLocation = (profile.location || '').toLowerCase();

    const isRemote = /\bfully\s+remote\b/i.test(text) || /\bremote\s+(?:position|role|work|job)\b/i.test(text);
    const isHybrid = /\bhybrid\b/i.test(text);
    const isOnSite = /\bon[\s-]?site\b/i.test(text) || /\bin[\s-]?office\b/i.test(text) || /\bin[\s-]?person\b/i.test(text);
    const mustRelocate = /\bmust\s+(?:be\s+)?(?:willing\s+to\s+)?relocate\b/i.test(text) ||
                         /\brelocation\s+required\b/i.test(text);

    const locationMatch = text.match(/\blocation\s*:\s*([^\n.]{3,60})/i);
    const jobLocation = locationMatch ? locationMatch[1].trim().toLowerCase() : '';

    if (isOnSite || isHybrid) {
      const locationMismatch = userLocation && jobLocation &&
        !jobLocation.includes(userLocation) && !userLocation.includes(jobLocation);

      if (locationMismatch) {
        if (profile.willingToRelocate) {
          warnings.push('On-site/hybrid role — relocation may be needed');
          score -= 5;
        } else if (mustRelocate) {
          disqualifiers.push('Requires relocation — you are not willing to relocate');
          score -= 20;
        } else {
          warnings.push('Prefers local candidates (' + (jobLocation || 'location unspecified') + ')');
          score -= 10;
        }
      }
    }

    if (isRemote && userLocation) {
      matches.push('Remote position — location compatible');
    }

    // ── Skills Matching ───────────────────────────────────────────
    const userSkills = (profile.skills || []).map((s) => s.toLowerCase().trim());
    const extractedSkills = extractJobSkills(text);

    const matchedSkills = [];
    const notMatchedSkills = [];

    for (const jobSkill of extractedSkills) {
      const normalized = jobSkill.toLowerCase();
      const found = userSkills.some((us) => skillMatch(us, normalized));

      if (found) {
        matchedSkills.push(jobSkill);
      } else {
        notMatchedSkills.push(jobSkill);
      }
    }

    for (const skill of matchedSkills) {
      const inRequired = isInRequiredContext(text, skill);
      if (inRequired) {
        matches.push(skill + ' required — you have it');
      } else {
        matches.push(skill + ' mentioned — you have it');
      }
    }

    for (const skill of notMatchedSkills) {
      const inRequired = isInRequiredContext(text, skill);
      missingSkills.push(skill);

      if (inRequired) {
        warnings.push('Requires ' + skill + ' — not in your profile');
        score -= 6;
      } else {
        warnings.push('Prefers ' + skill + ' experience');
        score -= 3;
      }
    }

    if (extractedSkills.length > 0) {
      const ratio = matchedSkills.length / extractedSkills.length;
      if (ratio >= 0.8) {
        score += 5;
      }
    }

    // ── Export Control / ITAR / EAR ───────────────────────────────
    if (/\bitar\b/i.test(text) || /\bear\s+(?:regulat|restrict)/i.test(text) ||
        /\bexport[\s-]?control/i.test(text)) {
      const citizenship = (profile.citizenship || '').toLowerCase();
      if (citizenship === 'us_citizen' || citizenship === 'green_card') {
        matches.push('ITAR/Export control — you qualify as ' + profile.citizenship);
      } else {
        disqualifiers.push('ITAR/Export control — requires US Person status');
        score -= 30;
      }
    }

    // ── Travel Requirements ───────────────────────────────────────
    const travelMatch = text.match(
      /(\d{1,3})\s*%?\s*(?:domestic|international)?\s*travel\s+(?:required|expected|necessary)/i
    );
    if (travelMatch) {
      const pct = parseInt(travelMatch[1], 10);
      if (pct >= 50) {
        warnings.push('Requires ' + pct + '% travel');
        score -= 8;
      } else if (pct >= 25) {
        warnings.push('Requires ' + pct + '% travel');
        score -= 4;
      }
    }

    // ── Drug Test / Background Check ──────────────────────────────
    if (/\bdrug\s+(?:test|screen)/i.test(text)) {
      warnings.push('Drug test required');
    }

    if (/\bbackground\s+(?:check|investigation|screening)\b/i.test(text)) {
      warnings.push('Background check required');
    }

    // ── Final Score & Status ──────────────────────────────────────
    score = Math.max(0, Math.min(100, score));

    let status;
    if (disqualifiers.length > 0) {
      status = 'red';
    } else if (score >= 70) {
      status = 'green';
    } else if (score >= 45) {
      status = 'yellow';
    } else {
      status = 'red';
    }

    const recommendation = buildRecommendation(score, status, disqualifiers, warnings, matchedSkills, extractedSkills);

    return {
      score,
      status,
      disqualifiers,
      warnings,
      matches,
      missingSkills,
      recommendation,
    };
  }

  // ── Helper Functions for Disqualifier Engine ──────────────────

  function isInPreferredContext(text, re) {
    const match = text.match(re);
    if (!match) return false;

    const start = Math.max(0, match.index - 200);
    const before = text.slice(start, match.index).toLowerCase();

    const preferredSignals = [
      'preferred', 'nice to have', 'bonus', 'ideally', 'a plus',
      'desired', 'not required', 'optional', 'advantageous',
    ];

    return preferredSignals.some((sig) => before.includes(sig));
  }

  function isInRequiredContext(text, skill) {
    const lower = text.toLowerCase();
    const skillLower = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const skillRe = new RegExp('\\b' + skillLower + '\\b', 'i');
    const match = lower.match(skillRe);
    if (!match) return false;

    const start = Math.max(0, match.index - 300);
    const before = lower.slice(start, match.index);

    const requiredHeaders = [
      'required', 'must have', 'must-have', 'minimum qualifications',
      'basic qualifications', 'requirements', 'what you need',
      'what you\'ll need', 'essential',
    ];
    const preferredHeaders = [
      'preferred', 'nice to have', 'nice-to-have', 'bonus',
      'desired', 'additional', 'a plus',
    ];

    let lastRequired = -1;
    let lastPreferred = -1;

    for (const h of requiredHeaders) {
      const idx = before.lastIndexOf(h);
      if (idx > lastRequired) lastRequired = idx;
    }
    for (const h of preferredHeaders) {
      const idx = before.lastIndexOf(h);
      if (idx > lastPreferred) lastPreferred = idx;
    }

    if (lastRequired === -1 && lastPreferred === -1) return true;

    return lastRequired >= lastPreferred;
  }

  function extractJobSkills(text) {
    const skillPatterns = [
      'JavaScript', 'TypeScript', 'Python', 'Java(?!Script)', 'C\\+\\+', 'C#',
      'Go(?:lang)?', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
      'Scala', 'Perl', 'R\\b', 'MATLAB', 'Lua', 'Elixir', 'Erlang',
      'Objective-C', 'Dart', 'Haskell', 'Clojure',
      'React(?:\\.js|js)?', 'Angular', 'Vue(?:\\.js|js)?', 'Svelte',
      'Next\\.?js', 'Nuxt', 'jQuery', 'Redux', 'Webpack', 'Vite',
      'HTML5?', 'CSS3?', 'SASS', 'SCSS', 'LESS', 'Tailwind(?:\\s*CSS)?',
      'Bootstrap', 'Material\\s*UI',
      'Node\\.?js', 'Express(?:\\.js)?', 'Django', 'Flask', 'FastAPI',
      'Spring(?:\\s*Boot)?', 'Rails', 'Laravel', 'ASP\\.NET', 'NestJS',
      '.NET(?:\\s+Core)?', 'Gin', 'Fiber', 'Phoenix',
      'SQL', 'NoSQL', 'PostgreSQL', 'Postgres', 'MySQL', 'MariaDB',
      'MongoDB', 'Redis', 'DynamoDB', 'Cassandra', 'Elasticsearch',
      'SQLite', 'Oracle\\s*DB', 'Snowflake', 'Redshift', 'BigQuery',
      'CockroachDB', 'Neo4j',
      'AWS', 'Amazon\\s+Web\\s+Services', 'Azure', 'GCP',
      'Google\\s+Cloud(?:\\s+Platform)?',
      'Docker', 'Kubernetes', 'K8s', 'Terraform', 'Ansible',
      'Puppet', 'Chef', 'Vagrant', 'Packer',
      'CloudFormation', 'Pulumi', 'ArgoCD', 'Helm',
      'CI/CD', 'Jenkins', 'GitHub\\s+Actions', 'GitLab(?:\\s+CI)?',
      'CircleCI', 'Travis\\s*CI', 'Bamboo', 'TeamCity',
      'Git\\b', 'SVN', 'Mercurial',
      'Machine\\s+Learning', 'Deep\\s+Learning', 'NLP',
      'Computer\\s+Vision', 'TensorFlow', 'PyTorch', 'Keras',
      'Scikit-learn', 'Pandas', 'NumPy', 'Spark', 'Hadoop',
      'Kafka', 'Airflow', 'dbt', 'ETL', 'Data\\s+Pipeline',
      'Databricks', 'MLflow', 'Kubeflow', 'SageMaker',
      'Datadog', 'Splunk', 'Grafana', 'Prometheus', 'New\\s+Relic',
      'PagerDuty', 'ELK\\s+Stack', 'Kibana', 'Logstash',
      'REST(?:ful)?', 'GraphQL', 'gRPC', 'WebSocket', 'SOAP',
      'OAuth', 'JWT', 'OpenAPI', 'Swagger',
      'Jest', 'Mocha', 'Cypress', 'Selenium', 'Playwright',
      'JUnit', 'pytest', 'RSpec', 'TestNG',
      'Figma', 'Sketch', 'Adobe\\s+XD', 'InVision',
      'Agile', 'Scrum', 'Kanban', 'SAFe', 'Lean',
      'DevOps', 'SRE', 'TDD', 'BDD',
      'RabbitMQ', 'SQS', 'SNS', 'ActiveMQ', 'ZeroMQ',
      'TCP/IP', 'DNS', 'HTTP', 'TLS', 'SSL',
      'OAuth2', 'SAML', 'LDAP', 'Active\\s+Directory',
      'Okta', 'Auth0',
      'React\\s+Native', 'Flutter', 'Xamarin', 'SwiftUI',
      'Jetpack\\s+Compose', 'Android', 'iOS',
      'Linux', 'Unix', 'Windows\\s+Server', 'macOS',
      'Bash', 'Shell\\s+Scripting', 'PowerShell',
      'Jira', 'Confluence', 'Notion', 'Trello',
      'Tableau', 'Power\\s+BI', 'Looker', 'Excel',
      'Salesforce', 'ServiceNow', 'SAP',
    ];

    const found = new Map();

    for (const pattern of skillPatterns) {
      const re = new RegExp('\\b(' + pattern + ')\\b', 'i');
      const m = text.match(re);
      if (m) {
        const original = m[1];
        const key = original.toLowerCase().replace(/[\s.]+/g, '');
        if (!found.has(key)) {
          found.set(key, original);
        }
      }
    }

    return Array.from(found.values());
  }

  function skillMatch(userSkill, jobSkill) {
    const u = userSkill.toLowerCase().replace(/[\s.\-\/]+/g, '');
    const j = jobSkill.toLowerCase().replace(/[\s.\-\/]+/g, '');

    if (u === j) return true;

    const aliases = {
      'javascript':  ['js', 'ecmascript'],
      'typescript':  ['ts'],
      'python':      ['py', 'python3'],
      'golang':      ['go'],
      'go':          ['golang'],
      'cpp':         ['c++', 'cplusplus'],
      'c++':         ['cpp', 'cplusplus'],
      'csharp':      ['c#', 'dotnet', 'net'],
      'c#':          ['csharp', 'dotnet', 'net'],
      'nodejs':      ['node', 'nodej', 'nodjs'],
      'node':        ['nodejs'],
      'nodej':       ['nodejs', 'node'],
      'react':       ['reactjs', 'reactj'],
      'reactjs':     ['react'],
      'vue':         ['vuejs', 'vuej'],
      'vuejs':       ['vue'],
      'angular':     ['angularjs'],
      'angularjs':   ['angular'],
      'nextjs':      ['next'],
      'next':        ['nextjs'],
      'postgres':    ['postgresql', 'psql'],
      'postgresql':  ['postgres', 'psql'],
      'k8s':         ['kubernetes'],
      'kubernetes':  ['k8s'],
      'aws':         ['amazonwebservices'],
      'gcp':         ['googlecloud', 'googlecloudplatform'],
      'googlecloud': ['gcp'],
      'cicd':        ['ci/cd', 'continuousintegration'],
      'ml':          ['machinelearning'],
      'machinelearning': ['ml'],
      'dl':          ['deeplearning'],
      'deeplearning': ['dl'],
      'tensorflow':  ['tf'],
      'tf':          ['tensorflow'],
      'pytorch':     ['torch'],
      'torch':       ['pytorch'],
      'restful':     ['rest', 'restapi'],
      'rest':        ['restful', 'restapi'],
      'graphql':     ['gql'],
      'gql':         ['graphql'],
      'rabbitmq':    ['rmq'],
      'elasticsearch': ['es', 'elastic'],
      'bash':        ['shellscripting', 'shell'],
      'linux':       ['unix'],
      'unix':        ['linux'],
    };

    const userAliases = aliases[u] || [];
    if (userAliases.includes(j)) return true;

    const jobAliases = aliases[j] || [];
    if (jobAliases.includes(u)) return true;

    if (u.length >= 3 && j.includes(u)) return true;
    if (j.length >= 3 && u.includes(j)) return true;

    return false;
  }

  function buildRecommendation(score, status, disqualifiers, warnings, matchedSkills, allSkills) {
    if (status === 'red' && disqualifiers.length > 0) {
      const blockers = disqualifiers.slice(0, 2).join('; ');
      return 'Not recommended — hard disqualifiers found: ' + blockers + '. ' +
             'Applying is unlikely to succeed unless requirements are negotiable.';
    }

    if (status === 'red') {
      return 'Weak match — significant gaps in qualifications. ' +
             'Consider upskilling or targeting roles closer to your profile.';
    }

    if (status === 'yellow') {
      const warnCount = warnings.length;
      if (matchedSkills.length > 0 && allSkills.length > 0) {
        const pct = Math.round((matchedSkills.length / allSkills.length) * 100);
        return 'Moderate match (' + pct + '% skill overlap) with ' + warnCount + ' concern' +
               (warnCount !== 1 ? 's' : '') + '. ' +
               'Apply with a tailored resume that addresses gaps directly.';
      }
      return 'Partial match with some concerns. ' +
             'Apply with a cover letter addressing the gaps.';
    }

    if (score >= 90) {
      return 'Excellent match — apply immediately with a targeted resume.';
    }
    if (score >= 80) {
      return 'Strong match — apply with tailored resume highlighting relevant experience.';
    }
    return 'Good match — apply with resume customized to this role\'s requirements.';
  }

  // ════════════════════════════════════════════════════════════════
  //  PLATFORM SCRAPERS
  // ════════════════════════════════════════════════════════════════

  // ── LinkedIn ──────────────────────────────────────────────────
  function scrapeLinkedIn() {
    const result = emptyResult('linkedin');

    expandLinkedInDescription();

    result.title = clean(getText(
      '.job-details-jobs-unified-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__job-title',
      '.top-card-layout__title',
      '.jobs-unified-top-card__job-title',
      'h1.t-24',
      'h1',
    ));

    result.company = clean(getText(
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.topcard__org-name-link',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
    ));

    result.location = clean(getText(
      '.job-details-jobs-unified-top-card__bullet',
      '.topcard__flavor--bullet',
      '.jobs-unified-top-card__bullet',
      '.job-details-jobs-unified-top-card__workplace-type',
    ));

    result.salary = clean(getText(
      '.job-details-jobs-unified-top-card__job-insight--highlight span',
      '.salary-main-rail__current-range',
      '.compensation__salary',
    ));

    const descEl = getEl(
      '.jobs-description__content',
      '.jobs-description-content__text',
      '.jobs-box__html-content',
      '.description__text',
      '#job-details',
    );
    result.description = descEl ? descEl.innerText.trim() : null;

    const applyEl = getEl(
      '.jobs-apply-button',
      '.jobs-s-apply button',
      '.jobs-apply-button--top-card',
      'button.jobs-apply-button',
      '.top-card-layout__cta-container button',
    );
    result.applyButtonSelector = getSelector(applyEl);

    const analysis = analyzeDescription(result.description, result.location);
    Object.assign(result, analysis);

    if (!result.salary) result.salary = analysis.salary;

    return result;
  }

  function expandLinkedInDescription() {
    let clickedCount = 0;

    const buttonSelectors = [
      'button[aria-label*="Show more"]',
      'button[aria-label*="show more"]',
      'button.jobs-description__footer-button',
      'button.inline-show-more-text__button',
      'button[aria-expanded="false"]',
      'button.show-more-less-html__button',
      'button.show-more-less-html__button--more',
      'button[data-tracking-control-name*="show_more"]',
      '.show-more-less-html__button--more',
      '.jobs-description .show-more-less-html__button',
      '.jobs-box__html-content button',
    ];

    buttonSelectors.forEach((selector) => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach((button) => {
        const text = button.textContent.toLowerCase().trim();
        const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
        const isShowMore = text.includes('more') ||
                          text.includes('see all') ||
                          ariaLabel.includes('show more') ||
                          button.classList.contains('show-more-less-html__button--more');

        // Skip if it's just "..." menu button
        if (text === '...' || text === '…') {
          if (DEBUG) log('Skipping menu button:', text);
          return;
        }

        // Skip buttons in the top navigation area
        const rect = button.getBoundingClientRect();
        if (rect.top < 150) {
          if (DEBUG) log('Skipping button in header/nav area:', text);
          return;
        }

        if (isShowMore) {
          try {
            button.click();
            clickedCount++;
            log('Clicked show more button:', selector);
          } catch (e) {
            if (DEBUG) error('Failed to click button:', e);
          }
        }
      });
    });

    const linkSelectors = [
      'a.show-more-less-html__button--more',
      '.inline-show-more-text__link-container a',
      'a[aria-label*="Show more"]',
    ];

    linkSelectors.forEach((selector) => {
      const links = document.querySelectorAll(selector);
      links.forEach((link) => {
        const text = link.textContent.toLowerCase();
        if (text.includes('more') || text.includes('see all')) {
          const href = link.getAttribute('href') || '';
          if (href.includes('/company/') || href.includes('/in/') || href.includes('/school/')) {
            if (DEBUG) log('Skipping navigation link:', href);
            return;
          }

          try {
            link.click();
            clickedCount++;
            log('Clicked show more link:', selector);
          } catch (e) {
            if (DEBUG) error('Failed to click link:', e);
          }
        }
      });
    });

    const jobDescriptionContainers = document.querySelectorAll(
      '.jobs-description',
      '.jobs-details',
      '.job-view-layout',
      '[class*="job-description"]',
      '[class*="jobs-description"]',
      'main',
      '[role="main"]'
    );

    const containersToSearch = jobDescriptionContainers.length > 0
      ? jobDescriptionContainers
      : [document.querySelector('.jobs-details__main-content'), document.querySelector('main')].filter(Boolean);

    containersToSearch.forEach((container) => {
      if (!container) return;

      const buttons = container.querySelectorAll('button');
      buttons.forEach((element) => {
        const text = element.textContent.trim().toLowerCase();

        if ((text === '...more' || text === '… more' || text === 'see more' ||
             text.endsWith('...more') || text.endsWith('… more')) &&
            text !== '...' &&
            text !== '…' &&
            element.offsetParent !== null) {

          const onclickStr = element.getAttribute('onclick') || '';
          if (onclickStr.includes('window.location') || onclickStr.includes('navigate')) {
            if (DEBUG) log('Skipping navigation button:', text);
            return;
          }

          const rect = element.getBoundingClientRect();
          if (rect.top < 100) {
            if (DEBUG) log('Skipping button in header area:', text);
            return;
          }

          try {
            element.click();
            clickedCount++;
            log('Clicked ellipsis more element:', text);
          } catch (e) {
            if (DEBUG) error('Failed to click ellipsis element:', e);
          }
        }
      });
    });

    log(`Expanded ${clickedCount} "show more" elements`);
    return clickedCount > 0;
  }

  // ── Indeed ────────────────────────────────────────────────────
  function scrapeIndeed() {
    const result = emptyResult('indeed');

    result.title = clean(getText(
      'h1.jobsearch-JobInfoHeader-title',
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      'h1.icl-u-xs-mb--xs',
      '.jobsearch-JobInfoHeader-title-container h1',
    ));

    result.company = clean(getText(
      '[data-testid="inlineHeader-companyName"] a',
      '[data-testid="inlineHeader-companyName"]',
      '.jobsearch-InlineCompanyRating-companyHeader a',
      '.jobsearch-InlineCompanyRating-companyHeader',
      '.icl-u-lg-mr--sm a',
    ));

    result.location = clean(getText(
      '[data-testid="inlineHeader-companyLocation"]',
      '[data-testid="job-location"]',
      '.jobsearch-JobInfoHeader-subtitle > div:last-child',
      '.icl-u-xs-mt--xs .icl-u-textColor--secondary',
    ));

    result.salary = clean(getText(
      '#salaryInfoAndJobType',
      '.jobsearch-JobMetadataHeader-item',
      '[data-testid="attribute_snippet_testid"]',
    ));

    const descEl = getEl(
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '.jobsearch-JobComponent-description',
    );
    result.description = descEl ? descEl.innerText.trim() : null;

    const applyEl = getEl(
      '#indeedApplyButton',
      '.jobsearch-IndeedApplyButton-newDesign',
      'button[id*="indeedApply"]',
      '.jobsearch-ViewJobButtons-container a',
      '.jobsearch-ViewJobButtons-container button',
    );
    result.applyButtonSelector = getSelector(applyEl);

    const analysis = analyzeDescription(result.description, result.location);
    if (!result.salary) result.salary = analysis.salary;
    Object.assign(result, { ...analysis, salary: result.salary });

    return result;
  }

  // ── Greenhouse ────────────────────────────────────────────────
  function scrapeGreenhouse() {
    const result = emptyResult('greenhouse');

    result.title = clean(getText(
      '.app-title',
      'h1.app-title',
      '.heading h1',
      'h1',
    ));

    result.company = clean(getText(
      '.company-name',
      '.brand-header .logo-text',
    ));
    if (!result.company) {
      const titleTag = document.title || '';
      const atMatch = titleTag.match(/at\s+(.+?)(?:\s*[-–|]|$)/i);
      if (atMatch) result.company = clean(atMatch[1]);
    }

    result.location = clean(getText(
      '.location',
      '.body--metadata .location',
    ));

    const descEl = getEl(
      '#content',
      '.content',
      '#app_body',
    );
    result.description = descEl ? descEl.innerText.trim() : null;

    const applyEl = getEl(
      '#apply_button',
      'a#apply_button',
      '.apply-button a',
      'a[href*="#app"]',
    );
    result.applyButtonSelector = getSelector(applyEl);

    const analysis = analyzeDescription(result.description, result.location);
    Object.assign(result, analysis);

    return result;
  }

  // ── Lever ─────────────────────────────────────────────────────
  function scrapelever() {
    const result = emptyResult('lever');

    result.title = clean(getText(
      '.posting-headline h2',
      '.section-header h2',
      'h2',
    ));

    result.company = clean(getText(
      '.main-header-logo a',
      '.posting-categories .sort-by-team',
      '.company-name',
    ));
    if (!result.company) {
      const slug = window.location.pathname.split('/').filter(Boolean)[0];
      if (slug) result.company = slug.replace(/-/g, ' ');
    }

    result.location = clean(getText(
      '.posting-categories .sort-by-location',
      '.location',
    ));

    const commitment = clean(getText('.posting-categories .sort-by-commitment'));

    const contentParts = document.querySelectorAll('.section-wrapper .content-wrapper');
    if (contentParts.length > 0) {
      result.description = Array.from(contentParts)
        .map((el) => el.innerText.trim())
        .join('\n\n');
    } else {
      const descEl = getEl('.content', '.posting-page');
      result.description = descEl ? descEl.innerText.trim() : null;
    }

    if (commitment && result.description) {
      result.description = 'Commitment: ' + commitment + '\n\n' + result.description;
    }

    const applyEl = getEl(
      '.postings-btn-wrapper a',
      'a.postings-btn',
      'a[href*="apply"]',
      '.posting-btn-submit',
    );
    result.applyButtonSelector = getSelector(applyEl);

    const analysis = analyzeDescription(result.description, result.location);
    Object.assign(result, analysis);

    return result;
  }

  // ── Workday ───────────────────────────────────────────────────
  function scrapeWorkday() {
    const result = emptyResult('workday');

    result.title = clean(getText(
      '[data-automation-id="jobPostingHeader"] h2',
      'h2[data-automation-id="jobPostingHeader"]',
      '.css-jk1xfx h2',
      'h2',
    ));

    result.company = clean(getText(
      '[data-automation-id="jobPostingCompanyName"]',
      '.css-1xerz2o',
    ));
    if (!result.company) {
      const hostMatch = window.location.hostname.match(/^(.+?)\.myworkdayjobs\.com/);
      if (hostMatch) result.company = hostMatch[1].replace(/-/g, ' ');
    }

    result.location = clean(getText(
      '[data-automation-id="locations"]',
      '[data-automation-id="jobPostingLocation"]',
      '.css-129m7dg',
    ));

    result.salary = clean(getText(
      '[data-automation-id="salary"]',
      '[data-automation-id="compensation"]',
    ));

    const descEl = getEl(
      '[data-automation-id="jobPostingDescription"]',
      '.css-pob9fj',
      '#mainContent',
    );
    result.description = descEl ? descEl.innerText.trim() : null;

    const applyEl = getEl(
      'a[data-automation-id="jobPostingApplyButton"]',
      'button[data-automation-id="jobPostingApplyButton"]',
      'a[href*="apply"]',
    );
    result.applyButtonSelector = getSelector(applyEl);

    const analysis = analyzeDescription(result.description, result.location);
    if (!result.salary) result.salary = analysis.salary;
    Object.assign(result, { ...analysis, salary: result.salary });

    return result;
  }

  // ── Generic Scraper ───────────────────────────────────────────
  function scrapeGeneric() {
    const result = emptyResult('generic');

    result.title = clean(getText(
      'h1',
      '[role="heading"][aria-level="1"]',
      '.job-title',
      '[class*="title"]',
      '[class*="Title"]',
      '[class*="heading"]',
      '[class*="Heading"]',
      'h2',
      'h3'
    ));

    result.company = clean(getText(
      '[class*="company"]',
      '[class*="Company"]',
      '[class*="employer"]',
      '[class*="Employer"]',
      '[data-test*="company"]',
      '[aria-label*="company"]',
      'a[href*="/company/"]',
      '.company-name',
      '#company'
    ));

    if (!result.company) {
      const pageTitle = document.title;
      const metaOg = document.querySelector('meta[property="og:site_name"]');
      if (metaOg) {
        result.company = metaOg.getAttribute('content');
      } else if (pageTitle.includes(' at ')) {
        const parts = pageTitle.split(' at ');
        if (parts.length > 1) result.company = parts[1].split('|')[0].trim();
      }
    }

    result.location = clean(getText(
      '[class*="location"]',
      '[class*="Location"]',
      '[data-test*="location"]',
      '[aria-label*="location"]',
      '.job-location',
      '#location'
    ));

    result.salary = clean(getText(
      '[class*="salary"]',
      '[class*="Salary"]',
      '[class*="compensation"]',
      '[class*="Compensation"]',
      '[data-test*="salary"]',
      '#salary'
    ));

    const descEl = getEl(
      '[class*="description"]',
      '[class*="Description"]',
      '[class*="job-details"]',
      '[class*="job-content"]',
      '[id*="description"]',
      '[id*="job-details"]',
      'main',
      '[role="main"]',
      '.content',
      '#content'
    );

    if (descEl) {
      result.description = descEl.innerText.trim();
    } else {
      const bodyText = document.body.innerText;
      result.description = bodyText.substring(0, 10000);
    }

    const applyEl = getEl(
      'a[href*="apply"]',
      'button[class*="apply"]',
      'button[class*="Apply"]',
      '[data-test*="apply"]',
      '#apply-button',
      '.apply-button',
      'a.btn[href*="application"]'
    );
    result.applyButtonSelector = getSelector(applyEl);

    const analysis = analyzeDescription(result.description, result.location);
    if (!result.salary) result.salary = analysis.salary;
    Object.assign(result, { ...analysis, salary: result.salary });

    return result;
  }

  // ════════════════════════════════════════════════════════════════
  //  PLATFORM DETECTION & DISPATCH
  // ════════════════════════════════════════════════════════════════

  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes('linkedin.com'))       return 'linkedin';
    if (host.includes('indeed.com'))         return 'indeed';
    if (host.includes('greenhouse.io'))      return 'greenhouse';
    if (host.includes('lever.co'))           return 'lever';
    if (host.includes('myworkdayjobs.com'))  return 'workday';
    return 'generic';
  }

  const scrapers = {
    linkedin:   scrapeLinkedIn,
    indeed:     scrapeIndeed,
    greenhouse: scrapeGreenhouse,
    lever:      scrapelever,
    workday:    scrapeWorkday,
    generic:    scrapeGeneric,
  };

  function scrapeJob() {
    const platform = detectPlatform();

    try {
      return scrapers[platform]();
    } catch (err) {
      console.error('[ApplyFast] Scrape error:', err);
      const result = emptyResult(platform);
      result._error = err.message;
      return result;
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  SCRAPE WITH RETRY
  // ════════════════════════════════════════════════════════════════

  function scrapeWithRetry(maxAttempts, delayMs) {
    return new Promise(async (resolve) => {
      const hasValidJob = await hasValidJobDescription(3000);

      if (!hasValidJob) {
        log('No valid job description found on page - aborting scrape');
        resolve({
          success: false,
          error: 'No Job Description',
          message: 'This page does not contain a valid job description'
        });
        return;
      }

      let attempt = 0;
      let expandAttempts = 0;
      const MAX_EXPAND_ATTEMPTS = 5;

      function tryOnce() {
        attempt++;

        if (attempt === 1) {
          const platform = detectPlatform();
          if (platform === 'linkedin') {
            log('Starting aggressive expansion of all "show more" elements...');

            const expandInterval = setInterval(() => {
              expandAttempts++;
              const expanded = expandLinkedInDescription();

              log(`Expansion attempt ${expandAttempts}/${MAX_EXPAND_ATTEMPTS}, found: ${expanded}`);

              if (expandAttempts >= MAX_EXPAND_ATTEMPTS) {
                clearInterval(expandInterval);
                setTimeout(() => {
                  log('Expansion complete, starting scrape...');
                  const data = scrapeJob();
                  handleResult(data);
                }, 800);
              }
            }, 300);
            return;
          }
        }

        const data = scrapeJob();
        handleResult(data);
      }

      function handleResult(data) {
        const hasTitle = data && data.title;
        const hasDescription = data && data.description && data.description.length > 100;

        if (hasTitle && hasDescription) {
          log('Scrape successful:', {
            titleLength: data.title.length,
            descriptionLength: data.description.length,
            attempt: attempt
          });
          resolve({ success: true, data });
        } else if (hasTitle && !hasDescription && attempt <= 2) {
          const platform = detectPlatform();
          if (platform === 'linkedin') {
            log('Description too short, trying to expand again...');
            expandLinkedInDescription();
          }

          setTimeout(() => {
            if (attempt < maxAttempts) {
              tryOnce();
            } else {
              resolve({ success: false, error: 'Max attempts reached', data });
            }
          }, delayMs);
          return;
        }

        log('Failed to scrape after attempts:', attempt);
        resolve({ success: false, error: 'Could not extract job data after ' + maxAttempts + ' attempts', data });
      }

      tryOnce();
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  UI CREATION & DISPLAY
  // ════════════════════════════════════════════════════════════════

  function showUI() {
    let panel = document.getElementById('applyfast-panel');
    if (panel) {
      panel.style.display = 'block';
    } else {
      createUI();
    }
  }

  function hideUI() {
    const panel = document.getElementById('applyfast-panel');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  function removeUI() {
    const panel = document.getElementById('applyfast-panel');
    if (panel) {
      panel.remove();
    }
  }

  function createUI() {
    if (document.getElementById('applyfast-panel')) return;

    const platform = detectPlatform();
    if (!platform) return;

    const panel = document.createElement('div');
    panel.id = 'applyfast-panel';
    panel.className = 'applyfast-panel';
    panel.innerHTML = `
      <div class="applyfast-header">
        <div class="applyfast-logo">
          <span class="applyfast-icon">⚡</span>
          <span class="applyfast-title">Apply<span class="applyfast-fast">Fast</span></span>
        </div>
        <button class="applyfast-close" id="applyfast-close">×</button>
      </div>
      <div class="applyfast-body">
        <div class="applyfast-status" id="applyfast-status">
          <div class="applyfast-spinner"></div>
          <span>Analyzing job...</span>
        </div>
        <div class="applyfast-content" id="applyfast-content" style="display: none;">
          <div class="applyfast-title-warning" id="applyfast-title-warning" style="display: none;">
            <div class="applyfast-warning-icon">⚠️</div>
            <div class="applyfast-warning-text">Job Mismatch</div>
            <button class="applyfast-ignore-btn" id="applyfast-ignore-warning">Ignore</button>
          </div>
          <div class="applyfast-score-ring">
            <svg viewBox="0 0 36 36" class="applyfast-circular-chart">
              <path class="applyfast-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="applyfast-circle" id="applyfast-score-circle" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <text x="18" y="20.35" class="applyfast-percentage" id="applyfast-score-text">--</text>
            </svg>
          </div>
          <div class="applyfast-match-label" id="applyfast-match-label">Calculating...</div>
          <div class="applyfast-skills" id="applyfast-skills"></div>
          <button class="applyfast-btn" id="applyfast-apply-btn">
            🚀 Quick Apply
          </button>
          <a href="#" class="applyfast-link" id="applyfast-settings">⚙️ Open Settings</a>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    injectPanelStyles();
    setupUIEventListeners();
  }

  function injectPanelStyles() {
    if (document.getElementById('applyfast-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'applyfast-panel-styles';
    style.textContent = `
      .applyfast-panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 320px;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border: 1px solid #334155;
        overflow: hidden;
        animation: applyfast-slideIn 0.3s ease-out;
      }

      @keyframes applyfast-slideIn {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .applyfast-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: rgba(255, 255, 255, 0.05);
        border-bottom: 1px solid #334155;
      }

      .applyfast-logo {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .applyfast-icon {
        font-size: 20px;
      }

      .applyfast-title {
        font-size: 16px;
        font-weight: 700;
        color: #38bdf8;
      }

      .applyfast-fast {
        color: #f472b6;
      }

      .applyfast-close {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }

      .applyfast-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
      }

      .applyfast-body {
        padding: 20px;
      }

      .applyfast-status {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        color: #94a3b8;
        font-size: 14px;
        padding: 20px 0;
      }

      .applyfast-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #334155;
        border-top-color: #38bdf8;
        border-radius: 50%;
        animation: applyfast-spin 0.8s linear infinite;
      }

      @keyframes applyfast-spin {
        to { transform: rotate(360deg); }
      }

      .applyfast-content {
        text-align: center;
      }

      .applyfast-score-ring {
        display: inline-block;
        margin-bottom: 16px;
      }

      .applyfast-circular-chart {
        display: block;
        max-width: 120px;
        max-height: 120px;
      }

      .applyfast-circle-bg {
        fill: none;
        stroke: #334155;
        stroke-width: 2.8;
      }

      .applyfast-circle {
        fill: none;
        stroke-width: 2.8;
        stroke-linecap: round;
        stroke: #22c55e;
        transition: stroke-dasharray 0.6s ease;
      }

      .applyfast-percentage {
        fill: #e2e8f0;
        font-size: 8px;
        font-weight: 700;
        text-anchor: middle;
      }

      .applyfast-match-label {
        font-size: 16px;
        font-weight: 600;
        color: #e2e8f0;
        margin-bottom: 16px;
      }

      .applyfast-match-label.high { color: #22c55e; }
      .applyfast-match-label.medium { color: #eab308; }
      .applyfast-match-label.low { color: #ef4444; }

      .applyfast-title-warning {
        background: rgba(234, 179, 8, 0.1);
        border: 1px solid rgba(234, 179, 8, 0.3);
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .applyfast-warning-icon {
        font-size: 18px;
        line-height: 1;
      }

      .applyfast-warning-text {
        flex: 1;
        font-size: 13px;
        font-weight: 600;
        color: #eab308;
      }

      .applyfast-ignore-btn {
        background: rgba(234, 179, 8, 0.2);
        border: 1px solid rgba(234, 179, 8, 0.4);
        border-radius: 6px;
        padding: 4px 12px;
        font-size: 11px;
        font-weight: 600;
        color: #eab308;
        cursor: pointer;
        transition: all 0.2s;
      }

      .applyfast-ignore-btn:hover {
        background: rgba(234, 179, 8, 0.3);
        border-color: rgba(234, 179, 8, 0.6);
      }

      .applyfast-skills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: center;
        margin-bottom: 20px;
        min-height: 30px;
      }

      .applyfast-skill-tag {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
      }

      .applyfast-skill-tag.matched {
        background: rgba(34, 197, 94, 0.15);
        color: #4ade80;
        border: 1px solid rgba(34, 197, 94, 0.3);
      }

      .applyfast-skill-tag.missing {
        background: rgba(239, 68, 68, 0.1);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.2);
      }

      .applyfast-btn {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        background: linear-gradient(135deg, #2563eb, #7c3aed);
        color: #fff;
        transition: all 0.2s;
        margin-bottom: 12px;
      }

      .applyfast-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
      }

      .applyfast-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      .applyfast-link {
        display: inline-block;
        color: #64748b;
        font-size: 12px;
        text-decoration: none;
        transition: color 0.2s;
      }

      .applyfast-link:hover {
        color: #94a3b8;
      }
    `;

    document.head.appendChild(style);
  }

  function setupUIEventListeners() {
    const closeBtn = document.getElementById('applyfast-close');
    const applyBtn = document.getElementById('applyfast-apply-btn');
    const settingsLink = document.getElementById('applyfast-settings');
    const ignoreWarningBtn = document.getElementById('applyfast-ignore-warning');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const panel = document.getElementById('applyfast-panel');
        if (panel) panel.remove();
      });
    }

    if (ignoreWarningBtn) {
      ignoreWarningBtn.addEventListener('click', () => {
        const warningDiv = document.getElementById('applyfast-title-warning');
        if (warningDiv) {
          warningDiv.style.display = 'none';
        }
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const linkedInApplyButton = getEl(
          '.jobs-apply-button',
          '.jobs-s-apply button',
          '.jobs-apply-button--top-card',
          'button.jobs-apply-button',
          '.top-card-layout__cta-container button',
        );

        const indeedApplyButton = getEl(
          '#indeedApplyButton',
          '.jobsearch-IndeedApplyButton-newDesign',
          'button[id*="indeedApply"]',
        );

        if (linkedInApplyButton) {
          const isEasyApply = linkedInApplyButton.textContent.toLowerCase().includes('easy apply');

          if (isEasyApply) {
            linkedInApplyButton.click();
          } else {
            const externalLink = getEl(
              'a.jobs-apply-button',
              '.jobs-apply-button__link',
              'a[href*="apply"]',
            );

            if (externalLink && externalLink.href) {
              window.location.href = externalLink.href;
            } else {
              linkedInApplyButton.click();
            }
          }
        } else if (indeedApplyButton) {
          indeedApplyButton.click();
        } else {
          const anyApplyLink = getEl(
            'a[href*="apply"]',
            'a[href*="job"]',
            '.apply-link',
          );

          if (anyApplyLink && anyApplyLink.href) {
            window.location.href = anyApplyLink.href;
          } else {
            alert('Could not find apply button on this page');
          }
        }
      });
    }

    if (settingsLink) {
      settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'openPopup' });
      });
    }
  }

  function analyzeAndDisplayJob() {
    scrapeWithRetry(5, 800).then((result) => {
      if (!result.success || !result.data) {
        if (result.error === 'No Job Description') {
          log('No job description found - hiding UI');
          hideUI();
          return;
        }

        showUI();
        const statusDiv = document.getElementById('applyfast-status');
        const contentDiv = document.getElementById('applyfast-content');

        let errorMsg = '⚠️ Could not analyze this job';
        let errorDetail = '';

        if (result.data && !result.data.title && !result.data.description) {
          errorMsg = '⚠️ Page not loaded yet';
          errorDetail = 'Try refreshing the page';
        } else if (result.data && !result.data.description) {
          errorMsg = '⚠️ Missing job description';
          errorDetail = 'Cannot analyze without full job details';
        } else if (result.data && !result.data.title) {
          errorMsg = '⚠️ Unreadable job post';
          errorDetail = 'Page structure may have changed';
        } else {
          errorMsg = '⚠️ Cannot read this page';
          errorDetail = 'Try clicking directly on a job posting';
        }

        if (statusDiv) {
          statusDiv.innerHTML = `
            <span style="color: #ef4444; font-weight: 600;">${errorMsg}</span>
            ${errorDetail ? `<br><span style="color: #64748b; font-size: 12px;">${errorDetail}</span>` : ''}
          `;
        }
        return;
      }

      const jobData = result.data;

      if (!jobData.title || jobData.title.length < 5) {
        log('No valid job title found - hiding UI (likely a career landing page)');
        hideUI();
        return;
      }

      log('Valid job found with title - showing UI:', jobData.title);
      showUI();

      const statusDiv = document.getElementById('applyfast-status');
      const contentDiv = document.getElementById('applyfast-content');

      try {
        chrome.storage.local.get('userProfile', (data) => {
          if (chrome.runtime.lastError) {
            error('Extension context invalidated - page needs refresh:', chrome.runtime.lastError);
            if (statusDiv) {
              statusDiv.innerHTML = `
                <span style="color: #eab308; font-weight: 600;">⚠️ Extension reloaded</span>
                <br><span style="color: #64748b; font-size: 12px;">Please refresh the page</span>
              `;
            }
            return;
          }

          const profile = data.userProfile || {};

          let matchResult;
          if (typeof detectDisqualifiers === 'function') {
            const fullJobText = (jobData.description || '') + '\n' + (jobData.title || '');
            const userProfileFormatted = {
              yearsExperience: parseInt(profile.experience) || 0,
              citizenship: profile.citizenship || 'unknown',
              needsSponsorship: profile.needsSponsorship || false,
              location: profile.location || '',
              willingToRelocate: profile.willingToRelocate || false,
              skills: profile.skills ? profile.skills.split(',').map(s => s.trim()) : [],
            };

            const disqualifierResult = detectDisqualifiers(fullJobText, userProfileFormatted);
            matchResult = {
              score: disqualifierResult.score,
              status: disqualifierResult.status,
              disqualifiers: disqualifierResult.disqualifiers,
              warnings: disqualifierResult.warnings,
              matched: disqualifierResult.matches,
              missing: disqualifierResult.missingSkills,
            };
          } else {
            matchResult = calculateMatch(jobData, profile);
          }

        if (statusDiv) statusDiv.style.display = 'none';
        if (contentDiv) contentDiv.style.display = 'block';

        // Check for job title mismatch
        const titleWarningDiv = document.getElementById('applyfast-title-warning');
        const userPreferredTitle = profile.preferredJobTitle || profile.jobTitle || '';
        const isTitleMatch = isJobTitleMatch(jobData.title, userPreferredTitle);

        if (titleWarningDiv) {
          if (!isTitleMatch && userPreferredTitle) {
            titleWarningDiv.style.display = 'flex';
          } else {
            titleWarningDiv.style.display = 'none';
          }
        }

        const scoreCircle = document.getElementById('applyfast-score-circle');
        const scoreText = document.getElementById('applyfast-score-text');
        const matchLabel = document.getElementById('applyfast-match-label');

        if (scoreCircle && scoreText) {
          const score = matchResult.score;
          scoreCircle.setAttribute('stroke-dasharray', score + ', 100');
          scoreText.textContent = score + '%';

          let labelText = 'Strong Match';
          let labelClass = 'high';
          let color = '#22c55e';

          if (matchResult.disqualifiers && matchResult.disqualifiers.length > 0) {
            labelText = getShortDisqualifier(matchResult.disqualifiers[0]);
            labelClass = 'low';
            color = '#ef4444';
          } else if (score >= 70) {
            labelText = 'Strong Match';
            labelClass = 'high';
            color = '#22c55e';
          } else if (score >= 40) {
            if (matchResult.warnings && matchResult.warnings.length > 0) {
              labelText = getShortWarning(matchResult.warnings[0]);
            } else if (matchResult.missing && matchResult.missing.length > 0) {
              labelText = 'Missing Skills';
            } else {
              labelText = 'Partial Match';
            }
            labelClass = 'medium';
            color = '#eab308';
          } else {
            if (matchResult.missing && matchResult.missing.length >= 3) {
              labelText = 'Skill Gap';
            } else if (matchResult.warnings && matchResult.warnings.length > 0) {
              labelText = getShortWarning(matchResult.warnings[0]);
            } else {
              labelText = 'Weak Match';
            }
            labelClass = 'low';
            color = '#ef4444';
          }

          scoreCircle.style.stroke = color;
          if (matchLabel) {
            let displayTitle = jobData.title || 'Unknown Position';
            if (displayTitle.length > 20) {
              displayTitle = displayTitle.substring(0, 17) + '...';
            }

            matchLabel.innerHTML = `
              <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px; font-weight: 400;">${displayTitle}</div>
              <div>${labelText}</div>
            `;
            matchLabel.className = 'applyfast-match-label ' + labelClass;
          }
        }

        const skillsDiv = document.getElementById('applyfast-skills');
        if (skillsDiv) {
          skillsDiv.innerHTML = '';

          if (matchResult.disqualifiers && matchResult.disqualifiers.length > 0) {
            matchResult.disqualifiers.slice(0, 2).forEach((disq) => {
              const tag = document.createElement('span');
              tag.className = 'applyfast-skill-tag missing';
              tag.textContent = '✕ ' + shortenText(disq, 30);
              tag.title = disq;
              skillsDiv.appendChild(tag);
            });
          }

          if (matchResult.matched && matchResult.matched.length > 0) {
            matchResult.matched.slice(0, 4).forEach((skill) => {
              const tag = document.createElement('span');
              tag.className = 'applyfast-skill-tag matched';
              tag.textContent = '✓ ' + shortenText(skill, 20);
              skillsDiv.appendChild(tag);
            });
          }

          if (matchResult.missing && matchResult.missing.length > 0) {
            matchResult.missing.slice(0, 3).forEach((skill) => {
              const tag = document.createElement('span');
              tag.className = 'applyfast-skill-tag missing';
              tag.textContent = shortenText(skill, 20);
              skillsDiv.appendChild(tag);
            });
          }
        }
        });
      } catch (err) {
        error('Error accessing extension storage:', err);
        if (statusDiv) {
          statusDiv.innerHTML = `
            <span style="color: #eab308; font-weight: 600;">⚠️ Extension error</span>
            <br><span style="color: #64748b; font-size: 12px;">Please refresh the page</span>
          `;
        }
      }
    });
  }

  function getShortDisqualifier(disqualifier) {
    const text = disqualifier || '';

    if (text.includes('US Citizenship')) return 'US Citizenship';
    if (text.includes('Green Card')) return 'Green Card Req';
    if (text.includes('visa sponsorship')) return 'No Sponsorship';
    if (text.includes('TS/SCI')) return 'TS/SCI Required';
    if (text.includes('Top Secret')) return 'Top Secret Req';
    if (text.includes('Secret Clearance')) return 'Clearance Req';
    if (text.includes('Security clearance')) return 'Clearance Req';
    if (text.includes('ITAR')) return 'ITAR Restricted';
    if (text.includes('Export control')) return 'Export Control';
    if (text.includes('relocation')) return 'Relocation Req';
    if (text.includes('years experience')) return 'Experience Gap';

    const words = text.split(' ').slice(0, 3);
    return words.join(' ');
  }

  function getShortWarning(warning) {
    const text = warning || '';

    if (text.includes('PhD')) return 'PhD Required';
    if (text.includes('Master')) return 'Master\'s Req';
    if (text.includes('travel')) return 'Travel Required';
    if (text.includes('Requires') && text.includes('years')) return 'Experience Gap';
    if (text.includes('Requires')) {
      const match = text.match(/Requires\s+(.+?)\s+—/);
      if (match) return 'Need ' + match[1];
    }

    return text.split(' ').slice(0, 3).join(' ');
  }

  function calculateMatch(jobData, profile) {
    if (!profile || !profile.skills) {
      return { score: 0, matched: [], missing: [] };
    }

    const userSkills = profile.skills
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const jobText = (
      (jobData.title || '') + ' ' + (jobData.description || '')
    ).toLowerCase();

    const matched = [];
    userSkills.forEach((skill) => {
      if (jobText.includes(skill)) {
        matched.push(skill);
      }
    });

    const commonKeywords = [
      'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue',
      'node', 'sql', 'aws', 'docker', 'kubernetes', 'git', 'agile',
    ];

    const missing = [];
    commonKeywords.forEach((kw) => {
      if (jobText.includes(kw) && !userSkills.includes(kw)) {
        missing.push(kw);
      }
    });

    const score = matched.length > 0 ? Math.min(100, matched.length * 15) : 0;

    return { score, matched, missing };
  }

  // ════════════════════════════════════════════════════════════════
  //  NAVIGATION MONITORING
  // ════════════════════════════════════════════════════════════════

  let currentJobUrl = window.location.href;
  let handleJobChangeTimeout = null;
  let isReady = false;

  setTimeout(() => {
    isReady = true;
  }, 1000);

  setInterval(() => {
    if (!isReady) return;
    if (window.location.href !== currentJobUrl) {
      currentJobUrl = window.location.href;
      handleJobChange();
    }
  }, 500);

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    currentJobUrl = window.location.href;
    handleJobChange();
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    currentJobUrl = window.location.href;
    handleJobChange();
  };

  window.addEventListener('popstate', () => {
    currentJobUrl = window.location.href;
    handleJobChange();
  });

  function handleJobChange() {
    if (handleJobChangeTimeout) {
      clearTimeout(handleJobChangeTimeout);
    }

    handleJobChangeTimeout = setTimeout(() => {
      log('Page changed - scraping silently in background...');
      setTimeout(() => {
        analyzeAndDisplayJob();
      }, 800);
    }, 300);
  }

  window.addEventListener('hashchange', () => {
    log('Hash changed:', window.location.hash);
    handleJobChange();
  });

  let lastClickTime = 0;
  document.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastClickTime < 300) return;
    lastClickTime = now;

    setTimeout(() => {
      handleJobChange();
    }, 500);
  }, true);

  // ════════════════════════════════════════════════════════════════
  //  MESSAGE LISTENER (for popup communication)
  // ════════════════════════════════════════════════════════════════

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'scrapeJob') {
      scrapeWithRetry(5, 800).then((result) => {
        if (result.success) {
          sendResponse({ success: true, data: result.data });
        } else {
          sendResponse({ success: false, error: result.error || 'Failed to scrape job' });
        }
      });
      return true;
    }
  });

  // ════════════════════════════════════════════════════════════════
  //  INITIALIZATION
  // ════════════════════════════════════════════════════════════════

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(analyzeAndDisplayJob, 500);
      });
    } else {
      setTimeout(analyzeAndDisplayJob, 500);
    }
  }

  init();

})();
