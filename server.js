import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
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
  "Vue", "Angular", "Svelte", "Redux", "Jest", "Playwright", "Cypress", "Testing", "Agile", "Scrum",
  "API", "APIs", "Microservices", "Machine Learning", "AI", "LLM", "OpenAI", "Data Analysis",
  "Analytics", "ETL", "Tableau", "Power BI", "Salesforce", "SEO", "Product Management", "UX",
  "Accessibility", "Security", "DevOps", "Cloud", "Serverless", "NoSQL", "Kafka", "RabbitMQ"
];

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function normalizeText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function titleCase(value) {
  return value
    .split(/\s+/)
    .map((word) => {
      if (/^[A-Z0-9+#.]+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function extractJobTitle(jobDescription) {
  const lines = jobDescription.split("\n").map((line) => line.trim()).filter(Boolean);
  const titleLine = lines.find((line) => /title|position|role/i.test(line) && line.length < 90) || lines[0] || "";
  const inlineTitle = titleLine.match(/^([A-Z][A-Za-z0-9+#./-]+(?:\s+[A-Z][A-Za-z0-9+#./-]+){1,6})\s+(needed|required|wanted|responsibilities|requirements|with|to|for)\b/);
  const cleaned = titleLine
    .replace(/^(job\s*)?(title|position|role)\s*[:|-]\s*/i, "")
    .replace(/\s+(needed|required|wanted)\b.*$/i, "")
    .replace(/\s*\|\s*.*/, "")
    .replace(/\s*-\s*(remote|hybrid|onsite|full.time|contract).*$/i, "")
    .trim();
  if (inlineTitle?.[1]) return titleCase(inlineTitle[1]);
  return cleaned.length > 3 && cleaned.length < 80 ? titleCase(cleaned) : "Target Role";
}

function getWordTokens(text) {
  return (text.match(/[A-Za-z][A-Za-z0-9+#./-]{1,}/g) || []).map((token) => token.trim());
}

function extractKeywords(jobDescription, profile) {
  const jdLower = jobDescription.toLowerCase();
  const profileLower = profile.toLowerCase();
  const skillHits = knownSkills
    .filter((skill) => jdLower.includes(skill.toLowerCase()))
    .map((skill) => ({
      term: skill,
      count: (jdLower.match(new RegExp(escapeRegExp(skill.toLowerCase()), "g")) || []).length + 3
    }));

  const tokenCounts = new Map();
  for (const token of getWordTokens(jobDescription)) {
    const clean = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
    const lower = clean.toLowerCase();
    if (clean.length < 3 || stopWords.has(lower) || /^\d+$/.test(clean)) continue;
    tokenCounts.set(titleCase(clean), (tokenCounts.get(titleCase(clean)) || 0) + 1);
  }

  const phraseCounts = new Map();
  const phrases = jobDescription.match(/[A-Za-z][A-Za-z0-9+#./-]*(?:\s+[A-Za-z][A-Za-z0-9+#./-]*){1,3}/g) || [];
  for (const phrase of phrases) {
    const words = phrase.split(/\s+/).map((word) => word.toLowerCase());
    if (words.some((word) => stopWords.has(word)) || phrase.length < 6 || phrase.length > 38) continue;
    const formatted = phrase
      .split(/\s+/)
      .map((word) => knownSkills.find((skill) => skill.toLowerCase() === word.toLowerCase()) || titleCase(word))
      .join(" ");
    phraseCounts.set(formatted, (phraseCounts.get(formatted) || 0) + 2);
  }

  const merged = new Map();
  for (const item of skillHits) merged.set(item.term, Math.max(merged.get(item.term) || 0, item.count));
  for (const [term, count] of phraseCounts) merged.set(term, (merged.get(term) || 0) + count);
  for (const [term, count] of tokenCounts) merged.set(term, (merged.get(term) || 0) + count);

  return [...merged.entries()]
    .map(([term, score]) => ({
      term,
      score,
      present: profileLower.includes(term.toLowerCase())
    }))
    .sort((a, b) => Number(b.present) - Number(a.present) || b.score - a.score || a.term.localeCompare(b.term))
    .slice(0, 28);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitProfile(profile) {
  const lines = profile.split("\n").map((line) => line.trim()).filter(Boolean);
  const sectionIndex = lines.findIndex((line) => /^(summary|profile|experience|work experience|professional experience|employment|skills|education|projects|certifications)\b/i.test(line));
  const headerLines = sectionIndex > 0 ? lines.slice(0, sectionIndex) : lines.slice(0, Math.min(4, lines.length));
  const bodyLines = sectionIndex > 0 ? lines.slice(sectionIndex) : lines.slice(headerLines.length);
  const bulletLines = lines.filter((line) => /^[-*•]|^\d+[.)]/.test(line));
  const nonBulletLines = bodyLines.filter((line) => !/^[-*•]|^\d+[.)]/.test(line));

  return {
    header: headerLines.join("\n"),
    body: bodyLines.join("\n"),
    bulletLines,
    nonBulletLines
  };
}

function inferCandidateFocus(profile, matchedKeywords, title) {
  const profileLower = profile.toLowerCase();
  if (/full.stack|frontend|front-end|backend|back-end|react|node|api/.test(profileLower)) return "full-stack engineering";
  if (/data|analytics|tableau|power bi|sql|python/.test(profileLower)) return "data and analytics";
  if (/product|roadmap|stakeholder|strategy/.test(profileLower)) return "product and delivery";
  if (matchedKeywords.some((keyword) => /design|ux|figma/i.test(keyword.term))) return "user-centered product design";
  return title === "Target Role" ? "business impact" : title.toLowerCase();
}

function improveBullet(line, keywords) {
  const cleaned = line.replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
  if (!cleaned) return "";
  const startsWithAction = /^(led|built|created|developed|designed|managed|implemented|improved|launched|delivered|optimized|automated|collaborated|analyzed|owned|supported|reduced|increased|drove|architected)/i.test(cleaned);
  const actioned = startsWithAction ? cleaned : `Delivered ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
  const keyword = keywords.find((item) => !actioned.toLowerCase().includes(item.term.toLowerCase()));
  const suffix = keyword ? ` while aligning with ${keyword.term} requirements` : "";
  const tightened = actioned.replace(/\s+/g, " ").replace(/\.$/, "");
  return `- ${tightened}${suffix}.`;
}

function buildDeterministicResume(jobDescription, profile) {
  const title = extractJobTitle(jobDescription);
  const keywords = extractKeywords(jobDescription, profile);
  const matched = keywords.filter((item) => item.present).slice(0, 12);
  const missing = keywords.filter((item) => !item.present).slice(0, 10);
  const parsed = splitProfile(profile);
  const focus = inferCandidateFocus(profile, matched, title);
  const skillTerms = [...new Set([...matched.map((item) => item.term), ...keywords.slice(0, 8).map((item) => item.term)])].slice(0, 14);

  const sourceBullets = parsed.bulletLines.length
    ? parsed.bulletLines.slice(0, 10)
    : parsed.body.split(/[.;]\s+/).filter((line) => line.length > 24).slice(0, 8);
  const topKeywords = matched.length ? matched : keywords.slice(0, 6);
  const bullets = sourceBullets.map((line, index) => improveBullet(line, topKeywords.slice(index % Math.max(topKeywords.length, 1))));

  const summarySkills = skillTerms.slice(0, 6).join(", ");
  const resumeParts = [
    parsed.header || "Candidate Name\nEmail | Phone | LinkedIn | Portfolio",
    "",
    `TARGET ROLE: ${title}`,
    "",
    "PROFESSIONAL SUMMARY",
    `Results-driven ${focus} professional tailored for ${title} opportunities. Brings hands-on experience from the current profile and emphasizes ${summarySkills || "role-relevant strengths"} to match the job description while keeping the resume factual and ATS-friendly.`,
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
  ];

  const score = Math.min(96, Math.max(38, Math.round((matched.length / Math.max(keywords.length, 1)) * 100) + 36));
  return {
    resume: resumeParts.join("\n"),
    score,
    title,
    keywords,
    matched,
    missing,
    source: "local"
  };
}

async function buildWithOpenAI(jobDescription, profile) {
  const env = globalThis.process?.env || {};
  if (!env.OPENAI_API_KEY) return null;

  const prompt = [
    "You are an expert resume writer. Tailor the user's current resume/profile to the job description.",
    "Rules: keep facts grounded in the profile, do not invent employers/degrees/certifications, preserve contact details, make bullets ATS-friendly, include missing JD keywords only in a 'Verify before adding' section if not supported.",
    "Return strict JSON with keys: resume, score, title, keywords, matched, missing.",
    "",
    `JOB DESCRIPTION:\n${jobDescription}`,
    "",
    `CURRENT PROFILE:\n${profile}`
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
      text: { format: { type: "json_object" } }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}`);
  }

  const data = await response.json();
  const text = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;
  if (!text) throw new Error("OpenAI response did not include text.");
  const parsed = JSON.parse(text);
  return {
    resume: String(parsed.resume || ""),
    score: Number(parsed.score || 78),
    title: String(parsed.title || extractJobTitle(jobDescription)),
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(normalizeKeyword) : extractKeywords(jobDescription, profile),
    matched: Array.isArray(parsed.matched) ? parsed.matched.map(normalizeKeyword) : [],
    missing: Array.isArray(parsed.missing) ? parsed.missing.map(normalizeKeyword) : [],
    source: "openai"
  };
}

function normalizeKeyword(item) {
  if (typeof item === "string") return { term: item, present: false, score: 1 };
  return {
    term: String(item.term || item.keyword || ""),
    present: Boolean(item.present || item.matched),
    score: Number(item.score || 1)
  };
}

async function handleTailor(req, res) {
  try {
    const body = await parseBody(req);
    const jobDescription = normalizeText(body.jobDescription);
    const profile = normalizeText(body.profile);
    if (jobDescription.length < 40 || profile.length < 40) {
      return json(res, 400, { error: "Please paste both a job description and your current profile/resume." });
    }

    json(res, 200, await tailorResume(jobDescription, profile));
  } catch (error) {
    json(res, 500, { error: error.message || "Something went wrong tailoring the resume." });
  }
}

export async function tailorResume(jobDescription, profile) {
  let result = null;
  let aiError = "";
  try {
    result = await buildWithOpenAI(jobDescription, profile);
  } catch (error) {
    aiError = error.message;
  }
  if (!result) result = buildDeterministicResume(jobDescription, profile);
  if (aiError) result.aiError = aiError;
  return result;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

export function createAppServer() {
  return http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/tailor") {
      handleTailor(req, res);
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") {
      serveStatic(req, res);
      return;
    }
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method not allowed");
  });
}

const isCliRun = globalThis.process?.argv?.[1] && fileURLToPath(import.meta.url) === globalThis.process.argv[1];

if (isCliRun) {
  const port = Number(globalThis.process.env.PORT || 4173);
  const server = createAppServer();
  server.listen(port, () => {
    console.log(`AI Resume Builder running at http://localhost:${port}`);
  });
}
