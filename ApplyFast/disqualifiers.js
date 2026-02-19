// ── ApplyFast Disqualifier Engine ────────────────────────────────
// Analyzes job description text against a user profile and returns
// a structured verdict: score, status, disqualifiers, warnings,
// matches, missing skills, and a human-readable recommendation.
//
// Usage:
//   const result = detectDisqualifiers(jobDescriptionText, userProfile);

/**
 * @param {string} jobText        — raw job description text
 * @param {object} userProfile    — candidate profile
 * @param {number}  userProfile.yearsExperience
 * @param {string}  userProfile.citizenship
 *   "us_citizen" | "green_card" | "work_authorized_not_citizen" | "needs_sponsorship"
 * @param {boolean} userProfile.needsSponsorship
 * @param {string}  userProfile.location
 * @param {boolean} userProfile.willingToRelocate
 * @param {string[]} userProfile.skills
 * @returns {object} verdict
 */
function detectDisqualifiers(jobText, userProfile) {
  const text = (jobText || '').toLowerCase();
  const profile = userProfile || {};

  const disqualifiers = []; // hard blockers — auto-red
  const warnings = [];      // soft flags   — yellow pressure
  const matches = [];       // positive signals
  const missingSkills = [];

  // Running score — starts at 100, deductions bring it down
  let score = 100;

  // ════════════════════════════════════════════════════════════════
  //  1. CITIZENSHIP & WORK AUTHORIZATION
  // ════════════════════════════════════════════════════════════════

  const citizenshipPatterns = [
    // US Citizenship required
    { re: /\b(?:must\s+be|requires?|only)\s+(?:a\s+)?(?:u\.?s\.?\s+citizen|united\s+states\s+citizen)/i, label: 'Requires US Citizenship' },
    { re: /\bu\.?s\.?\s+citizen(?:ship)?\s+(?:is\s+)?required/i, label: 'Requires US Citizenship' },
    { re: /\bcitizens?\s+only\b/i, label: 'Requires US Citizenship' },
    { re: /\bmust\s+(?:hold|have|possess)\s+(?:a\s+)?(?:u\.?s\.?\s+citizen)/i, label: 'Requires US Citizenship' },
    { re: /\bonly\s+u\.?s\.?\s+citizens?\b/i, label: 'Requires US Citizenship' },
    { re: /\busc\b/i, label: 'Requires US Citizenship' },
    { re: /\bu\.?s\.?\s+citizen(?:ship)?\b/i, label: 'Requires US Citizenship' },
    // USC or Green Card Holder — requires US Person status
    { re: /\busc\s+or\s+(?:gc|green\s*card)\s*holder/i, label: 'Requires USC or Green Card Holder' },
    { re: /\bu\.?s\.?\s+citizen(?:ship)?\s+or\s+green\s*card\s*holder/i, label: 'Requires USC or Green Card Holder' },
    { re: /\bgreen\s*card\s*holder\s+or\s+u\.?s\.?\s+citizen/i, label: 'Requires USC or Green Card Holder' },
    { re: /\b(?:must\s+be|requires?)\s+(?:a\s+)?(?:u\.?s\.?\s+citizen|usc)\s+or\s+(?:green\s*card|gc)\s*holder/i, label: 'Requires USC or Green Card Holder' },
    { re: /\bgc\s+holder\b/i, label: 'Requires Green Card Holder' },
    { re: /\bgreen\s*card\s*holder\b/i, label: 'Requires Green Card Holder' },
    { re: /\bmust\s+(?:hold|have|possess)\s+(?:a\s+)?green\s*card/i, label: 'Requires Green Card Holder' },
    { re: /\bgreen\s*card\s+required\b/i, label: 'Requires Green Card Holder' },
    { re: /\bpermanent\s+resident\b/i, label: 'Requires Green Card Holder' },
    // No visa sponsorship
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

  // ════════════════════════════════════════════════════════════════
  //  2. SECURITY CLEARANCE
  // ════════════════════════════════════════════════════════════════

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

  // Detect "preferred" vs "required" context around clearance mentions
  const seenClearanceFlags = new Set();

  for (const { re, label, weight } of clearancePatterns) {
    if (re.test(text) && !seenClearanceFlags.has(label)) {
      seenClearanceFlags.add(label);

      // Check if the clearance mention is in a "preferred" context
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

  // ════════════════════════════════════════════════════════════════
  //  3. YEARS OF EXPERIENCE
  // ════════════════════════════════════════════════════════════════

  const yoePatterns = [
    // "10+ years of experience"
    /(\d+)\+?\s*(?:to|-|–)\s*(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience|professional|relevant)/i,
    /(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience|professional|relevant|related|hands[\s-]on|work|industry)/i,
    /(?:minimum|at\s+least|no\s+less\s+than)\s+(?:of\s+)?(\d+)\+?\s*years?/i,
    /(\d+)\+?\s*years?\s+(?:or\s+more\s+)?(?:of\s+)?(?:experience|exp\.?)\b/i,
  ];

  let requiredYears = null;

  for (const pat of yoePatterns) {
    const m = text.match(pat);
    if (m) {
      // Use the higher end of a range, or the single value
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
      // Within 2 years is a soft mismatch — many companies are flexible
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

  // ════════════════════════════════════════════════════════════════
  //  4. EDUCATION REQUIREMENTS
  // ════════════════════════════════════════════════════════════════

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
      break; // Only flag the highest one
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  5. LOCATION & RELOCATION
  // ════════════════════════════════════════════════════════════════

  const userLocation = (profile.location || '').toLowerCase();

  // Detect on-site / hybrid requirements
  const isRemote = /\bfully\s+remote\b/i.test(text) || /\bremote\s+(?:position|role|work|job)\b/i.test(text);
  const isHybrid = /\bhybrid\b/i.test(text);
  const isOnSite = /\bon[\s-]?site\b/i.test(text) || /\bin[\s-]?office\b/i.test(text) || /\bin[\s-]?person\b/i.test(text);
  const mustRelocate = /\bmust\s+(?:be\s+)?(?:willing\s+to\s+)?relocate\b/i.test(text) ||
                       /\brelocation\s+required\b/i.test(text);

  // Try to extract the job's stated location
  const locationMatch = text.match(
    /\blocation\s*:\s*([^\n.]{3,60})/i
  );
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

  // ════════════════════════════════════════════════════════════════
  //  6. SKILLS MATCHING
  // ════════════════════════════════════════════════════════════════

  const userSkills = (profile.skills || []).map((s) => s.toLowerCase().trim());

  // Build a list of skills the job explicitly asks for
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

  // Determine if each missing skill is "required" or "preferred"
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

  // Bonus for high skill match ratio
  if (extractedSkills.length > 0) {
    const ratio = matchedSkills.length / extractedSkills.length;
    if (ratio >= 0.8) {
      score += 5; // reward strong coverage
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  7. EXPORT CONTROL / ITAR / EAR
  // ════════════════════════════════════════════════════════════════

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

  // ════════════════════════════════════════════════════════════════
  //  8. TRAVEL REQUIREMENTS
  // ════════════════════════════════════════════════════════════════

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

  // ════════════════════════════════════════════════════════════════
  //  9. DRUG TEST / BACKGROUND CHECK FLAGS
  // ════════════════════════════════════════════════════════════════

  if (/\bdrug\s+(?:test|screen)/i.test(text)) {
    warnings.push('Drug test required');
  }

  if (/\bbackground\s+(?:check|investigation|screening)\b/i.test(text)) {
    // Very common — only a warning, no score impact
    warnings.push('Background check required');
  }

  // ════════════════════════════════════════════════════════════════
  //  10. FINAL SCORE & RECOMMENDATION
  // ════════════════════════════════════════════════════════════════

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


// ══════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════

/**
 * Check if a regex match appears near "preferred" / "nice to have"
 * context rather than "required" context.
 */
function isInPreferredContext(text, re) {
  const match = text.match(re);
  if (!match) return false;

  // Grab ~200 chars before the match
  const start = Math.max(0, match.index - 200);
  const before = text.slice(start, match.index).toLowerCase();

  const preferredSignals = [
    'preferred', 'nice to have', 'bonus', 'ideally', 'a plus',
    'desired', 'not required', 'optional', 'advantageous',
  ];

  return preferredSignals.some((sig) => before.includes(sig));
}

/**
 * Check if a skill appears in a "required" section of the text.
 */
function isInRequiredContext(text, skill) {
  const lower = text.toLowerCase();
  const skillLower = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Find where this skill appears
  const skillRe = new RegExp('\\b' + skillLower + '\\b', 'i');
  const match = lower.match(skillRe);
  if (!match) return false;

  // Walk backwards ~300 chars looking for section headers
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

  // Find the last section header before the skill mention
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

  // If neither header found, default to required (benefit of the doubt)
  if (lastRequired === -1 && lastPreferred === -1) return true;

  return lastRequired >= lastPreferred;
}

/**
 * Extract technology and skill keywords from job text.
 * Returns de-duped array with original casing preserved.
 */
function extractJobSkills(text) {
  const skillPatterns = [
    // Languages
    'JavaScript', 'TypeScript', 'Python', 'Java(?!Script)', 'C\\+\\+', 'C#',
    'Go(?:lang)?', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
    'Scala', 'Perl', 'R\\b', 'MATLAB', 'Lua', 'Elixir', 'Erlang',
    'Objective-C', 'Dart', 'Haskell', 'Clojure',
    // Frontend
    'React(?:\\.js|js)?', 'Angular', 'Vue(?:\\.js|js)?', 'Svelte',
    'Next\\.?js', 'Nuxt', 'jQuery', 'Redux', 'Webpack', 'Vite',
    'HTML5?', 'CSS3?', 'SASS', 'SCSS', 'LESS', 'Tailwind(?:\\s*CSS)?',
    'Bootstrap', 'Material\\s*UI',
    // Backend
    'Node\\.?js', 'Express(?:\\.js)?', 'Django', 'Flask', 'FastAPI',
    'Spring(?:\\s*Boot)?', 'Rails', 'Laravel', 'ASP\\.NET', 'NestJS',
    '.NET(?:\\s+Core)?', 'Gin', 'Fiber', 'Phoenix',
    // Databases
    'SQL', 'NoSQL', 'PostgreSQL', 'Postgres', 'MySQL', 'MariaDB',
    'MongoDB', 'Redis', 'DynamoDB', 'Cassandra', 'Elasticsearch',
    'SQLite', 'Oracle\\s*DB', 'Snowflake', 'Redshift', 'BigQuery',
    'CockroachDB', 'Neo4j',
    // Cloud & Infra
    'AWS', 'Amazon\\s+Web\\s+Services', 'Azure', 'GCP',
    'Google\\s+Cloud(?:\\s+Platform)?',
    'Docker', 'Kubernetes', 'K8s', 'Terraform', 'Ansible',
    'Puppet', 'Chef', 'Vagrant', 'Packer',
    'CloudFormation', 'Pulumi', 'ArgoCD', 'Helm',
    // CI/CD & Tools
    'CI/CD', 'Jenkins', 'GitHub\\s+Actions', 'GitLab(?:\\s+CI)?',
    'CircleCI', 'Travis\\s*CI', 'Bamboo', 'TeamCity',
    'Git\\b', 'SVN', 'Mercurial',
    // Data & ML
    'Machine\\s+Learning', 'Deep\\s+Learning', 'NLP',
    'Computer\\s+Vision', 'TensorFlow', 'PyTorch', 'Keras',
    'Scikit-learn', 'Pandas', 'NumPy', 'Spark', 'Hadoop',
    'Kafka', 'Airflow', 'dbt', 'ETL', 'Data\\s+Pipeline',
    'Databricks', 'MLflow', 'Kubeflow', 'SageMaker',
    // Monitoring & Observability
    'Datadog', 'Splunk', 'Grafana', 'Prometheus', 'New\\s+Relic',
    'PagerDuty', 'ELK\\s+Stack', 'Kibana', 'Logstash',
    // APIs & Protocols
    'REST(?:ful)?', 'GraphQL', 'gRPC', 'WebSocket', 'SOAP',
    'OAuth', 'JWT', 'OpenAPI', 'Swagger',
    // Testing
    'Jest', 'Mocha', 'Cypress', 'Selenium', 'Playwright',
    'JUnit', 'pytest', 'RSpec', 'TestNG',
    // Design & Product
    'Figma', 'Sketch', 'Adobe\\s+XD', 'InVision',
    // Methodologies
    'Agile', 'Scrum', 'Kanban', 'SAFe', 'Lean',
    'DevOps', 'SRE', 'TDD', 'BDD',
    // Messaging & Queues
    'RabbitMQ', 'SQS', 'SNS', 'ActiveMQ', 'ZeroMQ',
    // Networking & Security
    'TCP/IP', 'DNS', 'HTTP', 'TLS', 'SSL',
    'OAuth2', 'SAML', 'LDAP', 'Active\\s+Directory',
    'Okta', 'Auth0',
    // Mobile
    'React\\s+Native', 'Flutter', 'Xamarin', 'SwiftUI',
    'Jetpack\\s+Compose', 'Android', 'iOS',
    // OS
    'Linux', 'Unix', 'Windows\\s+Server', 'macOS',
    'Bash', 'Shell\\s+Scripting', 'PowerShell',
    // Business tools
    'Jira', 'Confluence', 'Notion', 'Trello',
    'Tableau', 'Power\\s+BI', 'Looker', 'Excel',
    'Salesforce', 'ServiceNow', 'SAP',
  ];

  const found = new Map(); // normalized → original casing

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

/**
 * Fuzzy skill matching — handles aliases and variations.
 *   skillMatch("nodejs", "node.js") → true
 *   skillMatch("k8s", "kubernetes") → true
 */
function skillMatch(userSkill, jobSkill) {
  const u = userSkill.toLowerCase().replace(/[\s.\-\/]+/g, '');
  const j = jobSkill.toLowerCase().replace(/[\s.\-\/]+/g, '');

  if (u === j) return true;

  // Alias map — user skill → all equivalent job skill forms
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

  // Also check if the job skill has aliases that match the user skill
  const jobAliases = aliases[j] || [];
  if (jobAliases.includes(u)) return true;

  // Substring containment for compound names (e.g., "react" matches "reactnative")
  if (u.length >= 3 && j.includes(u)) return true;
  if (j.length >= 3 && u.includes(j)) return true;

  return false;
}

/**
 * Build a human-readable recommendation string.
 */
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

  // Green
  if (score >= 90) {
    return 'Excellent match — apply immediately with a targeted resume.';
  }
  if (score >= 80) {
    return 'Strong match — apply with tailored resume highlighting relevant experience.';
  }
  return 'Good match — apply with resume customized to this role\'s requirements.';
}


// ── Export for different environments ────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectDisqualifiers, extractJobSkills, skillMatch };
}
