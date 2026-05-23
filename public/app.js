const jobDescription = document.querySelector("#jobDescription");
const profile = document.querySelector("#profile");
const generateButton = document.querySelector("#generateButton");
const clearButton = document.querySelector("#clearButton");
const sampleJob = document.querySelector("#sampleJob");
const sampleProfile = document.querySelector("#sampleProfile");
const formMessage = document.querySelector("#formMessage");
const resumeOutput = document.querySelector("#resumeOutput");
const scoreRing = document.querySelector("#scoreRing");
const scoreValue = document.querySelector("#scoreValue");
const targetRole = document.querySelector("#targetRole");
const matchedKeywords = document.querySelector("#matchedKeywords");
const missingKeywords = document.querySelector("#missingKeywords");
const resumeMeta = document.querySelector("#resumeMeta");
const engineStatus = document.querySelector("#engineStatus");
const copyButton = document.querySelector("#copyButton");
const downloadButton = document.querySelector("#downloadButton");
const printButton = document.querySelector("#printButton");

const samples = {
  job: `Senior Full Stack Engineer

We are looking for a Senior Full Stack Engineer to build scalable React and Node.js applications. Responsibilities include designing REST APIs, improving performance, partnering with product and design, writing automated tests, and deploying cloud services using AWS, Docker, and CI/CD. Experience with TypeScript, PostgreSQL, accessibility, security best practices, and Agile teams is preferred.`,
  profile: `Jordan Lee
jordan.lee@email.com | (555) 123-4567 | linkedin.com/in/jordanlee | jordanlee.dev

Professional Summary
Full stack developer with 6 years of experience building web applications for SaaS and marketplace products.

Experience
Software Engineer | BrightApps | 2021-Present
- Built customer-facing dashboards using React, JavaScript, HTML, and CSS for 40,000 monthly users.
- Developed Node services and REST endpoints that reduced manual support requests by 28%.
- Improved page load performance by refactoring data fetching and front-end state management.
- Collaborated with product managers and designers to ship features in two-week sprints.

Web Developer | Northstar Studio | 2018-2021
- Created responsive websites and internal tools for finance, healthcare, and retail clients.
- Wrote SQL queries and reports to help account teams track campaign performance.

Skills
React, JavaScript, Node.js, REST APIs, SQL, PostgreSQL, Git, Jest, Agile, HTML, CSS

Education
B.S. Computer Science, State University`
};

const stopWords = new Set([
  "and", "the", "for", "with", "you", "your", "our", "are", "from", "that", "this", "will", "have",
  "has", "can", "into", "their", "they", "them", "job", "role", "work", "team", "teams", "using", "use",
  "able", "about", "within", "across", "based", "such", "must", "plus", "nice", "preferred", "required",
  "responsibilities", "requirements", "experience", "years", "year", "candidate", "skills", "knowledge",
  "ability", "including", "strong", "excellent", "good", "etc", "all", "any", "per", "as", "to", "of",
  "in", "on", "at", "a", "an", "or", "by", "be", "is", "we", "it", "if", "not", "more", "less"
]);

const knownSkills = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express", "Python", "Django", "Flask",
  "FastAPI", "Java", "Spring", "C#", ".NET", "Go", "Ruby", "Rails", "PHP", "Laravel", "SQL",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "GraphQL", "REST", "AWS", "Azure", "GCP", "Docker",
  "Kubernetes", "CI/CD", "GitHub Actions", "Terraform", "Linux", "HTML", "CSS", "Tailwind", "Sass",
  "Vue", "Angular", "Redux", "Jest", "Playwright", "Cypress", "Testing", "Agile", "Scrum",
  "API", "APIs", "Microservices", "Machine Learning", "AI", "LLM", "OpenAI", "Data Analysis",
  "Analytics", "ETL", "Tableau", "Power BI", "Salesforce", "SEO", "Product Management", "UX",
  "Accessibility", "Security", "DevOps", "Cloud", "Serverless", "NoSQL", "Kafka"
];

function titleCase(value) {
  return value
    .split(/\s+/)
    .map((word) => (/^[A-Z0-9+#.]+$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
}

function extractJobTitle(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const titleLine = lines.find((line) => /title|position|role/i.test(line) && line.length < 90) || lines[0] || "";
  const inlineTitle = titleLine.match(/^([A-Z][A-Za-z0-9+#./-]+(?:\s+[A-Z][A-Za-z0-9+#./-]+){1,6})\s+(needed|required|wanted|responsibilities|requirements|with|to|for)\b/);
  if (inlineTitle?.[1]) return titleCase(inlineTitle[1]);
  const cleaned = titleLine
    .replace(/^(job\s*)?(title|position|role)\s*[:|-]\s*/i, "")
    .replace(/\s+(needed|required|wanted)\b.*$/i, "")
    .replace(/\s*\|\s*.*/, "")
    .trim();
  return cleaned.length > 3 && cleaned.length < 80 ? titleCase(cleaned) : "Target Role";
}

function extractKeywords(jd, currentProfile) {
  const jdLower = jd.toLowerCase();
  const profileLower = currentProfile.toLowerCase();
  const merged = new Map();

  for (const skill of knownSkills) {
    if (jdLower.includes(skill.toLowerCase())) merged.set(skill, 5);
  }

  for (const token of jd.match(/[A-Za-z][A-Za-z0-9+#./-]{1,}/g) || []) {
    const clean = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
    const lower = clean.toLowerCase();
    if (clean.length < 3 || stopWords.has(lower) || /^\d+$/.test(clean)) continue;
    const term = titleCase(clean);
    merged.set(term, (merged.get(term) || 0) + 1);
  }

  return [...merged.entries()]
    .map(([term, score]) => ({ term, score, present: profileLower.includes(term.toLowerCase()) }))
    .sort((a, b) => Number(b.present) - Number(a.present) || b.score - a.score || a.term.localeCompare(b.term))
    .slice(0, 28);
}

function splitProfile(currentProfile) {
  const lines = currentProfile.split("\n").map((line) => line.trim()).filter(Boolean);
  const sectionIndex = lines.findIndex((line) => /^(summary|profile|experience|work experience|professional experience|employment|skills|education|projects|certifications)\b/i.test(line));
  const headerLines = sectionIndex > 0 ? lines.slice(0, sectionIndex) : lines.slice(0, Math.min(4, lines.length));
  const bodyLines = sectionIndex > 0 ? lines.slice(sectionIndex) : lines.slice(headerLines.length);
  return {
    header: headerLines.join("\n"),
    body: bodyLines.join("\n"),
    bulletLines: lines.filter((line) => /^[-*•]|^\d+[.)]/.test(line)),
    nonBulletLines: bodyLines.filter((line) => !/^[-*•]|^\d+[.)]/.test(line))
  };
}

function improveBullet(line, keywords) {
  const cleaned = line.replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
  if (!cleaned) return "";
  const startsWithAction = /^(led|built|created|developed|designed|managed|implemented|improved|launched|delivered|optimized|automated|collaborated|analyzed|owned|supported|reduced|increased|drove|architected)/i.test(cleaned);
  const actioned = startsWithAction ? cleaned : `Delivered ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
  const keyword = keywords.find((item) => !actioned.toLowerCase().includes(item.term.toLowerCase()));
  return `- ${actioned.replace(/\.$/, "")}${keyword ? ` while aligning with ${keyword.term} requirements` : ""}.`;
}

function buildLocalResume(jd, currentProfile) {
  const title = extractJobTitle(jd);
  const keywords = extractKeywords(jd, currentProfile);
  const matched = keywords.filter((item) => item.present).slice(0, 12);
  const missing = keywords.filter((item) => !item.present).slice(0, 10);
  const parsed = splitProfile(currentProfile);
  const skillTerms = [...new Set([...matched.map((item) => item.term), ...keywords.slice(0, 8).map((item) => item.term)])].slice(0, 14);
  const sourceBullets = parsed.bulletLines.length
    ? parsed.bulletLines.slice(0, 10)
    : parsed.body.split(/[.;]\s+/).filter((line) => line.length > 24).slice(0, 8);
  const bulletKeywords = matched.length ? matched : keywords.slice(0, 6);
  const bullets = sourceBullets.map((line, index) => improveBullet(line, bulletKeywords.slice(index % Math.max(bulletKeywords.length, 1))));

  const resume = [
    parsed.header || "Candidate Name\nEmail | Phone | LinkedIn | Portfolio",
    "",
    `TARGET ROLE: ${title}`,
    "",
    "PROFESSIONAL SUMMARY",
    `Results-driven professional tailored for ${title} opportunities. Brings hands-on experience from the current profile and emphasizes ${skillTerms.slice(0, 6).join(", ") || "role-relevant strengths"} to match the job description while keeping the resume factual and ATS-friendly.`,
    "",
    "CORE SKILLS",
    skillTerms.length ? skillTerms.join(" | ") : "Add skills from your profile and the job description",
    "",
    "SELECTED EXPERIENCE",
    bullets.length ? bullets.join("\n") : "- Add measurable accomplishments from your current profile, then tailor each bullet to the job description.",
    "",
    "SOURCE EXPERIENCE AND EDUCATION",
    parsed.nonBulletLines.length ? parsed.nonBulletLines.slice(0, 18).join("\n") : parsed.body || "Paste your current resume/profile to preserve experience and education details.",
    "",
    "KEYWORDS TO VERIFY BEFORE ADDING",
    missing.length ? missing.map((item) => `- ${item.term}`).join("\n") : "- No major JD keywords appear missing from your pasted profile."
  ].join("\n");

  const score = Math.min(96, Math.max(38, Math.round((matched.length / Math.max(keywords.length, 1)) * 100) + 36));
  return { resume, score, title, keywords, matched, missing, source: "browser" };
}

function setLoading(isLoading) {
  document.body.classList.toggle("loading", isLoading);
  generateButton.disabled = isLoading;
  generateButton.innerHTML = isLoading
    ? `<span class="button-icon">AI</span>Building resume...`
    : `<span class="button-icon">AI</span>Build tailored resume`;
}

function setMessage(message, tone = "neutral") {
  formMessage.textContent = message;
  formMessage.style.color = tone === "error" ? "#a13b27" : tone === "success" ? "#21835b" : "#66727c";
}

function chip(term) {
  const span = document.createElement("span");
  span.className = "chip";
  span.textContent = term;
  return span;
}

function renderKeywords(container, items, emptyText) {
  container.replaceChildren();
  if (!items || items.length === 0) {
    const empty = document.createElement("span");
    empty.className = "chip";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }
  for (const item of items.slice(0, 12)) {
    container.append(chip(typeof item === "string" ? item : item.term));
  }
}

async function buildResume() {
  const jd = jobDescription.value.trim();
  const currentProfile = profile.value.trim();

  if (jd.length < 40 || currentProfile.length < 40) {
    setMessage("Paste both the job description and your current profile first.", "error");
    return;
  }

  setLoading(true);
  setMessage("Reading the role and tailoring your resume...");

  try {
    let data;
    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jd, profile: currentProfile })
      });
      if (!response.ok) throw new Error("Server tailoring unavailable.");
      data = await response.json();
    } catch {
      data = buildLocalResume(jd, currentProfile);
    }

    resumeOutput.textContent = data.resume;
    const score = Math.max(0, Math.min(100, Number(data.score || 0)));
    scoreRing.style.setProperty("--score", score);
    scoreValue.textContent = `${score}`;
    targetRole.textContent = data.title || "Target Role";
    renderKeywords(matchedKeywords, data.matched?.length ? data.matched : data.keywords?.filter((item) => item.present), "No matches yet");
    renderKeywords(missingKeywords, data.missing, "Looks aligned");
    resumeMeta.textContent = data.source === "openai"
      ? "Generated with connected AI and grounded in your pasted profile."
      : "Generated locally in your browser. Review the verify section before sending.";
    engineStatus.textContent = data.source === "openai" ? "AI model connected" : "Browser tailoring engine";
    setMessage("Resume updated. Review the verify section before sending.", "success");
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setLoading(false);
  }
}

async function copyResume() {
  const text = resumeOutput.textContent.trim();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  setMessage("Resume copied to clipboard.", "success");
}

function downloadResume() {
  const text = resumeOutput.textContent.trim();
  if (!text) return;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tailored-resume.txt";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

generateButton.addEventListener("click", buildResume);
clearButton.addEventListener("click", () => {
  jobDescription.value = "";
  profile.value = "";
  resumeOutput.textContent = "Paste a job description and your current profile, then build a tailored resume.";
  scoreRing.style.setProperty("--score", 0);
  scoreValue.textContent = "--";
  targetRole.textContent = "Waiting for input";
  matchedKeywords.replaceChildren();
  missingKeywords.replaceChildren();
  resumeMeta.textContent = "Your tailored resume will appear here.";
  setMessage("");
});
sampleJob.addEventListener("click", () => {
  jobDescription.value = samples.job;
});
sampleProfile.addEventListener("click", () => {
  profile.value = samples.profile;
});
copyButton.addEventListener("click", copyResume);
downloadButton.addEventListener("click", downloadResume);
printButton.addEventListener("click", () => window.print());
