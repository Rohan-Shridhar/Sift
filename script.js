"use strict";

const STORAGE_KEY = "applytrack.applications.v1";
const COMPANY_STORAGE_KEY = "applytrack.companies.v1";
const RESUME_STORAGE_KEY = "applytrack.resumes.v1";
const RESUME_DATABASE_NAME = "applytrack.documents.v1";
const RESUME_DATABASE_VERSION = 1;
const RESUME_FILE_STORE = "pdfs";
const RESUME_MAX_FILE_SIZE = 20 * 1024 * 1024;
const THEME_KEY = "applytrack.theme.v1";
const COLLAPSE_KEY = "applytrack.sidebar-collapsed.v1";

const statusOrder = ["Saved", "Applied", "Contacted", "Interviewed", "Offered", "On Hold", "Rejected", "Withdrawn"];
const statusClass = {
  Saved: "status-saved",
  Applied: "status-applied",
  Contacted: "status-contacted",
  Interviewed: "status-interviewed",
  Offered: "status-offered",
  "On Hold": "status-on-hold",
  Rejected: "status-rejected",
  Withdrawn: "status-withdrawn"
};
const companyColors = ["indigo", "sage", "amber", "blue", "rose"];
const STATUS_COLORS = ["#81a5cc", "#736be0", "#d8ad71", "#79b49a", "#ce8791", "#9a85b8", "#cf7f78", "#9297a3"];
const iconMarkup = {
  opportunities: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 5V3.5h8V5M8 10h8M8 14h5"/></svg>',
  saved: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z"/></svg>',
  applied: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  contacted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v12H9l-5 3v-15Z"/><path d="M8 10h8m-8 3.5h5"/></svg>',
  interviews: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/></svg>',
  offers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10.2c0 5-7 10.3-7 10.3S5 15.2 5 10.2a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="7" width="17" height="13" rx="2"/><path d="M8 7V4h8v3m-12 5h16m-10 0v2h4v-2"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
};

const seedApplications = [
  { id: "a1", title: "Product Design Intern", company: "Linear", location: "Remote", mode: "Remote", stipend: "$32 / hr", date: "2026-11-18", status: "Interviewed", source: "LinkedIn" },
  { id: "a2", title: "Software Engineer Intern", company: "Figma", location: "San Francisco, CA", mode: "Hybrid", stipend: "$45 / hr", date: "2026-11-16", status: "Applied", source: "Company website" },
  { id: "a3", title: "Product Intern", company: "Notion", location: "New York, NY", mode: "Hybrid", stipend: "$38 / hr", date: "2026-11-14", status: "Contacted", source: "Referral" },
  { id: "a4", title: "UX Research Intern", company: "Duolingo", location: "Pittsburgh, PA", mode: "On-site", stipend: "$28 / hr", date: "2026-11-12", status: "Saved", source: "LinkedIn" },
  { id: "a5", title: "Frontend Engineering Intern", company: "Vercel", location: "Remote", mode: "Remote", stipend: "$40 / hr", date: "2026-11-10", status: "Offered", source: "Company website" },
  { id: "a6", title: "Data Science Intern", company: "Khan Academy", location: "Remote", mode: "Remote", stipend: "$30 / hr", date: "2026-11-08", status: "Applied", source: "Handshake" },
  { id: "a7", title: "Visual Design Intern", company: "Webflow", location: "Remote", mode: "Remote", stipend: "$27 / hr", date: "2026-11-05", status: "Saved", source: "LinkedIn" },
  { id: "a8", title: "Software Engineering Intern", company: "Ramp", location: "New York, NY", mode: "On-site", stipend: "$48 / hr", date: "2026-11-02", status: "Interviewed", source: "Referral" },
  { id: "a9", title: "Growth Marketing Intern", company: "Airtable", location: "San Francisco, CA", mode: "Hybrid", stipend: "$26 / hr", date: "2026-10-29", status: "Contacted", source: "Handshake" },
  { id: "a10", title: "Product Design Intern", company: "Arc", location: "Remote", mode: "Remote", stipend: "$34 / hr", date: "2026-10-24", status: "Applied", source: "Company website" },
  { id: "a11", title: "iOS Engineering Intern", company: "Headspace", location: "Santa Monica, CA", mode: "Hybrid", stipend: "$36 / hr", date: "2026-10-19", status: "Saved", source: "LinkedIn" },
  { id: "a12", title: "Product Analyst Intern", company: "Brex", location: "San Francisco, CA", mode: "Hybrid", stipend: "$42 / hr", date: "2026-10-14", status: "Applied", source: "Referral" }
];

const initialApplications = loadApplications();
const initialCompanyData = loadCompanyData(initialApplications);
const initialResumes = loadResumeRecords();
const state = {
  applications: linkApplicationsToCompanies(initialApplications, initialCompanyData),
  companies: initialCompanyData.companies,
  resumes: initialResumes,
  filter: "",
  collapsedSections: new Set(),
  route: "dashboard",
  applicationMode: "list",
  activeApplicationId: null,
  companyMode: "list",
  activeCompanyId: null,
  resumeMode: "list",
  activeResumeId: null,
  editingResumeId: null,
  resumeUploadContext: "library",
  resumeDatabasePromise: null,
  resumeObjectUrl: null,
  applicationView: "cards",
  formIntent: "saved",
  editingApplicationId: null,
  toastTimer: null
};
persistDataRecords(state.companies, state.applications, false);

function loadApplications() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const seeded = normalizeApplications(seedApplications);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Stored applications are not an array.");
    const normalized = normalizeApplications(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch (error) {
    console.error("Could not load saved applications.", error);
    return normalizeApplications(seedApplications);
  }
}

function createId(prefix) {
  const suffix = window.crypto && typeof window.crypto.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${suffix}`;
}

function localDateString() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function cleanCompanyName(value) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizeCompanyName(value) {
  return cleanCompanyName(value).toLocaleLowerCase();
}

function normalizeApplications(records) {
  const companyIds = new Map();
  const usedIds = new Set();
  const today = localDateString();
  return records.filter((record) => record && typeof record === "object").map((record) => {
    let id = String(record.id || "");
    if (!id || usedIds.has(id)) id = createId("application");
    usedIds.add(id);

    const companyName = cleanCompanyName(record.companyName || record.company || "");
    const companyKey = normalizeCompanyName(companyName);
    const companyId = String(companyIds.get(companyKey) || record.companyId || createId("company"));
    if (companyKey) companyIds.set(companyKey, companyId);
    const status = statusOrder.includes(record.status) ? record.status : "Saved";
    const legacyDate = String(record.date || "");
    const legacyPay = String(record.stipend || "");
    const legacyAmount = legacyPay.match(/([\d,]+(?:\.\d+)?)/);
    const frequency = record.paymentFrequency || (/hr|hour/i.test(legacyPay) ? "Hourly" : "");
    const rawSkills = Array.isArray(record.skills) ? record.skills : String(record.skills || "").split(/[,;\n]/);

    const storedSnapshot = record.resumeSnapshot && typeof record.resumeSnapshot === "object" ? record.resumeSnapshot : {};
    const resumeName = String(storedSnapshot.name || record.resumeName || "");
    const scoreValue = storedSnapshot.atsScore ?? record.resumeAtsScore;
    const score = scoreValue === "" || scoreValue == null ? null : Number(scoreValue);
    const resumeSnapshot = resumeName ? {
      name: resumeName,
      fileName: String(storedSnapshot.fileName || record.resumeFileName || ""),
      uploadedAt: String(storedSnapshot.uploadedAt || ""),
      atsScore: Number.isInteger(score) && score >= 0 && score <= 100 ? score : null
    } : null;

    return {
      id,
      companyId,
      companyName,
      title: String(record.title || record.jobTitle || ""),
      jobType: String(record.jobType || "Internship"),
      description: String(record.description || record.jobDescription || ""),
      listingUrl: String(record.listingUrl || record.url || ""),
      skills: rawSkills.map((skill) => String(skill).trim()).filter(Boolean),
      location: String(record.location || ""),
      workMode: String(record.workMode || record.mode || ""),
      compensationAmount: String(record.compensationAmount ?? (legacyAmount ? legacyAmount[1].replace(/,/g, "") : "")),
      currency: String(record.currency || "USD"),
      paymentFrequency: String(frequency || "Not specified"),
      duration: String(record.duration || ""),
      hoursPerDay: String(record.hoursPerDay || ""),
      source: String(record.source || "Other"),
      status,
      dateDiscovered: String(record.dateDiscovered || legacyDate || today),
      dateApplied: String(record.dateApplied || (status !== "Saved" ? legacyDate : "")),
      deadline: String(record.deadline || ""),
      followUpDate: String(record.followUpDate || ""),
      resumeId: String(record.resumeId || ""),
      resumeName,
      resumeSnapshot,
      notes: String(record.notes || ""),
      createdAt: String(record.createdAt || new Date().toISOString()),
      updatedAt: String(record.updatedAt || new Date().toISOString())
    };
  });
}

function normalizeResumeRecords(records) {
  const ids = new Set();
  return records.filter((resume) => resume && typeof resume === "object" && resume.id && resume.name)
    .map((resume) => {
      const id = String(resume.id);
      if (ids.has(id)) return null;
      ids.add(id);
      const score = resume.atsScore === "" || resume.atsScore == null ? null : Number(resume.atsScore);
      return {
        id,
        name: String(resume.name).trim(),
        fileName: String(resume.fileName || ""),
        uploadedAt: String(resume.uploadedAt || new Date().toISOString()),
        size: Number(resume.size) || 0,
        atsScore: Number.isInteger(score) && score >= 0 && score <= 100 ? score : null,
        notes: String(resume.notes || "")
      };
    }).filter(Boolean);
}

function loadResumeRecords() {
  try {
    const stored = localStorage.getItem(RESUME_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Stored resumes are not an array.");
    return normalizeResumeRecords(parsed);
  } catch (error) {
    console.error("Could not load saved resumes.", error);
    return [];
  }
}

function makeCompanyRecord(name, id) {
  const cleanName = cleanCompanyName(name);
  const now = new Date().toISOString();
  return {
    id: id || createId("company"),
    normalizedName: normalizeCompanyName(cleanName),
    name: cleanName,
    logo: "",
    industry: "",
    description: "",
    website: "",
    careersUrl: "",
    contactEmail: "",
    contactPerson: "",
    contactDesignation: "",
    linkedInUrl: "",
    location: "",
    size: "",
    notes: "",
    createdAt: now,
    updatedAt: now
  };
}

function normalizeCompanyRecords(records) {
  const companies = [];
  const byName = new Map();
  const idAliases = new Map();
  const usedIds = new Set();
  const textFields = ["logo", "industry", "description", "website", "careersUrl", "contactEmail", "contactPerson", "contactDesignation", "linkedInUrl", "location", "size", "notes"];

  records.filter((record) => record && typeof record === "object").forEach((record) => {
    const name = cleanCompanyName(record.name || record.companyName);
    const key = normalizeCompanyName(name);
    if (!key) return;
    const previous = byName.get(key);
    if (previous) {
      if (record.id) idAliases.set(String(record.id), previous.id);
      textFields.forEach((field) => {
        if (!previous[field] && record[field]) previous[field] = String(record[field]);
      });
      return;
    }

    let id = String(record.id || "");
    if (!id || usedIds.has(id)) id = createId("company");
    usedIds.add(id);
    const company = {
      ...makeCompanyRecord(name, id),
      normalizedName: key,
      createdAt: String(record.createdAt || new Date().toISOString()),
      updatedAt: String(record.updatedAt || new Date().toISOString())
    };
    textFields.forEach((field) => { company[field] = String(record[field] || ""); });
    byName.set(key, company);
    companies.push(company);
    if (record.id) idAliases.set(String(record.id), id);
  });
  return { companies, idAliases };
}

function loadCompanyData(applications) {
  try {
    const stored = localStorage.getItem(COMPANY_STORAGE_KEY);
    let parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) throw new Error("Stored companies are not an array.");
    const normalized = normalizeCompanyRecords(parsed);
    const companies = normalized.companies;
    const byName = new Map(companies.map((company) => [company.normalizedName, company]));
    const byId = new Map(companies.map((company) => [company.id, company]));
    const idAliases = normalized.idAliases;
    applications.forEach((application) => {
      const name = cleanCompanyName(application.companyName || "");
      const key = normalizeCompanyName(name);
      const aliasedId = idAliases.get(application.companyId) || application.companyId;
      let company = byId.get(aliasedId) || byName.get(key);
      if (!company && !key) return;
      if (!company) {
        company = makeCompanyRecord(name, aliasedId);
        companies.push(company);
        byName.set(key, company);
        byId.set(company.id, company);
      }
      if (application.companyId) idAliases.set(application.companyId, company.id);
    });
    return { companies, idAliases };
  } catch (error) {
    console.error("Could not load saved companies.", error);
    const fallback = normalizeCompanyRecords(applications.map((application) => ({
      id: application.companyId,
      name: application.companyName
    })));
    return fallback;
  }
}

function linkApplicationsToCompanies(applications, companyData) {
  const byId = new Map(companyData.companies.map((company) => [company.id, company]));
  const byName = new Map(companyData.companies.map((company) => [company.normalizedName, company]));
  return applications.map((application) => {
    const { companyName, company, ...record } = application;
    const existing = byId.get(companyData.idAliases.get(application.companyId) || application.companyId);
    const matched = existing || byName.get(normalizeCompanyName(companyName || company || ""));
    return { ...record, companyId: matched ? matched.id : null };
  });
}

function persistDataRecords(companies, applications, notify = true) {
  let oldCompanies;
  let oldApplications;
  try {
    oldCompanies = localStorage.getItem(COMPANY_STORAGE_KEY);
    oldApplications = localStorage.getItem(STORAGE_KEY);
    localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(companies));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    return true;
  } catch (error) {
    console.error("Could not save application and company data.", error);
    try {
      if (oldCompanies === null) localStorage.removeItem(COMPANY_STORAGE_KEY);
      else if (oldCompanies !== undefined) localStorage.setItem(COMPANY_STORAGE_KEY, oldCompanies);
      if (oldApplications === null) localStorage.removeItem(STORAGE_KEY);
      else if (oldApplications !== undefined) localStorage.setItem(STORAGE_KEY, oldApplications);
    } catch (rollbackError) {
      console.error("Could not restore the previous application and company data.", rollbackError);
    }
    if (notify) showToast("Your changes could not be saved. Check available browser storage and try again.");
    return false;
  }
}

function formatCompensation(application) {
  if (application.paymentFrequency === "Unpaid") return "Unpaid";
  if (!application.compensationAmount) return "Not specified";
  const amount = Number(application.compensationAmount);
  if (!Number.isFinite(amount)) return String(application.compensationAmount);
  let formatted = `${application.currency || "USD"} ${amount}`;
  try {
    formatted = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: application.currency || "USD",
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error("Could not format the application compensation.", error);
  }
  const periods = { Hourly: "hr", Monthly: "month", Annual: "year", Total: "total" };
  const period = periods[application.paymentFrequency];
  return period ? `${formatted} / ${period}` : formatted;
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value || "Date not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function countByStatus(status) {
  return state.applications.filter((application) => application.status === status).length;
}

function renderStats() {
  const contacted = state.applications.filter((application) => application.status !== "Saved");
  const stats = [
    { label: "Total opportunities", value: state.applications.length, note: "Across your search", icon: "opportunities", tone: "indigo" },
    { label: "Saved jobs", value: countByStatus("Saved"), note: "Worth a closer look", icon: "saved", tone: "blue" },
    { label: "Applications sent", value: state.applications.filter((application) => application.status !== "Saved").length, note: "Taking the next step", icon: "applied", tone: "green" },
    { label: "Companies contacted", value: new Set(contacted.map((application) => application.companyId).filter(Boolean)).size, note: "Conversations started", icon: "contacted", tone: "amber" },
    { label: "Interviews", value: countByStatus("Interviewed"), note: "You've got this", icon: "interviews", tone: "blue" },
    { label: "Offers received", value: countByStatus("Offered"), note: "A milestone worth celebrating", icon: "offers", tone: "rose" }
  ];
  const grid = document.querySelector("#stats-grid");
  if (grid) {
    grid.innerHTML = stats.map((stat) => `
    <article class="stat-card" data-tone="${stat.tone}">
      <div class="stat-top"><span class="stat-label">${stat.label}</span><span class="stat-icon">${iconMarkup[stat.icon]}</span></div>
      <div class="stat-value"><strong>${stat.value}</strong></div>
      <div class="stat-footnote">${stat.note}</div>
    </article>
  `).join("");
  }
  const navCount = document.querySelector("#application-nav-count");
  if (navCount) navCount.textContent = state.applications.length;
  const pipelineTotal = document.querySelector("#pipeline-total");
  if (pipelineTotal) pipelineTotal.textContent = `${state.applications.length} ${state.applications.length === 1 ? "opportunity" : "opportunities"}`;
}

function statusOptions(selectedStatus) {
  return statusOrder.map((status) => `<option value="${status}"${status === selectedStatus ? " selected" : ""}>${status}</option>`).join("");
}

function applicationCard(application, index) {
  const companyName = getApplicationCompanyName(application);
  const companyInitial = companyName.charAt(0).toUpperCase() || "?";
  const tone = companyColors[index % companyColors.length];
  return `
    <article class="application-card">
      <div class="application-card-top">
        <span class="company-mark" data-color="${tone}" aria-hidden="true">${escapeHtml(companyInitial)}</span>
        <div class="application-title-wrap">
          <button class="application-open-button" type="button" data-open-application="${escapeAttribute(application.id)}"><span class="application-title" title="${escapeAttribute(application.title)}">${escapeHtml(application.title)}</span></button>
          <p class="application-company">${escapeHtml(companyName)}</p>
        </div>
      </div>
      <div class="application-meta">
        <span>${iconMarkup.pin}${escapeHtml(application.location || "Location not set")}</span>
        <span>${iconMarkup.briefcase}${escapeHtml(application.workMode || "Work mode not set")}</span>
        <span>${escapeHtml(formatCompensation(application))}</span>
      </div>
      <div class="application-card-footer">
        <select class="quick-status" data-status-application="${escapeAttribute(application.id)}" aria-label="Change status for ${escapeAttribute(application.title)}">${statusOptions(application.status)}</select>
        <time class="application-date" datetime="${escapeAttribute(application.dateApplied || application.dateDiscovered || "")}">${formatDate(application.dateApplied || application.dateDiscovered)}</time>
      </div>
    </article>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function renderPipeline() {
  const search = state.filter.trim().toLocaleLowerCase();
  const groups = statusOrder.map((status) => {
    const matches = state.applications.filter((application) => {
      if (application.status !== status) return false;
      if (!search) return true;
      return [application.title, getApplicationCompanyName(application), application.location, application.workMode, application.status]
        .some((value) => String(value || "").toLocaleLowerCase().includes(search));
    });
    const collapsed = state.collapsedSections.has(status);
    return `
      <section class="pipeline-group${collapsed ? " is-collapsed" : ""}" data-status="${status}">
        <button class="pipeline-group-header" type="button" aria-expanded="${!collapsed}" aria-controls="group-${status.toLowerCase()}">
          <span class="pipeline-group-title"><span class="pipeline-chevron">${iconMarkup.chevron}</span><span class="pipeline-label">${status}</span><span class="pipeline-count">${search ? matches.length : countByStatus(status)}</span></span>
          <span class="pipeline-header-end"><span class="pipeline-hint">${collapsed ? "Expand section" : "Click to collapse"}</span></span>
        </button>
        <div class="pipeline-content" id="group-${status.toLowerCase()}">
          <div class="pipeline-content-inner">
            ${matches.length ? `<div class="application-grid">${matches.map(applicationCard).join("")}</div>` :
              `<div class="${search ? "search-empty" : "empty-state"}">${search ? "No matching opportunities in this section." : `Nothing in ${status.toLowerCase()} yet. Opportunities you move here will show up.`}</div>`}
          </div>
        </div>
      </section>`;
  });
  const pipelineList = document.querySelector("#pipeline-list");
  if (!pipelineList) return;
  pipelineList.innerHTML = groups.join("");
  document.querySelectorAll(".pipeline-group-header").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.closest(".pipeline-group").dataset.status;
      if (state.collapsedSections.has(section)) state.collapsedSections.delete(section);
      else state.collapsedSections.add(section);
      renderPipeline();
    });
  });
  document.querySelectorAll("[data-status-application]").forEach((select) => {
    select.addEventListener("change", () => updateApplicationStatus(select.dataset.statusApplication, select.value));
  });
  document.querySelectorAll("[data-open-application]").forEach((button) => {
    button.addEventListener("click", () => openApplicationDetail(button.dataset.openApplication));
  });
}

function chartMonths() {
  const today = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
    return {
      label: new Intl.DateTimeFormat("en", { month: "short" }).format(date),
      year: date.getFullYear(),
      month: date.getMonth()
    };
  });
}

function countsByMonth() {
  const months = chartMonths();
  const applied = months.map((month) => state.applications.filter((application) => {
    const date = new Date(`${application.dateApplied || application.dateDiscovered}T12:00:00`);
    return application.status !== "Saved" && date.getFullYear() === month.year && date.getMonth() === month.month;
  }).length);
  const saved = months.map((month) => state.applications.filter((application) => {
    const date = new Date(`${application.dateDiscovered}T12:00:00`);
    return application.status === "Saved" && date.getFullYear() === month.year && date.getMonth() === month.month;
  }).length);
  return { months, applied, saved };
}

function svgPolyline(values, max, width, height, padding, className) {
  const points = values.map((value, index) => {
    const x = padding.left + index * ((width - padding.left - padding.right) / Math.max(1, values.length - 1));
    const y = padding.top + (height - padding.top - padding.bottom) * (1 - value / max);
    return `${x},${y}`;
  });
  return `<polyline class="${className}" points="${points.join(" ")}"/>`;
}

function renderLineChart(targetId, values, labels, options) {
  const target = document.getElementById(targetId);
  if (!target) return;
  if (!values.some((value) => value > 0) && !options.allowEmpty) {
    target.innerHTML = `<div class="empty-chart">Your activity will appear here as you apply.</div>`;
    return;
  }
  const width = 560;
  const height = 145;
  const padding = { top: 10, right: 9, bottom: 25, left: 20 };
  const maximum = Math.max(4, Math.ceil(Math.max(...values, ...(options.secondValues || [])) / 2) * 2);
  const plotHeight = height - padding.top - padding.bottom;
  const gridLines = [0, 1, 2, 3].map((step) => {
    const y = padding.top + plotHeight * step / 3;
    const label = Math.round(maximum * (1 - step / 3));
    return `<line class="chart-gridline" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"/><text class="chart-axis-label" x="0" y="${y + 3}">${label}</text>`;
  }).join("");
  const xLabels = labels.map((label, index) => {
    const x = padding.left + index * ((width - padding.left - padding.right) / Math.max(1, labels.length - 1));
    return `<text class="chart-axis-label" text-anchor="middle" x="${x}" y="${height - 5}">${label}</text>`;
  }).join("");
  const line = svgPolyline(values, maximum, width, height, padding, options.lineClass || "chart-line");
  const circles = values.map((value, index) => {
    const x = padding.left + index * ((width - padding.left - padding.right) / Math.max(1, values.length - 1));
    const y = padding.top + plotHeight * (1 - value / maximum);
    return `<circle class="chart-point" cx="${x}" cy="${y}" r="3"/>`;
  }).join("");
  let second = "";
  if (options.secondValues) second = svgPolyline(options.secondValues, maximum, width, height, padding, "trend-line-saved");
  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeAttribute(options.label)}"><defs><linearGradient id="chart-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#736be0" stop-opacity=".18"/><stop offset="1" stop-color="#736be0" stop-opacity="0"/></linearGradient></defs>${gridLines}${options.showArea ? `<polygon class="chart-area" points="${padding.left},${height - padding.bottom} ${values.map((value, index) => `${padding.left + index * ((width - padding.left - padding.right) / Math.max(1, values.length - 1))},${padding.top + plotHeight * (1 - value / maximum)}`).join(" ")} ${width - padding.right},${height - padding.bottom}"/>` : ""}${second}${line}${circles}${xLabels}</svg>`;
}

function renderStatusChart() {
  const target = document.querySelector("#status-chart");
  if (!target) return;
  const counts = statusOrder.map((status) => countByStatus(status));
  const total = counts.reduce((sum, count) => sum + count, 0);
  const totalApplied = state.applications.filter((application) => application.status !== "Saved").length;
  const segments = counts.map((count, index) => {
    const value = total ? (count / total) * 100 : 0;
    return `${STATUS_COLORS[index]} ${value}%`;
  });
  const conic = total ? `conic-gradient(${segments.join(", ")})` : "conic-gradient(var(--surface-hover) 0% 100%)";
  const legend = statusOrder.map((status, index) => `
    <div class="status-legend-row"><i class="status-swatch" style="background:${STATUS_COLORS[index]}"></i><span>${status}</span><strong>${countByStatus(status)}</strong></div>
  `).join("");
  target.innerHTML = `
    <div class="donut-chart" role="img" aria-label="${totalApplied} applications, ${total} opportunities across all statuses" style="background:${conic}">
      <div class="donut-center"><strong>${totalApplied}</strong><span>applied</span></div>
    </div>
    <div class="status-legend">${legend}</div>`;
}

function renderSourceChart() {
  const sources = new Map();
  state.applications.forEach((application) => {
    const source = application.source || "Other";
    sources.set(source, (sources.get(source) || 0) + 1);
  });
  const sorted = [...sources.entries()].sort((first, second) => second[1] - first[1]).slice(0, 4);
  const maximum = Math.max(1, ...sorted.map(([, count]) => count));
  const target = document.querySelector("#source-chart");
  if (!target) return;
  target.innerHTML = sorted.length ? sorted.map(([source, count], index) => `
    <div class="source-row">
      <span class="source-name">${escapeHtml(source)}</span>
      <span class="source-track"><span class="source-fill" data-index="${index}" style="display:block;width:${Math.max(8, count / maximum * 100)}%"></span></span>
      <span class="source-value">${count}</span>
    </div>`).join("") : `<div class="empty-chart">Add opportunities to see your sources.</div>`;
}

function renderCharts() {
  const { months, applied, saved } = countsByMonth();
  renderLineChart("applications-chart", applied, months.map((month) => month.label), {
    label: "Applications submitted over the last six months", showArea: true
  });
  renderStatusChart();
  renderSourceChart();
  renderLineChart("trends-chart", applied, months.map((month) => month.label), {
    label: "Monthly applications and saved opportunities over the last six months",
    secondValues: saved,
    lineClass: "trend-line-applied",
    allowEmpty: true
  });
}

function renderDashboard() {
  renderStats();
  renderCharts();
  renderPipeline();
}

function showToast(message) {
  const toast = document.querySelector("#toast-message");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function companyOptions() {
  return [...state.companies].sort((first, second) => first.name.localeCompare(second.name));
}

function getApplicationCompanyName(application) {
  const company = state.companies.find((item) => item.id === application.companyId);
  return company ? company.name : "";
}

function findCompanyByName(name, companies = state.companies) {
  const normalizedName = normalizeCompanyName(name);
  return normalizedName ? companies.find((company) => company.normalizedName === normalizedName) || null : null;
}

function ensureCompanyForName(name, companies = state.companies) {
  const cleanName = cleanCompanyName(name);
  if (!cleanName) return { company: null, companies };
  const existing = findCompanyByName(cleanName, companies);
  if (existing) return { company: existing, companies };
  const company = makeCompanyRecord(cleanName);
  return { company, companies: [...companies, company] };
}

function replaceSelectOptions(select, defaultLabel, values, selectedValue) {
  const options = [`<option value="">${escapeHtml(defaultLabel)}</option>`];
  values.forEach((value) => options.push(`<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`));
  select.innerHTML = options.join("");
  select.value = values.includes(selectedValue) ? selectedValue : "";
}

function renderApplicationFilters() {
  const selected = {
    status: document.querySelector("#filter-status").value,
    companyId: document.querySelector("#filter-company").value,
    jobType: document.querySelector("#filter-job-type").value,
    workMode: document.querySelector("#filter-work-mode").value,
    source: document.querySelector("#filter-source").value
  };
  replaceSelectOptions(document.querySelector("#filter-status"), "All statuses", statusOrder, selected.status);
  const companySelect = document.querySelector("#filter-company");
  const companyEntries = companyOptions().map((company) => ({ value: company.id, label: company.name }));
  if (state.applications.some((application) => !application.companyId)) {
    companyEntries.push({ value: "__unassigned__", label: "No company association" });
  }
  companySelect.innerHTML = '<option value="">All companies</option>' + companyEntries
    .map((company) => `<option value="${escapeAttribute(company.value)}">${escapeHtml(company.label)}</option>`).join("");
  companySelect.value = companyEntries.some((company) => company.value === selected.companyId) ? selected.companyId : "";
  replaceSelectOptions(document.querySelector("#filter-job-type"), "All job types", ["Internship", "Full-time", "Part-time", "Contract"], selected.jobType);
  replaceSelectOptions(document.querySelector("#filter-work-mode"), "All work modes", ["Remote", "Hybrid", "On-site"], selected.workMode);
  const sources = [...new Set(state.applications.map((application) => application.source).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  replaceSelectOptions(document.querySelector("#filter-source"), "All sources", sources, selected.source);
}

function getFilteredApplications() {
  const query = document.querySelector("#applications-search").value.trim().toLocaleLowerCase();
  const filters = {
    status: document.querySelector("#filter-status").value,
    companyId: document.querySelector("#filter-company").value,
    jobType: document.querySelector("#filter-job-type").value,
    workMode: document.querySelector("#filter-work-mode").value,
    source: document.querySelector("#filter-source").value,
    sort: document.querySelector("#sort-applications").value
  };
  const filtered = state.applications.filter((application) => {
    return (!query || `${application.title} ${getApplicationCompanyName(application)}`.toLocaleLowerCase().includes(query))
      && (!filters.status || application.status === filters.status)
      && (!filters.companyId || (filters.companyId === "__unassigned__" ? !application.companyId : application.companyId === filters.companyId))
      && (!filters.jobType || application.jobType === filters.jobType)
      && (!filters.workMode || application.workMode === filters.workMode)
      && (!filters.source || application.source === filters.source);
  });
  const sorters = {
    "date-desc": (first, second) => (second.dateApplied || second.dateDiscovered).localeCompare(first.dateApplied || first.dateDiscovered),
    "date-asc": (first, second) => (first.dateApplied || first.dateDiscovered).localeCompare(second.dateApplied || second.dateDiscovered),
    "company-asc": (first, second) => getApplicationCompanyName(first).localeCompare(getApplicationCompanyName(second)),
    "title-asc": (first, second) => first.title.localeCompare(second.title)
  };
  return filtered.sort(sorters[filters.sort] || sorters["date-desc"]);
}

function renderManagementCard(application, index) {
  const companyName = getApplicationCompanyName(application) || "No company association";
  const initial = companyName.charAt(0).toUpperCase() || "?";
  return `
    <article class="management-card">
      <div class="management-card-top">
        <div class="application-card-top">
          <span class="company-mark" data-color="${companyColors[index % companyColors.length]}" aria-hidden="true">${escapeHtml(initial)}</span>
          <div class="application-title-wrap">
            <button class="application-open-button" type="button" data-open-application="${escapeAttribute(application.id)}"><span class="application-title">${escapeHtml(application.title)}</span></button>
            <p class="application-company">${escapeHtml(companyName)}</p>
          </div>
        </div>
        <span class="status-pill ${statusClass[application.status]}">${escapeHtml(application.status)}</span>
      </div>
      <div class="application-meta">
        <span>${iconMarkup.pin}${escapeHtml(application.location || "Location not set")}</span>
        <span>${iconMarkup.briefcase}${escapeHtml(application.workMode || "Work mode not set")}</span>
        <span>${escapeHtml(application.jobType)}</span>
        <span>${escapeHtml(formatCompensation(application))}</span>
      </div>
      <div class="management-card-footer">
        <select class="quick-status" data-status-application="${escapeAttribute(application.id)}" aria-label="Change status for ${escapeAttribute(application.title)}">${statusOptions(application.status)}</select>
        <time class="application-date" datetime="${escapeAttribute(application.dateApplied || application.dateDiscovered)}">${formatDate(application.dateApplied || application.dateDiscovered)}</time>
      </div>
    </article>`;
}

function renderApplicationRow(application) {
  const companyName = getApplicationCompanyName(application) || "No company association";
  return `
    <tr>
      <td><button class="application-open-button" type="button" data-open-application="${escapeAttribute(application.id)}"><span class="application-title">${escapeHtml(application.title)}</span><span class="application-company">${escapeHtml(companyName)}</span></button></td>
      <td>${escapeHtml(application.jobType)}</td>
      <td>${escapeHtml(application.workMode || "—")}</td>
      <td><select class="quick-status" data-status-application="${escapeAttribute(application.id)}" aria-label="Change status for ${escapeAttribute(application.title)}">${statusOptions(application.status)}</select></td>
      <td>${escapeHtml(formatDate(application.dateApplied || application.dateDiscovered))}</td>
      <td><button class="table-open-button" type="button" data-open-application="${escapeAttribute(application.id)}">Details</button></td>
    </tr>`;
}

function renderApplicationResults() {
  const results = getFilteredApplications();
  const count = document.querySelector("#application-results-count");
  count.textContent = `${results.length} ${results.length === 1 ? "application" : "applications"}${results.length !== state.applications.length ? ` · ${state.applications.length} total` : ""}`;
  const target = document.querySelector("#application-results");
  if (!results.length) {
    target.innerHTML = `
      <div class="applications-empty">
        <strong>${state.applications.length ? "No matching applications" : "Nothing here just yet"}</strong>
        <span>${state.applications.length ? "Try adjusting your search or filters." : "Save an opportunity or add an application to start building your pipeline."}</span>
        ${state.applications.length ? "" : '<button class="primary-button empty-add-button" type="button">Add application</button>'}
      </div>`;
    return;
  }
  if (state.applicationView === "list") {
    target.innerHTML = `
      <div class="application-list-wrap">
        <table class="application-table">
          <thead><tr><th>Opportunity</th><th>Job type</th><th>Work mode</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>${results.map(renderApplicationRow).join("")}</tbody>
        </table>
      </div>`;
  } else {
    target.innerHTML = `<div class="application-results-grid">${results.map(renderManagementCard).join("")}</div>`;
  }
}

function displayValue(value) {
  return value ? escapeHtml(value) : '<span class="detail-unspecified">Not specified</span>';
}

function detailFact(label, value) {
  return `<div class="detail-fact"><dt>${escapeHtml(label)}</dt><dd>${displayValue(value)}</dd></div>`;
}

function safeJobUrl(value) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function renderApplicationDetail(application) {
  const target = document.querySelector("#application-detail-view");
  const companyName = getApplicationCompanyName(application) || "No company association";
  const skills = application.skills.length
    ? `<div class="skill-list">${application.skills.map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join("")}</div>`
    : '<p class="detail-unspecified">No required skills listed.</p>';
  const url = safeJobUrl(application.listingUrl);
  target.innerHTML = `
    <button class="detail-back" type="button" data-back-to-applications>${iconMarkup.chevron}All applications</button>
    <div class="detail-titlebar">
      <div class="detail-identity">
        <span class="detail-company-mark" aria-hidden="true">${escapeHtml(companyName.charAt(0).toUpperCase() || "?")}</span>
        <div>
          <p class="eyebrow">${escapeHtml(application.jobType)} OPPORTUNITY</p>
          <h1>${escapeHtml(application.title)}</h1>
          <p class="detail-company-name">${application.companyId
            ? `<button class="inline-company-link" type="button" data-open-company="${escapeAttribute(application.companyId)}">${escapeHtml(companyName)}</button>`
            : escapeHtml(companyName)}</p>
          <div class="detail-subline"><span>${escapeHtml(application.location || "Location not specified")}</span><span>${escapeHtml(application.workMode || "Work mode not specified")}</span><span>${escapeHtml(formatCompensation(application))}</span></div>
        </div>
      </div>
      <div class="detail-actions">
        <select class="detail-status-select" data-status-application="${escapeAttribute(application.id)}" aria-label="Change application status">${statusOptions(application.status)}</select>
        <button class="secondary-button" type="button" data-edit-application="${escapeAttribute(application.id)}">Edit</button>
        <button class="secondary-button danger-button" type="button" data-delete-application="${escapeAttribute(application.id)}">Delete</button>
      </div>
    </div>
    <div class="detail-layout">
      <div class="detail-column">
        <article class="detail-card"><h2>Job description</h2><p class="detail-job-description">${displayValue(application.description)}</p>${url ? `<a class="detail-listing-link" href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">Open original listing ${iconMarkup.briefcase}</a>` : ""}</article>
        <article class="detail-card"><h2>Required skills</h2>${skills}</article>
        <article class="detail-card"><h2>Personal notes</h2><p>${displayValue(application.notes)}</p></article>
      </div>
      <div class="detail-column">
        <article class="detail-card"><h2>Employment details</h2><dl class="detail-facts">
          ${detailFact("Job type", application.jobType)}
          ${detailFact("Work mode", application.workMode)}
          ${detailFact("Location", application.location)}
          ${detailFact("Stipend / salary", formatCompensation(application))}
          ${detailFact("Internship duration", application.duration)}
          ${detailFact("Hours per day", application.hoursPerDay ? `${application.hoursPerDay} hours` : "")}
        </dl></article>
        <article class="detail-card"><h2>Application details</h2><dl class="detail-facts">
          ${detailFact("Status", application.status)}
          ${detailFact("Source", application.source)}
          ${detailFact("Date discovered", application.dateDiscovered ? formatDate(application.dateDiscovered) : "")}
          ${detailFact("Date applied", application.dateApplied ? formatDate(application.dateApplied) : "")}
          ${detailFact("Application deadline", application.deadline ? formatDate(application.deadline) : "")}
          ${detailFact("Follow-up date", application.followUpDate ? formatDate(application.followUpDate) : "")}
          <div class="detail-fact"><dt>Resume used</dt><dd>${applicationResumeMarkup(application)}</dd></div>
        </dl></article>
      </div>
    </div>`;
}

function applicationResumeMarkup(application) {
  const snapshot = application.resumeSnapshot;
  const name = application.resumeName || (snapshot && snapshot.name) || "";
  if (!name) return displayValue("");
  const score = snapshot && snapshot.atsScore != null ? ` · ATS score ${snapshot.atsScore}/100` : "";
  const fileName = snapshot && snapshot.fileName ? `<small>${escapeHtml(snapshot.fileName)}</small>` : "";
  const resume = state.resumes.find((item) => item.id === application.resumeId);
  const link = resume ? `<button class="inline-resume-link" type="button" data-open-resume="${escapeAttribute(resume.id)}">Open resume</button>` : "";
  return `<span>${escapeHtml(name)}${score ? escapeHtml(score) : ""}</span>${fileName}${link}`;
}

function renderApplicationsPage() {
  if (!document.querySelector("#applications-view")) return;
  renderApplicationFilters();
  const application = state.applications.find((item) => item.id === state.activeApplicationId);
  if (state.applicationMode === "detail" && application) {
    document.querySelector("#applications-list-view").hidden = true;
    document.querySelector("#application-detail-view").hidden = false;
    renderApplicationDetail(application);
  } else {
    state.applicationMode = "list";
    state.activeApplicationId = null;
    document.querySelector("#applications-list-view").hidden = false;
    document.querySelector("#application-detail-view").hidden = true;
    renderApplicationResults();
  }
}

function refreshDataViews() {
  renderDashboard();
  if (state.route === "applications") renderApplicationsPage();
  if (state.route === "companies") renderCompaniesPage();
  if (state.route === "resumes") renderResumesPage();
}

function createApplication(application) {
  const { companyName, ...applicationFields } = application;
  const resolved = ensureCompanyForName(companyName);
  const record = { ...applicationFields, companyId: resolved.company ? resolved.company.id : null, id: application.id || createId("application") };
  if (state.applications.some((item) => item.id === record.id)) {
    showToast("That application ID is already in use.");
    return false;
  }
  const applications = [...state.applications, record];
  if (!persistDataRecords(resolved.companies, applications)) return false;
  state.companies = resolved.companies;
  state.applications = [...state.applications, record];
  refreshDataViews();
  return true;
}

function updateApplication(id, changes) {
  const existing = state.applications.find((application) => application.id === id);
  if (!existing) {
    showToast("This application could not be found.");
    return false;
  }
  const { companyName, ...applicationChanges } = changes;
  const desiredCompanyName = Object.prototype.hasOwnProperty.call(changes, "companyName")
    ? companyName
    : getApplicationCompanyName(existing);
  const resolved = ensureCompanyForName(desiredCompanyName);
  const updated = {
    ...existing,
    ...applicationChanges,
    companyId: resolved.company ? resolved.company.id : null,
    id,
    updatedAt: new Date().toISOString()
  };
  const records = state.applications.map((application) => application.id === id ? updated : application);
  if (!persistDataRecords(resolved.companies, records)) return false;
  state.companies = resolved.companies;
  state.applications = records;
  refreshDataViews();
  return true;
}

function deleteApplication(id) {
  const existing = state.applications.find((application) => application.id === id);
  if (!existing) {
    showToast("This application could not be found.");
    return false;
  }
  const records = state.applications.filter((application) => application.id !== id);
  if (!persistDataRecords(state.companies, records)) return false;
  state.applications = records;
  state.applicationMode = "list";
  state.activeApplicationId = null;
  refreshDataViews();
  return true;
}

function createCompany(companyFields) {
  const name = cleanCompanyName(companyFields.name);
  if (!name) return false;
  if (findCompanyByName(name)) {
    showToast("A company with that name already exists.");
    return false;
  }
  const company = { ...makeCompanyRecord(name), ...companyFields, name, normalizedName: normalizeCompanyName(name) };
  const companies = [...state.companies, company];
  if (!persistDataRecords(companies, state.applications)) return false;
  state.companies = companies;
  refreshDataViews();
  return true;
}

function updateCompany(id, fields) {
  const existing = state.companies.find((company) => company.id === id);
  if (!existing) {
    showToast("This company could not be found.");
    return false;
  }
  const name = cleanCompanyName(fields.name);
  const duplicate = findCompanyByName(name, state.companies.filter((company) => company.id !== id));
  if (duplicate) {
    showToast("Another company already uses that name.");
    return false;
  }
  const updated = { ...existing, ...fields, name, normalizedName: normalizeCompanyName(name), id, updatedAt: new Date().toISOString() };
  const companies = state.companies.map((company) => company.id === id ? updated : company);
  if (!persistDataRecords(companies, state.applications)) return false;
  state.companies = companies;
  refreshDataViews();
  return true;
}

function deleteCompany(id) {
  const company = state.companies.find((item) => item.id === id);
  if (!company) {
    showToast("This company could not be found.");
    return false;
  }
  const companies = state.companies.filter((item) => item.id !== id);
  const applications = state.applications.map((application) => application.companyId === id
    ? { ...application, companyId: null, updatedAt: new Date().toISOString() }
    : application);
  if (!persistDataRecords(companies, applications)) return false;
  state.companies = companies;
  state.applications = applications;
  state.companyMode = "list";
  state.activeCompanyId = null;
  refreshDataViews();
  return true;
}

function companyApplications(companyId) {
  return state.applications.filter((application) => application.companyId === companyId)
    .sort((first, second) => (second.dateApplied || second.dateDiscovered).localeCompare(first.dateApplied || first.dateDiscovered));
}

function companyImageMarkup(company, className = "company-directory-mark") {
  const imageUrl = safeJobUrl(company.logo);
  return imageUrl
    ? `<span class="${className}"><img src="${escapeAttribute(imageUrl)}" alt=""></span>`
    : `<span class="${className}" aria-hidden="true">${escapeHtml(company.name.charAt(0).toUpperCase() || "?")}</span>`;
}

function companyDirectoryCard(company) {
  const applications = companyApplications(company.id);
  const latestDate = applications[0] && (applications[0].dateApplied || applications[0].dateDiscovered);
  const website = safeJobUrl(company.website);
  return `
    <article class="company-directory-card">
      <button class="company-card-main" type="button" data-open-company="${escapeAttribute(company.id)}">
        ${companyImageMarkup(company)}
        <span class="company-card-identity"><strong>${escapeHtml(company.name)}</strong><small>${escapeHtml(company.industry || "Industry not specified")}</small></span>
        <span class="company-card-arrow" aria-hidden="true">→</span>
      </button>
      <div class="company-card-facts">
        <span>${iconMarkup.pin}${escapeHtml(company.location || "Location not specified")}</span>
        <span>${iconMarkup.briefcase}${website ? `<a href="${escapeAttribute(website)}" target="_blank" rel="noopener noreferrer" data-stop-company-open>${escapeHtml(website.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : "Website not specified"}</span>
      </div>
      <div class="company-card-footer">
        <span><strong>${applications.length}</strong> ${applications.length === 1 ? "application" : "applications"}</span>
        <span>Latest ${latestDate ? escapeHtml(formatDate(latestDate)) : "—"}</span>
      </div>
    </article>`;
}

function renderCompaniesDirectory() {
  const query = document.querySelector("#company-search").value.trim().toLocaleLowerCase();
  const companies = companyOptions().filter((company) => {
    const searchable = `${company.name} ${company.industry} ${company.location}`.toLocaleLowerCase();
    return !query || searchable.includes(query);
  });
  document.querySelector("#company-results-count").textContent = `${companies.length} ${companies.length === 1 ? "company" : "companies"}`;
  const target = document.querySelector("#company-results");
  target.innerHTML = companies.length
    ? `<div class="company-grid">${companies.map(companyDirectoryCard).join("")}</div>`
    : `<div class="applications-empty"><strong>${state.companies.length ? "No matching companies" : "Your directory is ready"}</strong><span>${state.companies.length ? "Try another company name, industry, or location." : "Add a company or save an opportunity to build your company directory."}</span>${state.companies.length ? "" : '<button class="primary-button empty-company-add" type="button">Add company</button>'}</div>`;
}

function companyFact(label, value, url) {
  const content = url
    ? `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value)}</a>`
    : displayValue(value);
  return `<div class="company-profile-fact"><dt>${escapeHtml(label)}</dt><dd>${content}</dd></div>`;
}

function renderCompanyProfile(company) {
  const target = document.querySelector("#company-profile-view");
  const applications = companyApplications(company.id);
  const website = safeJobUrl(company.website);
  const careers = safeJobUrl(company.careersUrl);
  const linkedIn = safeJobUrl(company.linkedInUrl);
  const email = company.contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.contactEmail)
    ? `mailto:${company.contactEmail}`
    : "";
  const applicationsMarkup = applications.length
    ? `<div class="company-linked-applications">${applications.map((application) => `
        <article class="company-linked-application">
          <div class="company-linked-identity">
            <button type="button" class="application-open-button" data-open-application="${escapeAttribute(application.id)}"><span class="application-title">${escapeHtml(application.title)}</span></button>
            <span class="application-company">${escapeHtml(application.jobType)} · ${escapeHtml(application.location || "Location not specified")}</span>
          </div>
          <span class="status-pill ${statusClass[application.status]}">${escapeHtml(application.status)}</span>
          <time>${escapeHtml(formatDate(application.dateApplied || application.dateDiscovered))}</time>
        </article>`).join("")}</div>`
    : '<div class="empty-state">No applications are associated with this company yet.</div>';
  target.innerHTML = `
    <button class="detail-back" type="button" data-back-to-companies>${iconMarkup.chevron}All companies</button>
    <div class="company-profile-heading">
      <div class="company-profile-identity">
        ${companyImageMarkup(company, "company-profile-mark")}
        <div>
          <p class="eyebrow">COMPANY PROFILE</p>
          <h1>${escapeHtml(company.name)}</h1>
          <p class="company-profile-industry">${escapeHtml(company.industry || "Industry not specified")}${company.location ? ` · ${escapeHtml(company.location)}` : ""}</p>
        </div>
      </div>
      <div class="company-profile-actions">
        <button class="secondary-button" type="button" data-edit-company="${escapeAttribute(company.id)}">Edit company</button>
        <button class="secondary-button danger-button" type="button" data-delete-company="${escapeAttribute(company.id)}">Delete company</button>
      </div>
    </div>
    <div class="company-profile-grid">
      <article class="detail-card company-about-card">
        <h2>About</h2>
        <p>${displayValue(company.description)}</p>
        <dl class="company-profile-facts">
          ${companyFact("Industry", company.industry)}
          ${companyFact("Location", company.location)}
          ${companyFact("Company size", company.size)}
          ${companyFact("Official website", company.website, website)}
          ${companyFact("Careers page", company.careersUrl, careers)}
        </dl>
      </article>
      <div class="company-profile-side">
        <article class="detail-card">
          <h2>Contact</h2>
          <dl class="company-profile-facts">
            ${companyFact("Contact person", company.contactPerson)}
            ${companyFact("Designation", company.contactDesignation)}
            ${companyFact("Contact email", company.contactEmail, email)}
            ${companyFact("LinkedIn", company.linkedInUrl, linkedIn)}
          </dl>
        </article>
        <article class="detail-card"><h2>Additional notes</h2><p>${displayValue(company.notes)}</p></article>
      </div>
    </div>
    <article class="detail-card company-applications-card">
      <div class="company-applications-heading"><div><p class="eyebrow">YOUR PIPELINE</p><h2>Associated applications</h2></div><span class="pipeline-total">${applications.length} ${applications.length === 1 ? "application" : "applications"}</span></div>
      ${applicationsMarkup}
    </article>`;
}

function renderCompaniesPage() {
  const company = state.companies.find((item) => item.id === state.activeCompanyId);
  if (state.companyMode === "detail" && company) {
    document.querySelector("#company-directory-view").hidden = true;
    document.querySelector("#company-profile-view").hidden = false;
    renderCompanyProfile(company);
  } else {
    state.companyMode = "list";
    state.activeCompanyId = null;
    document.querySelector("#company-directory-view").hidden = false;
    document.querySelector("#company-profile-view").hidden = true;
    renderCompaniesDirectory();
  }
}

function openCompanyProfile(id) {
  if (!state.companies.some((company) => company.id === id)) {
    showToast("This company could not be found.");
    return;
  }
  routeTo("companies", true);
  state.companyMode = "detail";
  state.activeCompanyId = id;
  renderCompaniesPage();
}

function readCompanyForm() {
  return {
    name: cleanCompanyName(document.querySelector("#company-form-name").value),
    logo: document.querySelector("#company-form-logo").value.trim(),
    industry: document.querySelector("#company-form-industry").value.trim(),
    description: document.querySelector("#company-form-description").value.trim(),
    website: document.querySelector("#company-form-website").value.trim(),
    careersUrl: document.querySelector("#company-form-careers-url").value.trim(),
    contactEmail: document.querySelector("#company-form-email").value.trim(),
    contactPerson: document.querySelector("#company-form-contact").value.trim(),
    contactDesignation: document.querySelector("#company-form-designation").value.trim(),
    linkedInUrl: document.querySelector("#company-form-linkedin").value.trim(),
    location: document.querySelector("#company-form-location").value.trim(),
    size: document.querySelector("#company-form-size").value.trim(),
    notes: document.querySelector("#company-form-notes").value.trim()
  };
}

function openAddCompanyDialog() {
  if (state.route !== "companies") routeTo("companies");
  state.editingCompanyId = null;
  const form = document.querySelector("#company-form");
  form.reset();
  document.querySelector("#company-form-id").value = "";
  document.querySelector("#company-dialog-title").textContent = "Add a company";
  document.querySelector("#company-dialog").showModal();
}

function openEditCompanyDialog(id) {
  const company = state.companies.find((item) => item.id === id);
  if (!company) {
    showToast("This company could not be found.");
    return;
  }
  state.editingCompanyId = id;
  document.querySelector("#company-dialog-title").textContent = "Edit company";
  document.querySelector("#company-form-id").value = id;
  document.querySelector("#company-form-name").value = company.name;
  document.querySelector("#company-form-logo").value = company.logo;
  document.querySelector("#company-form-industry").value = company.industry;
  document.querySelector("#company-form-description").value = company.description;
  document.querySelector("#company-form-website").value = company.website;
  document.querySelector("#company-form-careers-url").value = company.careersUrl;
  document.querySelector("#company-form-email").value = company.contactEmail;
  document.querySelector("#company-form-contact").value = company.contactPerson;
  document.querySelector("#company-form-designation").value = company.contactDesignation;
  document.querySelector("#company-form-linkedin").value = company.linkedInUrl;
  document.querySelector("#company-form-location").value = company.location;
  document.querySelector("#company-form-size").value = company.size;
  document.querySelector("#company-form-notes").value = company.notes;
  document.querySelector("#company-dialog").showModal();
}

function requestCompanyDeletion(id) {
  const company = state.companies.find((item) => item.id === id);
  if (!company) {
    showToast("This company could not be found.");
    return;
  }
  state.pendingCompanyDeleteId = id;
  const count = companyApplications(id).length;
  document.querySelector("#company-delete-title").textContent = `Delete ${company.name}?`;
  document.querySelector("#company-delete-copy").textContent = count
    ? `This removes the company profile but keeps its ${count} associated ${count === 1 ? "application" : "applications"}. They will remain in your tracker without a company association. This cannot be undone.`
    : "This company has no associated applications. Its profile will be permanently removed.";
  document.querySelector("#confirm-company-delete").textContent = count
    ? `Delete company & keep ${count} ${count === 1 ? "application" : "applications"}`
    : "Delete company";
  document.querySelector("#company-delete-dialog").showModal();
}

function handleCompanyViewClick(event) {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.closest("[data-stop-company-open]")) return;
  if (target.matches("[data-open-company]")) openCompanyProfile(target.dataset.openCompany);
  else if (target.matches("[data-edit-company]")) openEditCompanyDialog(target.dataset.editCompany);
  else if (target.matches("[data-delete-company]")) requestCompanyDeletion(target.dataset.deleteCompany);
  else if (target.matches("[data-open-application]")) openApplicationDetail(target.dataset.openApplication);
  else if (target.matches("[data-back-to-companies]")) {
    state.companyMode = "list";
    state.activeCompanyId = null;
    renderCompaniesPage();
  } else if (target.matches(".empty-company-add")) openAddCompanyDialog();
}

function initCompanyManagement() {
  const view = document.querySelector("#companies-view");
  view.addEventListener("input", (event) => {
    if (event.target.id === "company-search") renderCompaniesDirectory();
  });
  view.addEventListener("click", handleCompanyViewClick);
  document.querySelector("#add-company-button").addEventListener("click", openAddCompanyDialog);
  const companyDialog = document.querySelector("#company-dialog");
  const closeCompanyDialog = () => {
    companyDialog.close();
    state.editingCompanyId = null;
  };
  document.querySelector(".company-dialog-close").addEventListener("click", closeCompanyDialog);
  document.querySelector("#cancel-company-form").addEventListener("click", closeCompanyDialog);
  companyDialog.addEventListener("click", (event) => {
    if (event.target === companyDialog) closeCompanyDialog();
  });
  document.querySelector("#company-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const fields = readCompanyForm();
    const editing = Boolean(state.editingCompanyId);
    const saved = editing ? updateCompany(state.editingCompanyId, fields) : createCompany(fields);
    if (!saved) return;
    closeCompanyDialog();
    showToast(editing ? "Company profile updated." : "Company added.");
  });
  const deleteDialog = document.querySelector("#company-delete-dialog");
  document.querySelector("#cancel-company-delete").addEventListener("click", () => {
    state.pendingCompanyDeleteId = null;
    deleteDialog.close();
  });
  document.querySelector("#confirm-company-delete").addEventListener("click", () => {
    const id = state.pendingCompanyDeleteId;
    if (!id) return;
    if (deleteCompany(id)) {
      state.pendingCompanyDeleteId = null;
      deleteDialog.close();
      showToast("Company deleted. Associated applications were kept.");
    }
  });
  deleteDialog.addEventListener("click", (event) => {
    if (event.target === deleteDialog) {
      state.pendingCompanyDeleteId = null;
      deleteDialog.close();
    }
  });
}

function openResumeDatabase() {
  if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB is unavailable in this browser."));
  if (!state.resumeDatabasePromise) {
    state.resumeDatabasePromise = new Promise((resolve, reject) => {
      let request;
      try {
        request = indexedDB.open(RESUME_DATABASE_NAME, RESUME_DATABASE_VERSION);
      } catch (error) {
        state.resumeDatabasePromise = null;
        reject(error);
        return;
      }
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(RESUME_FILE_STORE)) {
          database.createObjectStore(RESUME_FILE_STORE, { keyPath: "id" });
        }
      };
      request.onerror = () => {
        state.resumeDatabasePromise = null;
        reject(request.error || new Error("Could not open resume storage."));
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          state.resumeDatabasePromise = null;
        };
        resolve(database);
      };
    });
  }
  return state.resumeDatabasePromise;
}

async function resumeFileRequest(method, value) {
  const database = await openResumeDatabase();
  return new Promise((resolve, reject) => {
    let transaction;
    let request;
    try {
      transaction = database.transaction(RESUME_FILE_STORE, method === "get" ? "readonly" : "readwrite");
      const store = transaction.objectStore(RESUME_FILE_STORE);
      request = method === "put" ? store.put(value) : method === "delete" ? store.delete(value) : store.get(value);
    } catch (error) {
      reject(error);
      return;
    }
    let result;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error || new Error("Resume file operation failed."));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error("Resume file transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("Resume file transaction was aborted."));
  });
}

async function hasPdfHeader(file) {
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return header.length === 5 && String.fromCharCode(...header) === "%PDF-";
}

async function validateResumeFile(file) {
  if (!file) {
    showToast("Choose a PDF file to upload.");
    return false;
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    showToast("Only PDF resumes can be uploaded.");
    return false;
  }
  if (file.size > RESUME_MAX_FILE_SIZE) {
    showToast("Resume files must be 20 MB or smaller.");
    return false;
  }
  if (file.size === 0 || !await hasPdfHeader(file)) {
    showToast("This file is not a valid PDF.");
    return false;
  }
  return true;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Size unavailable";
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resumeApplicationCount(id) {
  return state.applications.filter((application) => application.resumeId === id).length;
}

function resumeCard(resume) {
  const score = resume.atsScore == null
    ? '<span class="resume-score resume-score-empty">ATS score not entered</span>'
    : `<span class="resume-score">ATS ${resume.atsScore}/100</span>`;
  const count = resumeApplicationCount(resume.id);
  return `
    <article class="resume-card">
      <div class="resume-card-top">
        <span class="resume-document-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5v5h5M8.5 13h7m-7 3.5h7"/></svg><small>PDF</small></span>
        <div class="resume-card-info">
          <button type="button" class="resume-title-button" data-open-resume="${escapeAttribute(resume.id)}">${escapeHtml(resume.name)}</button>
          <span class="resume-file-name" title="${escapeAttribute(resume.fileName)}">${escapeHtml(resume.fileName)}</span>
        </div>
        <button class="resume-more-button" type="button" data-edit-resume="${escapeAttribute(resume.id)}" aria-label="Edit ${escapeAttribute(resume.name)}">Edit</button>
      </div>
      <div class="resume-card-meta"><span>Uploaded ${escapeHtml(formatDate(resume.uploadedAt.slice(0, 10)))}</span>${score}</div>
      <div class="resume-card-footer"><span>${count} ${count === 1 ? "application" : "applications"}</span><button type="button" class="resume-preview-button" data-preview-resume="${escapeAttribute(resume.id)}">Preview PDF</button></div>
    </article>`;
}

function renderResumeDirectory() {
  const query = document.querySelector("#resume-search").value.trim().toLocaleLowerCase();
  const resumes = [...state.resumes]
    .filter((resume) => `${resume.name} ${resume.fileName} ${resume.notes}`.toLocaleLowerCase().includes(query))
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
  document.querySelector("#resume-results-count").textContent = `${resumes.length} ${resumes.length === 1 ? "resume" : "resumes"}`;
  document.querySelector("#resume-results").innerHTML = resumes.length
    ? `<div class="resume-grid">${resumes.map(resumeCard).join("")}</div>`
    : `<div class="applications-empty"><strong>${state.resumes.length ? "No matching resumes" : "Your resume library is ready"}</strong><span>${state.resumes.length ? "Try another name or file name." : "Upload a PDF to keep your resume versions ready for applications."}</span>${state.resumes.length ? "" : '<button class="primary-button empty-resume-upload" type="button">Upload a resume</button>'}</div>`;
}

function resumeApplicationRows(resume) {
  const applications = state.applications.filter((application) => application.resumeId === resume.id)
    .sort((first, second) => (second.dateApplied || second.dateDiscovered).localeCompare(first.dateApplied || first.dateDiscovered));
  if (!applications.length) return '<div class="empty-state">No applications use this resume yet.</div>';
  return `<div class="resume-application-list">${applications.map((application) => `
    <article class="resume-application-row">
      <div class="resume-application-identity">
        <button type="button" class="application-open-button" data-open-application="${escapeAttribute(application.id)}"><span class="application-title">${escapeHtml(application.title)}</span></button>
        <span class="application-company">${escapeHtml(getApplicationCompanyName(application) || "No company association")}</span>
      </div>
      <time>${escapeHtml(application.dateApplied ? formatDate(application.dateApplied) : "Not applied")}</time>
      <span class="status-pill ${statusClass[application.status]}">${escapeHtml(application.status)}</span>
    </article>`).join("")}</div>`;
}

function renderResumeDetail(resume) {
  const target = document.querySelector("#resume-detail-view");
  target.innerHTML = `
    <button class="detail-back" type="button" data-back-to-resumes>${iconMarkup.chevron}All resumes</button>
    <div class="resume-detail-heading">
      <div class="resume-detail-identity">
        <span class="resume-document-mark resume-document-mark-large" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5v5h5M8.5 13h7m-7 3.5h7"/></svg><small>PDF</small></span>
        <div><p class="eyebrow">RESUME DETAILS</p><h1>${escapeHtml(resume.name)}</h1><p>${escapeHtml(resume.fileName)} · Uploaded ${escapeHtml(formatDate(resume.uploadedAt.slice(0, 10)))}</p></div>
      </div>
      <div class="resume-detail-actions">
        <button class="primary-button" type="button" data-preview-resume="${escapeAttribute(resume.id)}">Preview PDF</button>
        <button class="secondary-button" type="button" data-edit-resume="${escapeAttribute(resume.id)}">Edit details</button>
        <button class="secondary-button danger-button" type="button" data-delete-resume="${escapeAttribute(resume.id)}">Delete</button>
      </div>
    </div>
    <div class="resume-detail-grid">
      <article class="detail-card">
        <h2>Resume information</h2>
        <dl class="resume-facts">
          <div><dt>ATS score</dt><dd>${resume.atsScore == null ? "Not entered" : `${resume.atsScore}/100 · entered manually`}</dd></div>
          <div><dt>File size</dt><dd>${escapeHtml(formatFileSize(resume.size))}</dd></div>
          <div><dt>Applications using this resume</dt><dd>${resumeApplicationCount(resume.id)}</dd></div>
        </dl>
        <h3 class="resume-notes-heading">Notes</h3><p class="resume-notes">${displayValue(resume.notes)}</p>
      </article>
      <article class="detail-card resume-usage-card"><div class="resume-usage-heading"><h2>Application history</h2><span class="pipeline-total">${resumeApplicationCount(resume.id)} linked</span></div>${resumeApplicationRows(resume)}</article>
    </div>`;
}

function renderResumesPage() {
  const resume = state.resumes.find((item) => item.id === state.activeResumeId);
  if (state.resumeMode === "detail" && resume) {
    document.querySelector("#resume-directory-view").hidden = true;
    document.querySelector("#resume-detail-view").hidden = false;
    renderResumeDetail(resume);
  } else {
    state.resumeMode = "list";
    state.activeResumeId = null;
    document.querySelector("#resume-directory-view").hidden = false;
    document.querySelector("#resume-detail-view").hidden = true;
    renderResumeDirectory();
  }
}

function openResumeDetail(id) {
  if (!state.resumes.some((resume) => resume.id === id)) {
    showToast("This resume could not be found.");
    return;
  }
  routeTo("resumes", true);
  state.resumeMode = "detail";
  state.activeResumeId = id;
  renderResumesPage();
}

async function openResumePreview(id) {
  const resume = state.resumes.find((item) => item.id === id);
  if (!resume) {
    showToast("This resume could not be found.");
    return;
  }
  try {
    const stored = await resumeFileRequest("get", id);
    const file = stored && stored.file;
    if (!file) {
      showToast("The PDF file is unavailable. Its saved metadata and application history are still here.");
      return;
    }
    if (!await hasPdfHeader(file)) {
      showToast("This stored file is not a valid PDF.");
      return;
    }
    if (state.resumeObjectUrl) URL.revokeObjectURL(state.resumeObjectUrl);
    state.resumeObjectUrl = URL.createObjectURL(file);
    document.querySelector("#resume-preview-title").textContent = resume.name;
    document.querySelector("#resume-preview-frame").src = state.resumeObjectUrl;
    document.querySelector("#resume-preview-dialog").showModal();
  } catch (error) {
    console.error("Could not preview the saved resume.", error);
    showToast("Could not open this PDF. Check browser storage and try again.");
  }
}

function openResumeForm(context = "library") {
  state.editingResumeId = null;
  state.resumeUploadContext = context;
  const form = document.querySelector("#resume-form");
  form.reset();
  document.querySelector("#resume-dialog-title").textContent = "Upload a resume";
  document.querySelector("#save-resume-button").textContent = "Save resume";
  document.querySelector("#resume-file-field").hidden = false;
  document.querySelector("#resume-file").required = true;
  document.querySelector("#resume-edit-file").hidden = true;
  document.querySelector("#resume-dialog").showModal();
}

function openEditResumeForm(id) {
  const resume = state.resumes.find((item) => item.id === id);
  if (!resume) {
    showToast("This resume could not be found.");
    return;
  }
  state.editingResumeId = id;
  const form = document.querySelector("#resume-form");
  form.reset();
  document.querySelector("#resume-dialog-title").textContent = "Edit resume details";
  document.querySelector("#save-resume-button").textContent = "Save changes";
  document.querySelector("#resume-file-field").hidden = true;
  document.querySelector("#resume-file").required = false;
  document.querySelector("#resume-edit-file").textContent = `PDF file: ${resume.fileName}`;
  document.querySelector("#resume-edit-file").hidden = false;
  document.querySelector("#resume-name").value = resume.name;
  document.querySelector("#resume-score").value = resume.atsScore == null ? "" : resume.atsScore;
  document.querySelector("#resume-notes").value = resume.notes;
  document.querySelector("#resume-dialog").showModal();
}

function readResumeForm() {
  const rawScore = document.querySelector("#resume-score").value;
  return {
    name: document.querySelector("#resume-name").value.trim(),
    atsScore: rawScore === "" ? null : Number(rawScore),
    notes: document.querySelector("#resume-notes").value.trim()
  };
}

function persistResumeRecords(records) {
  try {
    localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error("Could not save resume metadata.", error);
    showToast("Resume details could not be saved. Check available browser storage.");
    return false;
  }
}

function persistResumeDeletionRecords(resumes, applications) {
  let previousResumes;
  let previousApplications;
  try {
    previousResumes = localStorage.getItem(RESUME_STORAGE_KEY);
    previousApplications = localStorage.getItem(STORAGE_KEY);
    localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(resumes));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    return { previousResumes, previousApplications };
  } catch (error) {
    console.error("Could not save resume deletion.", error);
    try {
      if (previousResumes === null) localStorage.removeItem(RESUME_STORAGE_KEY);
      else if (previousResumes !== undefined) localStorage.setItem(RESUME_STORAGE_KEY, previousResumes);
      if (previousApplications === null) localStorage.removeItem(STORAGE_KEY);
      else if (previousApplications !== undefined) localStorage.setItem(STORAGE_KEY, previousApplications);
    } catch (rollbackError) {
      console.error("Could not restore data after resume deletion failed.", rollbackError);
    }
    showToast("The resume could not be deleted because browser storage failed.");
    return null;
  }
}

function restoreResumeDeletionRecords(previous) {
  try {
    if (previous.previousResumes === null) localStorage.removeItem(RESUME_STORAGE_KEY);
    else localStorage.setItem(RESUME_STORAGE_KEY, previous.previousResumes);
    if (previous.previousApplications === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, previous.previousApplications);
    return true;
  } catch (error) {
    console.error("Could not restore data after resume file deletion failed.", error);
    return false;
  }
}

async function saveResumeFromForm() {
  const values = readResumeForm();
  if (state.editingResumeId) {
    const existing = state.resumes.find((resume) => resume.id === state.editingResumeId);
    if (!existing) {
      showToast("This resume could not be found.");
      return false;
    }
    const updated = { ...existing, ...values };
    const records = state.resumes.map((resume) => resume.id === existing.id ? updated : resume);
    if (!persistResumeRecords(records)) return false;
    state.resumes = records;
    if (state.route === "resumes") renderResumesPage();
    return true;
  }

  const file = document.querySelector("#resume-file").files[0];
  if (!await validateResumeFile(file)) return false;
  const id = createId("resume");
  const record = {
    id,
    ...values,
    fileName: file.name,
    uploadedAt: new Date().toISOString(),
    size: file.size
  };
  await resumeFileRequest("put", { id, file });
  const records = [...state.resumes, record];
  if (!persistResumeRecords(records)) {
    try {
      await resumeFileRequest("delete", id);
    } catch (error) {
      console.error("Could not remove an unregistered resume file.", error);
    }
    return false;
  }
  state.resumes = records;
  if (state.resumeUploadContext === "application") {
    renderResumeSelect(id);
  } else {
    if (state.route !== "resumes") routeTo("resumes");
    state.resumeMode = "detail";
    state.activeResumeId = id;
    renderResumesPage();
  }
  return true;
}

function requestResumeDeletion(id) {
  const resume = state.resumes.find((item) => item.id === id);
  if (!resume) {
    showToast("This resume could not be found.");
    return;
  }
  state.pendingResumeDeleteId = id;
  const count = resumeApplicationCount(id);
  document.querySelector("#resume-delete-title").textContent = `Delete ${resume.name}?`;
  document.querySelector("#resume-delete-copy").textContent = count
    ? `This removes the PDF and resume entry but keeps ${count} ${count === 1 ? "application" : "applications"}. Each keeps a snapshot of the resume name and metadata. This cannot be undone.`
    : "This removes the PDF and resume entry. This cannot be undone.";
  document.querySelector("#resume-delete-dialog").showModal();
}

async function deleteResume(id) {
  const resume = state.resumes.find((item) => item.id === id);
  if (!resume) {
    showToast("This resume could not be found.");
    return false;
  }
  const resumes = state.resumes.filter((item) => item.id !== id);
  const applications = state.applications.map((application) => {
    if (application.resumeId !== id) return application;
    const snapshot = application.resumeSnapshot || resumeSnapshotFromRecord(resume);
    return {
      ...application,
      resumeId: "",
      resumeName: application.resumeName || snapshot.name,
      resumeSnapshot: snapshot,
      updatedAt: new Date().toISOString()
    };
  });
  const previous = persistResumeDeletionRecords(resumes, applications);
  if (!previous) return false;
  try {
    await resumeFileRequest("delete", id);
  } catch (error) {
    console.error("Could not delete the PDF file from IndexedDB.", error);
    if (!restoreResumeDeletionRecords(previous)) {
      showToast("Resume deletion failed and stored data could not be fully restored. Reload to check the library.");
    } else {
      showToast("The PDF could not be deleted from browser storage. The resume was kept.");
    }
    return false;
  }
  state.resumes = resumes;
  state.applications = applications;
  state.resumeMode = "list";
  state.activeResumeId = null;
  refreshDataViews();
  return true;
}

function handleResumeViewClick(event) {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.matches("[data-open-resume]")) openResumeDetail(target.dataset.openResume);
  else if (target.matches("[data-preview-resume]")) openResumePreview(target.dataset.previewResume);
  else if (target.matches("[data-edit-resume]")) openEditResumeForm(target.dataset.editResume);
  else if (target.matches("[data-delete-resume]")) requestResumeDeletion(target.dataset.deleteResume);
  else if (target.matches("[data-open-application]")) openApplicationDetail(target.dataset.openApplication);
  else if (target.matches("[data-back-to-resumes]")) {
    state.resumeMode = "list";
    state.activeResumeId = null;
    renderResumesPage();
  } else if (target.matches(".empty-resume-upload")) openResumeForm();
}

function initResumeManagement() {
  const view = document.querySelector("#resumes-view");
  view.addEventListener("input", (event) => {
    if (event.target.id === "resume-search") renderResumeDirectory();
  });
  view.addEventListener("click", handleResumeViewClick);
  document.querySelector("#add-resume-button").addEventListener("click", () => openResumeForm());
  document.querySelector("#upload-resume-from-application").addEventListener("click", () => openResumeForm("application"));
  document.querySelector("#resume-file").addEventListener("change", (event) => {
    const nameInput = document.querySelector("#resume-name");
    if (!nameInput.value.trim() && event.target.files[0]) {
      nameInput.value = event.target.files[0].name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
    }
  });
  const dialog = document.querySelector("#resume-dialog");
  const closeDialog = () => {
    dialog.close();
    state.editingResumeId = null;
  };
  document.querySelector(".resume-dialog-close").addEventListener("click", closeDialog);
  document.querySelector("#cancel-resume-form").addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
  document.querySelector("#resume-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const button = document.querySelector("#save-resume-button");
    const editing = Boolean(state.editingResumeId);
    const context = state.resumeUploadContext;
    button.disabled = true;
    try {
      if (await saveResumeFromForm()) {
        closeDialog();
        showToast(editing ? "Resume details updated." : context === "application" ? "Resume uploaded and selected for this application." : "Resume uploaded.");
      }
    } catch (error) {
      console.error("Could not save the resume.", error);
      showToast("Could not save this resume. Check browser storage and try again.");
    } finally {
      button.disabled = false;
    }
  });

  const previewDialog = document.querySelector("#resume-preview-dialog");
  const closePreview = () => {
    previewDialog.close();
    document.querySelector("#resume-preview-frame").src = "about:blank";
    if (state.resumeObjectUrl) URL.revokeObjectURL(state.resumeObjectUrl);
    state.resumeObjectUrl = null;
  };
  document.querySelector(".resume-preview-close").addEventListener("click", closePreview);
  previewDialog.addEventListener("close", () => {
    if (state.resumeObjectUrl) URL.revokeObjectURL(state.resumeObjectUrl);
    state.resumeObjectUrl = null;
    document.querySelector("#resume-preview-frame").src = "about:blank";
  });
  document.querySelector("#cancel-resume-delete").addEventListener("click", () => {
    state.pendingResumeDeleteId = null;
    document.querySelector("#resume-delete-dialog").close();
  });
  document.querySelector("#confirm-resume-delete").addEventListener("click", async () => {
    const id = state.pendingResumeDeleteId;
    if (!id) return;
    const button = document.querySelector("#confirm-resume-delete");
    button.disabled = true;
    try {
      if (await deleteResume(id)) {
        state.pendingResumeDeleteId = null;
        document.querySelector("#resume-delete-dialog").close();
        showToast("Resume deleted. Application history was kept.");
      }
    } finally {
      button.disabled = false;
    }
  });
  document.querySelector("#resume-delete-dialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      state.pendingResumeDeleteId = null;
      event.currentTarget.close();
    }
  });
}

function updateApplicationStatus(id, status) {
  if (!statusOrder.includes(status)) {
    showToast("Choose a valid application status.");
    return;
  }
  const application = state.applications.find((item) => item.id === id);
  if (!application) {
    showToast("This application could not be found.");
    return;
  }
  const changes = { status };
  if (application.status === "Saved" && status !== "Saved" && !application.dateApplied) {
    changes.dateApplied = localDateString();
  }
  if (updateApplication(id, changes)) showToast(`Status updated to ${status}.`);
}

function resumeSnapshotFromRecord(resume) {
  return {
    name: resume.name,
    fileName: resume.fileName,
    uploadedAt: resume.uploadedAt,
    atsScore: resume.atsScore
  };
}

function resumeScoreLabel(score) {
  return score == null ? "ATS score not entered" : `ATS ${score}/100`;
}

function renderResumeSelect(selectedId, snapshot) {
  const select = document.querySelector("#form-resume");
  select.innerHTML = "";
  select.add(new Option("No resume selected", ""));
  state.resumes.forEach((resume) => {
    select.add(new Option(`${resume.name} — ${resumeScoreLabel(resume.atsScore)}`, resume.id));
  });
  if (selectedId && !state.resumes.some((resume) => resume.id === selectedId)) {
    const name = (snapshot && snapshot.name) || "Previously used resume";
    select.add(new Option(`${name} — file unavailable`, selectedId));
  }
  select.value = selectedId || "";
  syncResumeSelectionSummary();
}

function syncResumeSelectionSummary() {
  const id = document.querySelector("#form-resume").value;
  const resume = state.resumes.find((item) => item.id === id);
  document.querySelector("#resume-selection-summary").textContent = resume
    ? `${resume.name} · ${resumeScoreLabel(resume.atsScore)}`
    : "No resume selected";
}

function populateApplicationFormOptions(current) {
  const statusSelect = document.querySelector("#form-status");
  statusSelect.innerHTML = statusOrder.map((status) => `<option value="${status}">${status}</option>`).join("");
  document.querySelector("#company-suggestions").innerHTML = companyOptions()
    .map((company) => `<option value="${escapeAttribute(company.name)}"></option>`).join("");
  const sourceSelect = document.querySelector("#form-source");
  [...sourceSelect.options].filter((option) => option.dataset.custom === "true").forEach((option) => option.remove());
  if (current && current.source && ![...sourceSelect.options].some((option) => option.value === current.source)) {
    const option = new Option(current.source, current.source);
    option.dataset.custom = "true";
    sourceSelect.add(option);
  }

  renderResumeSelect(current && current.resumeId, current && current.resumeSnapshot);
  statusSelect.value = current ? current.status : "Saved";
  if (current) {
    sourceSelect.value = current.source;
  }
  document.querySelector("#custom-source-field").hidden = sourceSelect.value !== "Other";
}

function setFormValue(id, value) {
  document.getElementById(id).value = value == null ? "" : value;
}

function syncApplicationDateRequirement() {
  const required = document.querySelector("#form-status").value !== "Saved";
  const dateInput = document.querySelector("#form-date-applied");
  dateInput.required = required;
  document.querySelector(".application-date-required").hidden = !required;
}

function syncCompanyNameRequirement(required) {
  document.querySelector("#form-company").required = required;
  document.querySelector(".company-name-required").hidden = !required;
}

function openAddApplicationDialog() {
  if (state.route !== "applications") routeTo("applications");
  state.editingApplicationId = null;
  state.formIntent = "saved";
  const form = document.querySelector("#application-form");
  form.reset();
  syncCompanyNameRequirement(true);
  document.querySelector("#application-dialog-title").textContent = "Add an application";
  document.querySelector("#application-choice-step").hidden = false;
  form.hidden = true;
  setFormValue("application-id", "");
  setFormValue("application-intent", "");
  populateApplicationFormOptions(null);
  setFormValue("form-date-discovered", localDateString());
  document.querySelector("#application-dialog").showModal();
}

function selectApplicationIntent(intent) {
  state.formIntent = intent;
  const form = document.querySelector("#application-form");
  document.querySelector("#application-choice-step").hidden = true;
  form.hidden = false;
  document.querySelector("#application-dialog-title").textContent = intent === "saved" ? "Save opportunity" : "Record an application";
  setFormValue("application-intent", intent);
  document.querySelector("#form-status").value = intent === "saved" ? "Saved" : "Applied";
  document.querySelector("#form-status").disabled = intent === "saved";
  if (intent === "applied") setFormValue("form-date-applied", localDateString());
  syncApplicationDateRequirement();
  document.querySelector("#form-title").focus();
}

function openEditApplicationDialog(id) {
  const application = state.applications.find((item) => item.id === id);
  if (!application) {
    showToast("This application could not be found.");
    return;
  }
  state.editingApplicationId = id;
  state.formIntent = "edit";
  const form = document.querySelector("#application-form");
  form.reset();
  document.querySelector("#application-dialog-title").textContent = "Edit application";
  document.querySelector("#application-choice-step").hidden = true;
  form.hidden = false;
  document.querySelector("#form-status").disabled = false;
  populateApplicationFormOptions(application);
  syncCompanyNameRequirement(Boolean(application.companyId));
  setFormValue("application-id", application.id);
  setFormValue("application-intent", "edit");
  setFormValue("form-title", application.title);
  setFormValue("form-job-type", application.jobType);
  setFormValue("form-work-mode", application.workMode);
  setFormValue("form-description", application.description);
  setFormValue("form-listing-url", application.listingUrl);
  setFormValue("form-skills", application.skills.join(", "));
  setFormValue("form-location", application.location);
  setFormValue("form-compensation", application.compensationAmount);
  setFormValue("form-currency", application.currency);
  setFormValue("form-frequency", application.paymentFrequency === "Not specified" ? "" : application.paymentFrequency);
  setFormValue("form-duration", application.duration);
  setFormValue("form-hours", application.hoursPerDay);
  setFormValue("form-company", getApplicationCompanyName(application));
  setFormValue("form-status", application.status);
  setFormValue("form-source", application.source);
  setFormValue("form-date-discovered", application.dateDiscovered);
  setFormValue("form-date-applied", application.dateApplied);
  setFormValue("form-deadline", application.deadline);
  setFormValue("form-follow-up", application.followUpDate);
  setFormValue("form-resume", application.resumeId);
  setFormValue("form-notes", application.notes);
  syncApplicationDateRequirement();
  document.querySelector("#application-dialog").showModal();
}

function readApplicationForm() {
  const form = document.querySelector("#application-form");
  const values = Object.fromEntries(new FormData(form).entries());
  const companyName = String(values.companyName || "").trim();
  const status = state.formIntent === "saved" ? "Saved" : values.status;
  const existing = state.editingApplicationId
    ? state.applications.find((application) => application.id === state.editingApplicationId)
    : null;
  const selectedResume = state.resumes.find((resume) => resume.id === values.resumeId);
  const resumeSnapshot = selectedResume
    ? resumeSnapshotFromRecord(selectedResume)
    : (existing && existing.resumeSnapshot) || null;
  const now = new Date().toISOString();
  return {
    ...(existing || {}),
    id: state.editingApplicationId || createId("application"),
    companyName,
    title: String(values.title || "").trim(),
    jobType: values.jobType,
    description: String(values.description || "").trim(),
    listingUrl: String(values.listingUrl || "").trim(),
    skills: String(values.skills || "").split(/[,;\n]/).map((skill) => skill.trim()).filter(Boolean),
    location: String(values.location || "").trim(),
    workMode: values.workMode,
    compensationAmount: String(values.compensationAmount || ""),
    currency: values.currency,
    paymentFrequency: values.paymentFrequency || "Not specified",
    duration: String(values.duration || "").trim(),
    hoursPerDay: String(values.hoursPerDay || ""),
    status,
    source: values.source === "Other" && String(values.sourceCustom || "").trim()
      ? String(values.sourceCustom).trim()
      : values.source,
    dateDiscovered: values.dateDiscovered || "",
    dateApplied: values.dateApplied || "",
    deadline: values.deadline || "",
    followUpDate: values.followUpDate || "",
    resumeId: values.resumeId || "",
    resumeName: selectedResume ? selectedResume.name : (existing && existing.resumeName) || (resumeSnapshot && resumeSnapshot.name) || "",
    resumeSnapshot,
    notes: String(values.notes || "").trim(),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };
}

function openApplicationDetail(id) {
  if (!state.applications.some((application) => application.id === id)) {
    showToast("This application could not be found.");
    return;
  }
  routeTo("applications", true);
  state.applicationMode = "detail";
  state.activeApplicationId = id;
  renderApplicationsPage();
}

function handleApplicationViewClick(event) {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.matches("[data-open-application]")) openApplicationDetail(target.dataset.openApplication);
  else if (target.matches("[data-open-company]") && target.dataset.openCompany) openCompanyProfile(target.dataset.openCompany);
  else if (target.matches("[data-open-resume]")) openResumeDetail(target.dataset.openResume);
  else if (target.matches("[data-edit-application]")) openEditApplicationDialog(target.dataset.editApplication);
  else if (target.matches("[data-delete-application]")) {
    const application = state.applications.find((item) => item.id === target.dataset.deleteApplication);
    if (application && window.confirm(`Delete "${application.title}" at ${getApplicationCompanyName(application) || "No company"}? This cannot be undone.`)) {
      if (deleteApplication(application.id)) showToast("Application deleted.");
    }
  } else if (target.matches("[data-back-to-applications]")) {
    state.applicationMode = "list";
    state.activeApplicationId = null;
    renderApplicationsPage();
  } else if (target.matches(".empty-add-button")) openAddApplicationDialog();
}

function initApplicationManagement() {
  const view = document.querySelector("#applications-view");
  view.addEventListener("input", (event) => {
    if (event.target.id === "applications-search") renderApplicationResults();
  });
  view.addEventListener("change", (event) => {
    const target = event.target;
    if (["filter-status", "filter-company", "filter-job-type", "filter-work-mode", "filter-source", "sort-applications"].includes(target.id)) {
      renderApplicationResults();
    } else if (target.matches("[data-status-application]")) {
      updateApplicationStatus(target.dataset.statusApplication, target.value);
    }
  });
  view.addEventListener("click", handleApplicationViewClick);
  document.querySelector("#add-application-button").addEventListener("click", openAddApplicationDialog);
  document.querySelectorAll("[data-application-intent]").forEach((button) => {
    button.addEventListener("click", () => selectApplicationIntent(button.dataset.applicationIntent));
  });
  document.querySelector("#form-status").addEventListener("change", syncApplicationDateRequirement);
  document.querySelector("#form-resume").addEventListener("change", syncResumeSelectionSummary);
  document.querySelector("#form-source").addEventListener("change", (event) => {
    document.querySelector("#custom-source-field").hidden = event.target.value !== "Other";
  });
  const dialog = document.querySelector("#application-dialog");
  const closeDialog = () => {
    dialog.close();
    state.editingApplicationId = null;
  };
  document.querySelector(".dialog-close").addEventListener("click", closeDialog);
  document.querySelector("#cancel-application-form").addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
  document.querySelector("#application-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const application = readApplicationForm();
    const editing = Boolean(state.editingApplicationId);
    const saved = editing
      ? updateApplication(state.editingApplicationId, application)
      : createApplication(application);
    if (!saved) return;
    closeDialog();
    showToast(editing ? "Application updated." : "Application saved.");
  });
  document.querySelectorAll("[data-app-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.applicationView = button.dataset.appView;
      document.querySelectorAll("[data-app-view]").forEach((viewButton) => {
        const selected = viewButton.dataset.appView === state.applicationView;
        viewButton.classList.toggle("is-selected", selected);
        viewButton.setAttribute("aria-pressed", String(selected));
      });
      renderApplicationResults();
    });
  });
}

const pageDescriptions = {
  settings: ["Settings", "Theme preferences and workspace options will live here as ApplyTrack grows.", "settings"]
};

function routeTo(route, preserveApplicationMode) {
  state.route = route;
  const dashboard = route === "dashboard";
  const applications = route === "applications";
  const companies = route === "companies";
  const resumes = route === "resumes";
  if (applications && !preserveApplicationMode) {
    state.applicationMode = "list";
    state.activeApplicationId = null;
  }
  if (companies && !preserveApplicationMode) {
    state.companyMode = "list";
    state.activeCompanyId = null;
  }
  if (resumes && !preserveApplicationMode) {
    state.resumeMode = "list";
    state.activeResumeId = null;
  }
  const toggleView = (selector, visible) => {
    const view = document.querySelector(selector);
    if (view) view.classList.toggle("is-visible", visible);
  };
  toggleView("#dashboard-view", dashboard);
  toggleView("#applications-view", applications);
  toggleView("#companies-view", companies);
  toggleView("#resumes-view", resumes);
  toggleView("#placeholder-view", !dashboard && !applications && !companies && !resumes);
  document.querySelectorAll(".nav-link[data-route]").forEach((link) => {
    const active = link.dataset.route === route;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  const [title, copy, icon] = applications
    ? ["Applications", "A focused home for every opportunity you're pursuing.", "opportunities"]
    : companies
      ? ["Companies", "Your company directory and profiles.", "companies"]
      : resumes
        ? ["Resumes", "Your resume library and application history.", "resumes"]
        : pageDescriptions[route] || pageDescriptions.settings;
  if (!dashboard && !applications && !companies && !resumes) {
    const placeholderTitle = document.querySelector("#placeholder-title");
    const placeholderCopy = document.querySelector("#placeholder-copy");
    const placeholderMark = document.querySelector("#placeholder-mark");
    if (placeholderTitle) placeholderTitle.textContent = title;
    if (placeholderCopy) placeholderCopy.textContent = copy;
    if (placeholderMark) placeholderMark.innerHTML = iconMarkup[icon] || iconMarkup.opportunities;
  }
  const breadcrumb = document.querySelector("#breadcrumb-current");
  if (breadcrumb) breadcrumb.textContent = dashboard ? "Dashboard" : title;
  document.title = dashboard ? "ApplyTrack — Internship search, in focus" : `${title} — ApplyTrack`;
  document.querySelector("#sidebar").classList.remove("is-open");
  document.querySelector("#sidebar-backdrop").classList.remove("is-visible");
  if (location.hash !== `#${route}`) history.replaceState(null, "", `#${route}`);
  if (applications) renderApplicationsPage();
  if (companies) renderCompaniesPage();
  if (resumes) renderResumesPage();
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const button = document.querySelector("#theme-toggle");
  const next = theme === "dark" ? "light" : "dark";
  button.setAttribute("aria-label", `Switch to ${next} theme`);
  button.title = `Switch to ${next} theme`;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.error("Could not save theme preference.", error);
  }
}

function initTheme() {
  let theme = "light";
  try {
    theme = localStorage.getItem(THEME_KEY) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  } catch (error) {
    console.error("Could not read theme preference.", error);
  }
  setTheme(theme);
}

function initSidebar() {
  const sidebar = document.querySelector("#sidebar");
  const collapseButton = document.querySelector("#sidebar-collapse");
  try {
    if (localStorage.getItem(COLLAPSE_KEY) === "true" && window.innerWidth > 820) document.body.classList.add("sidebar-collapsed");
  } catch (error) {
    console.error("Could not read sidebar preference.", error);
  }
  const initiallyCollapsed = document.body.classList.contains("sidebar-collapsed");
  collapseButton.setAttribute("aria-label", initiallyCollapsed ? "Expand sidebar" : "Collapse sidebar");
  collapseButton.title = initiallyCollapsed ? "Expand sidebar" : "Collapse sidebar";
  collapseButton.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
    const collapsed = document.body.classList.contains("sidebar-collapsed");
    collapseButton.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    collapseButton.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch (error) {
      console.error("Could not save sidebar preference.", error);
    }
  });
  document.querySelector("#mobile-menu").addEventListener("click", () => {
    sidebar.classList.add("is-open");
    document.querySelector("#sidebar-backdrop").classList.add("is-visible");
  });
  document.querySelector("#sidebar-backdrop").addEventListener("click", () => {
    sidebar.classList.remove("is-open");
    document.querySelector("#sidebar-backdrop").classList.remove("is-visible");
  });
}

function initNavigation() {
  document.querySelectorAll(".nav-link[data-route]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      routeTo(link.dataset.route);
    });
  });
  const backToDashboard = document.querySelector("#back-to-dashboard");
  if (backToDashboard) backToDashboard.addEventListener("click", () => routeTo("dashboard"));
  const initialRoute = location.hash.slice(1);
  routeTo(["dashboard", "applications", "companies", "resumes", ...Object.keys(pageDescriptions)].includes(initialRoute) ? initialRoute : "dashboard");
  window.addEventListener("hashchange", () => {
    const route = location.hash.slice(1);
    if (["dashboard", "applications", "companies", "resumes", ...Object.keys(pageDescriptions)].includes(route)) routeTo(route);
  });
}

function initSearch() {
  const input = document.querySelector("#application-search");
  input.addEventListener("input", () => {
    state.filter = input.value;
    renderPipeline();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      event.preventDefault();
      input.focus();
    }
    if (event.key === "Escape" && document.activeElement === input) {
      input.value = "";
      state.filter = "";
      renderPipeline();
      input.blur();
    }
  });
}

function initDateLabels() {
  const today = new Date();
  document.querySelector("#current-date").textContent = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(today);
  document.querySelectorAll(".footer-year").forEach((element) => { element.textContent = today.getFullYear(); });
}

function init() {
  initTheme();
  initSidebar();
  initApplicationManagement();
  initCompanyManagement();
  initResumeManagement();
  initNavigation();
  initSearch();
  initDateLabels();
  document.querySelector("#theme-toggle").addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
  renderDashboard();
}

init();
