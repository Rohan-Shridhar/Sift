"use strict";

const STORAGE_KEY = "applytrack.applications.v1";
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
const RESUME_STORAGE_KEY = "applytrack.resumes.v1";
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

const state = {
  applications: loadApplications(),
  filter: "",
  collapsedSections: new Set(),
  route: "dashboard",
  applicationMode: "list",
  activeApplicationId: null,
  applicationView: "cards",
  formIntent: "saved",
  editingApplicationId: null,
  toastTimer: null
};

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

function normalizeApplications(records) {
  const companyIds = new Map();
  const usedIds = new Set();
  const today = localDateString();
  return records.filter((record) => record && typeof record === "object").map((record) => {
    let id = String(record.id || "");
    if (!id || usedIds.has(id)) id = createId("application");
    usedIds.add(id);

    const companyName = String(record.companyName || record.company || "").trim();
    const companyKey = companyName.toLocaleLowerCase();
    const companyId = String(companyIds.get(companyKey) || record.companyId || createId("company"));
    if (companyKey) companyIds.set(companyKey, companyId);
    const status = statusOrder.includes(record.status) ? record.status : "Saved";
    const legacyDate = String(record.date || "");
    const legacyPay = String(record.stipend || "");
    const legacyAmount = legacyPay.match(/([\d,]+(?:\.\d+)?)/);
    const frequency = record.paymentFrequency || (/hr|hour/i.test(legacyPay) ? "Hourly" : "");
    const rawSkills = Array.isArray(record.skills) ? record.skills : String(record.skills || "").split(/[,;\n]/);

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
      resumeName: String(record.resumeName || ""),
      notes: String(record.notes || ""),
      createdAt: String(record.createdAt || new Date().toISOString()),
      updatedAt: String(record.updatedAt || new Date().toISOString())
    };
  });
}

function persistApplicationRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error("Could not save applications.", error);
    showToast("Your changes could not be saved. Check available browser storage and try again.");
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
    { label: "Companies contacted", value: new Set(contacted.map((application) => application.companyName)).size, note: "Conversations started", icon: "contacted", tone: "amber" },
    { label: "Interviews", value: countByStatus("Interviewed"), note: "You've got this", icon: "interviews", tone: "blue" },
    { label: "Offers received", value: countByStatus("Offered"), note: "A milestone worth celebrating", icon: "offers", tone: "rose" }
  ];
  document.querySelector("#stats-grid").innerHTML = stats.map((stat) => `
    <article class="stat-card" data-tone="${stat.tone}">
      <div class="stat-top"><span class="stat-label">${stat.label}</span><span class="stat-icon">${iconMarkup[stat.icon]}</span></div>
      <div class="stat-value"><strong>${stat.value}</strong></div>
      <div class="stat-footnote">${stat.note}</div>
    </article>
  `).join("");
  document.querySelector("#application-nav-count").textContent = state.applications.length;
  document.querySelector("#pipeline-total").textContent = `${state.applications.length} ${state.applications.length === 1 ? "opportunity" : "opportunities"}`;
}

function statusOptions(selectedStatus) {
  return statusOrder.map((status) => `<option value="${status}"${status === selectedStatus ? " selected" : ""}>${status}</option>`).join("");
}

function applicationCard(application, index) {
  const companyInitial = application.companyName.trim().charAt(0).toUpperCase() || "?";
  const tone = companyColors[index % companyColors.length];
  return `
    <article class="application-card">
      <div class="application-card-top">
        <span class="company-mark" data-color="${tone}" aria-hidden="true">${escapeHtml(companyInitial)}</span>
        <div class="application-title-wrap">
          <button class="application-open-button" type="button" data-open-application="${escapeAttribute(application.id)}"><span class="application-title" title="${escapeAttribute(application.title)}">${escapeHtml(application.title)}</span></button>
          <p class="application-company">${escapeHtml(application.companyName)}</p>
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
      return [application.title, application.companyName, application.location, application.workMode, application.status]
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
  document.querySelector("#pipeline-list").innerHTML = groups.join("");
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
  const companies = new Map();
  state.applications.forEach((application) => {
    const key = application.companyName.trim().toLocaleLowerCase();
    if (key && !companies.has(key)) companies.set(key, { id: application.companyId, name: application.companyName });
  });
  return [...companies.values()].sort((first, second) => first.name.localeCompare(second.name));
}

function resolveCompanyId(companyName, selectedId) {
  const key = companyName.trim().toLocaleLowerCase();
  const selected = companyOptions().find((company) => company.id === selectedId && company.name.toLocaleLowerCase() === key);
  if (selected) return selected.id;
  const existing = companyOptions().find((company) => company.name.toLocaleLowerCase() === key);
  return existing ? existing.id : createId("company");
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
    company: document.querySelector("#filter-company").value,
    jobType: document.querySelector("#filter-job-type").value,
    workMode: document.querySelector("#filter-work-mode").value,
    source: document.querySelector("#filter-source").value
  };
  replaceSelectOptions(document.querySelector("#filter-status"), "All statuses", statusOrder, selected.status);
  replaceSelectOptions(document.querySelector("#filter-company"), "All companies", companyOptions().map((company) => company.name), selected.company);
  replaceSelectOptions(document.querySelector("#filter-job-type"), "All job types", ["Internship", "Full-time", "Part-time", "Contract"], selected.jobType);
  replaceSelectOptions(document.querySelector("#filter-work-mode"), "All work modes", ["Remote", "Hybrid", "On-site"], selected.workMode);
  const sources = [...new Set(state.applications.map((application) => application.source).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  replaceSelectOptions(document.querySelector("#filter-source"), "All sources", sources, selected.source);
}

function getFilteredApplications() {
  const query = document.querySelector("#applications-search").value.trim().toLocaleLowerCase();
  const filters = {
    status: document.querySelector("#filter-status").value,
    company: document.querySelector("#filter-company").value,
    jobType: document.querySelector("#filter-job-type").value,
    workMode: document.querySelector("#filter-work-mode").value,
    source: document.querySelector("#filter-source").value,
    sort: document.querySelector("#sort-applications").value
  };
  const filtered = state.applications.filter((application) => {
    return (!query || `${application.title} ${application.companyName}`.toLocaleLowerCase().includes(query))
      && (!filters.status || application.status === filters.status)
      && (!filters.company || application.companyName === filters.company)
      && (!filters.jobType || application.jobType === filters.jobType)
      && (!filters.workMode || application.workMode === filters.workMode)
      && (!filters.source || application.source === filters.source);
  });
  const sorters = {
    "date-desc": (first, second) => (second.dateApplied || second.dateDiscovered).localeCompare(first.dateApplied || first.dateDiscovered),
    "date-asc": (first, second) => (first.dateApplied || first.dateDiscovered).localeCompare(second.dateApplied || second.dateDiscovered),
    "company-asc": (first, second) => first.companyName.localeCompare(second.companyName),
    "title-asc": (first, second) => first.title.localeCompare(second.title)
  };
  return filtered.sort(sorters[filters.sort] || sorters["date-desc"]);
}

function renderManagementCard(application, index) {
  const initial = application.companyName.charAt(0).toUpperCase() || "?";
  return `
    <article class="management-card">
      <div class="management-card-top">
        <div class="application-card-top">
          <span class="company-mark" data-color="${companyColors[index % companyColors.length]}" aria-hidden="true">${escapeHtml(initial)}</span>
          <div class="application-title-wrap">
            <button class="application-open-button" type="button" data-open-application="${escapeAttribute(application.id)}"><span class="application-title">${escapeHtml(application.title)}</span></button>
            <p class="application-company">${escapeHtml(application.companyName)}</p>
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
  return `
    <tr>
      <td><button class="application-open-button" type="button" data-open-application="${escapeAttribute(application.id)}"><span class="application-title">${escapeHtml(application.title)}</span><span class="application-company">${escapeHtml(application.companyName)}</span></button></td>
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
  const skills = application.skills.length
    ? `<div class="skill-list">${application.skills.map((skill) => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join("")}</div>`
    : '<p class="detail-unspecified">No required skills listed.</p>';
  const url = safeJobUrl(application.listingUrl);
  target.innerHTML = `
    <button class="detail-back" type="button" data-back-to-applications>${iconMarkup.chevron}All applications</button>
    <div class="detail-titlebar">
      <div class="detail-identity">
        <span class="detail-company-mark" aria-hidden="true">${escapeHtml(application.companyName.charAt(0).toUpperCase() || "?")}</span>
        <div>
          <p class="eyebrow">${escapeHtml(application.jobType)} OPPORTUNITY</p>
          <h1>${escapeHtml(application.title)}</h1>
          <p class="detail-company-name">${escapeHtml(application.companyName)}</p>
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
          ${detailFact("Resume used", application.resumeName)}
        </dl></article>
      </div>
    </div>`;
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
}

function createApplication(application) {
  const record = { ...application, id: application.id || createId("application") };
  if (state.applications.some((item) => item.id === record.id)) {
    showToast("That application ID is already in use.");
    return false;
  }
  if (!persistApplicationRecords([...state.applications, record])) return false;
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
  const updated = { ...existing, ...changes, id, updatedAt: new Date().toISOString() };
  const records = state.applications.map((application) => application.id === id ? updated : application);
  if (!persistApplicationRecords(records)) return false;
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
  if (!persistApplicationRecords(records)) return false;
  state.applications = records;
  state.applicationMode = "list";
  state.activeApplicationId = null;
  refreshDataViews();
  return true;
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

function loadResumeOptions() {
  try {
    const stored = localStorage.getItem(RESUME_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Stored resumes are not an array.");
    return parsed.filter((resume) => resume && typeof resume === "object" && (resume.id || resume.name))
      .map((resume) => ({ id: String(resume.id || resume.name), name: String(resume.name || resume.title || "Untitled resume") }));
  } catch (error) {
    console.error("Could not load saved resumes.", error);
    return [];
  }
}

function populateApplicationFormOptions(current) {
  const statusSelect = document.querySelector("#form-status");
  statusSelect.innerHTML = statusOrder.map((status) => `<option value="${status}">${status}</option>`).join("");
  const companySelect = document.querySelector("#existing-company");
  companySelect.innerHTML = '<option value="">Choose a company (optional)</option>' + companyOptions()
    .map((company) => `<option value="${escapeAttribute(company.id)}" data-company-name="${escapeAttribute(company.name)}">${escapeHtml(company.name)}</option>`).join("");
  const sourceSelect = document.querySelector("#form-source");
  [...sourceSelect.options].filter((option) => option.dataset.custom === "true").forEach((option) => option.remove());
  if (current && current.source && ![...sourceSelect.options].some((option) => option.value === current.source)) {
    const option = new Option(current.source, current.source);
    option.dataset.custom = "true";
    sourceSelect.add(option);
  }

  const resumeSelect = document.querySelector("#form-resume");
  const resumes = loadResumeOptions();
  resumeSelect.innerHTML = "";
  if (!resumes.length) resumeSelect.add(new Option("No resumes uploaded yet — library coming in Phase 4", ""));
  else resumeSelect.add(new Option("No resume selected", ""));
  resumes.forEach((resume) => resumeSelect.add(new Option(resume.name, resume.id)));
  if (current && current.resumeId && !resumes.some((resume) => resume.id === current.resumeId)) {
    resumeSelect.add(new Option(current.resumeName || "Previously selected resume", current.resumeId));
  }
  statusSelect.value = current ? current.status : "Saved";
  if (current) {
    companySelect.value = current.companyId;
    resumeSelect.value = current.resumeId;
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

function openAddApplicationDialog() {
  if (state.route !== "applications") routeTo("applications");
  state.editingApplicationId = null;
  state.formIntent = "saved";
  const form = document.querySelector("#application-form");
  form.reset();
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
  setFormValue("form-company", application.companyName);
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
  const selectedCompany = document.querySelector("#existing-company");
  const selectedResume = document.querySelector("#form-resume");
  const status = state.formIntent === "saved" ? "Saved" : values.status;
  const existing = state.editingApplicationId
    ? state.applications.find((application) => application.id === state.editingApplicationId)
    : null;
  const resumeOption = selectedResume.selectedOptions[0];
  const now = new Date().toISOString();
  return {
    ...(existing || {}),
    id: state.editingApplicationId || createId("application"),
    companyId: resolveCompanyId(companyName, selectedCompany.value),
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
    resumeName: values.resumeId ? resumeOption.textContent : "",
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
  else if (target.matches("[data-edit-application]")) openEditApplicationDialog(target.dataset.editApplication);
  else if (target.matches("[data-delete-application]")) {
    const application = state.applications.find((item) => item.id === target.dataset.deleteApplication);
    if (application && window.confirm(`Delete "${application.title}" at ${application.companyName}? This cannot be undone.`)) {
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
  document.querySelector("#existing-company").addEventListener("change", (event) => {
    const option = event.target.selectedOptions[0];
    if (option && option.dataset.companyName) setFormValue("form-company", option.dataset.companyName);
  });
  document.querySelector("#form-status").addEventListener("change", syncApplicationDateRequirement);
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
  companies: ["Companies", "Keep the teams and people behind your opportunities in one place. Company management is planned for a later phase.", "companies"],
  resumes: ["Resumes", "Your tailored resumes will have a dedicated home here. Resume management is planned for a later phase.", "resumes"],
  settings: ["Settings", "Theme preferences and workspace options will live here as ApplyTrack grows.", "settings"]
};

function routeTo(route, preserveApplicationMode) {
  state.route = route;
  const dashboard = route === "dashboard";
  const applications = route === "applications";
  if (applications && !preserveApplicationMode) {
    state.applicationMode = "list";
    state.activeApplicationId = null;
  }
  document.querySelector("#dashboard-view").classList.toggle("is-visible", dashboard);
  document.querySelector("#applications-view").classList.toggle("is-visible", applications);
  document.querySelector("#placeholder-view").classList.toggle("is-visible", !dashboard && !applications);
  document.querySelectorAll(".nav-link[data-route]").forEach((link) => {
    const active = link.dataset.route === route;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  const [title, copy, icon] = applications
    ? ["Applications", "A focused home for every opportunity you're pursuing.", "opportunities"]
    : pageDescriptions[route] || pageDescriptions.companies;
  if (!dashboard && !applications) {
    document.querySelector("#placeholder-title").textContent = title;
    document.querySelector("#placeholder-copy").textContent = copy;
    document.querySelector("#placeholder-mark").innerHTML = iconMarkup[icon] || iconMarkup.opportunities;
  }
  document.querySelector("#breadcrumb-current").textContent = dashboard ? "Dashboard" : title;
  document.title = dashboard ? "ApplyTrack — Internship search, in focus" : `${title} — ApplyTrack`;
  document.querySelector("#sidebar").classList.remove("is-open");
  document.querySelector("#sidebar-backdrop").classList.remove("is-visible");
  if (location.hash !== `#${route}`) history.replaceState(null, "", `#${route}`);
  if (applications) renderApplicationsPage();
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
  document.querySelector("#back-to-dashboard").addEventListener("click", () => routeTo("dashboard"));
  const initialRoute = location.hash.slice(1);
  routeTo(["dashboard", "applications", ...Object.keys(pageDescriptions)].includes(initialRoute) ? initialRoute : "dashboard");
  window.addEventListener("hashchange", () => {
    const route = location.hash.slice(1);
    if (["dashboard", "applications", ...Object.keys(pageDescriptions)].includes(route)) routeTo(route);
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
  initNavigation();
  initSearch();
  initDateLabels();
  document.querySelector("#theme-toggle").addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
  renderDashboard();
}

init();
