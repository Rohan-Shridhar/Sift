"use strict";

const STORAGE_KEY = "applytrack.applications.v1";
const THEME_KEY = "applytrack.theme.v1";
const COLLAPSE_KEY = "applytrack.sidebar-collapsed.v1";

const statusOrder = ["Saved", "Applied", "Contacted", "Interviewed", "Offered"];
const statusClass = {
  Saved: "status-saved",
  Applied: "status-applied",
  Contacted: "status-contacted",
  Interviewed: "status-interviewed",
  Offered: "status-offered"
};
const companyColors = ["indigo", "sage", "amber", "blue", "rose"];
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
  route: "dashboard"
};

function loadApplications() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedApplications));
      return seedApplications;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Stored applications are not an array.");
    return parsed.filter((application) => application && statusOrder.includes(application.status));
  } catch (error) {
    console.error("Could not load saved applications.", error);
    return seedApplications;
  }
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
  const contacted = state.applications.filter((application) => ["Contacted", "Interviewed", "Offered"].includes(application.status));
  const stats = [
    { label: "Total opportunities", value: state.applications.length, note: "Across your search", icon: "opportunities", tone: "indigo" },
    { label: "Saved jobs", value: countByStatus("Saved"), note: "Worth a closer look", icon: "saved", tone: "blue" },
    { label: "Applications sent", value: state.applications.filter((application) => application.status !== "Saved").length, note: "Taking the next step", icon: "applied", tone: "green" },
    { label: "Companies contacted", value: new Set(contacted.map((application) => application.company)).size, note: "Conversations started", icon: "contacted", tone: "amber" },
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

function applicationCard(application, index) {
  const companyInitial = application.company.trim().charAt(0).toUpperCase() || "?";
  const tone = companyColors[index % companyColors.length];
  return `
    <article class="application-card">
      <div class="application-card-top">
        <span class="company-mark" data-color="${tone}" aria-hidden="true">${escapeHtml(companyInitial)}</span>
        <div class="application-title-wrap">
          <h4 class="application-title" title="${escapeAttribute(application.title)}">${escapeHtml(application.title)}</h4>
          <p class="application-company">${escapeHtml(application.company)}</p>
        </div>
      </div>
      <div class="application-meta">
        <span>${iconMarkup.pin}${escapeHtml(application.location || "Location not set")}</span>
        <span>${iconMarkup.briefcase}${escapeHtml(application.mode || "Work mode not set")}</span>
        <span>${escapeHtml(application.stipend || "Stipend not listed")}</span>
      </div>
      <div class="application-card-footer">
        <span class="status-pill ${statusClass[application.status]}">${application.status}</span>
        <time class="application-date" datetime="${escapeAttribute(application.date || "")}">${formatDate(application.date)}</time>
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
      return [application.title, application.company, application.location, application.mode, application.status]
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
    const date = new Date(`${application.date}T12:00:00`);
    return application.status !== "Saved" && date.getFullYear() === month.year && date.getMonth() === month.month;
  }).length);
  const saved = months.map((month) => state.applications.filter((application) => {
    const date = new Date(`${application.date}T12:00:00`);
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
  const colors = ["#81a5cc", "#736be0", "#d8ad71", "#79b49a", "#ce8791"];
  const totalApplied = state.applications.filter((application) => application.status !== "Saved").length;
  const segments = counts.map((count, index) => {
    const value = total ? (count / total) * 100 : 0;
    return `${colors[index]} ${value}%`;
  });
  const conic = total ? `conic-gradient(${segments.join(", ")})` : "conic-gradient(var(--surface-hover) 0% 100%)";
  const legend = statusOrder.map((status, index) => `
    <div class="status-legend-row"><i class="status-swatch" style="background:${colors[index]}"></i><span>${status}</span><strong>${countByStatus(status)}</strong></div>
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

const pageDescriptions = {
  applications: ["Applications", "A focused home for every opportunity you're pursuing. Application management will be available in a later phase.", "applications"],
  companies: ["Companies", "Keep the teams and people behind your opportunities in one place. Company management is planned for a later phase.", "companies"],
  resumes: ["Resumes", "Your tailored resumes will have a dedicated home here. Resume management is planned for a later phase.", "resumes"],
  settings: ["Settings", "Theme preferences and workspace options will live here as ApplyTrack grows.", "settings"]
};

function routeTo(route) {
  state.route = route;
  const dashboard = route === "dashboard";
  document.querySelector("#dashboard-view").classList.toggle("is-visible", dashboard);
  document.querySelector("#placeholder-view").classList.toggle("is-visible", !dashboard);
  document.querySelectorAll(".nav-link[data-route]").forEach((link) => {
    const active = link.dataset.route === route;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  const [title, copy, icon] = pageDescriptions[route] || pageDescriptions.applications;
  if (!dashboard) {
    document.querySelector("#placeholder-title").textContent = title;
    document.querySelector("#placeholder-copy").textContent = copy;
    document.querySelector("#placeholder-mark").innerHTML = iconMarkup[icon] || iconMarkup.opportunities;
  }
  document.querySelector("#breadcrumb-current").textContent = dashboard ? "Dashboard" : title;
  document.title = dashboard ? "ApplyTrack — Internship search, in focus" : `${title} — ApplyTrack`;
  document.querySelector("#sidebar").classList.remove("is-open");
  document.querySelector("#sidebar-backdrop").classList.remove("is-visible");
  if (location.hash !== `#${route}`) history.replaceState(null, "", `#${route}`);
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
  routeTo(["dashboard", ...Object.keys(pageDescriptions)].includes(initialRoute) ? initialRoute : "dashboard");
  window.addEventListener("hashchange", () => {
    const route = location.hash.slice(1);
    if (["dashboard", ...Object.keys(pageDescriptions)].includes(route)) routeTo(route);
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
  initNavigation();
  initSearch();
  initDateLabels();
  document.querySelector("#theme-toggle").addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
  renderDashboard();
}

init();
