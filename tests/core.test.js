"use strict";

/**
 * Run with: node --test tests/
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../core.js");

const NOW = "2026-11-23T12:00:00.000Z";

let sequence = 0;

function app(overrides) {
  sequence += 1;
  return Core.normalizeApplication(Object.assign({
    id: "app-" + sequence,
    companyId: "company-a",
    title: "Design Intern",
    jobType: "Internship",
    source: "LinkedIn",
    status: "Saved",
    dateDiscovered: "2026-11-01",
    currency: "USD",
    createdAt: "2026-11-01T09:00:00.000Z",
    updatedAt: "2026-11-01T09:00:00.000Z"
  }, overrides));
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

test("ids stay unique across a thousand creations", () => {
  const ids = new Set();
  for (let index = 0; index < 1000; index += 1) ids.add(Core.createId("application"));
  assert.equal(ids.size, 1000);
});

test("duplicate application ids are repaired on normalization", () => {
  const records = Core.normalizeApplications([
    { id: "duplicate", title: "First" },
    { id: "duplicate", title: "Second" },
    { title: "No id at all" }
  ]);
  assert.equal(records.length, 3);
  assert.equal(new Set(records.map((record) => record.id)).size, 3);
});

test("legacy records gain only their current status, never an invented stage", () => {
  const legacy = Core.normalizeApplication({
    id: "legacy",
    title: "Research Intern",
    companyName: "Acme",
    status: "Interviewed",
    date: "2026-10-02"
  });
  assert.deepEqual(legacy.statusHistory.map((entry) => entry.status), ["Interviewed"]);
  assert.equal(legacy.dateApplied, "2026-10-02");
  assert.equal(legacy.companyId, "");
  assert.equal(legacy.companyName, "Acme");
});

test("history is ordered, de-duplicated and ends at the current status", () => {
  const record = app({
    status: "Interviewed",
    dateApplied: "2026-10-02",
    statusHistory: [
      { status: "Applied", at: "2026-10-02T09:00:00.000Z" },
      { status: "Saved", at: "2026-10-01T09:00:00.000Z" },
      { status: "Applied", at: "2026-10-02T09:00:00.000Z" },
      { status: "Nonsense", at: "2026-10-03T09:00:00.000Z" }
    ]
  });
  assert.deepEqual(record.statusHistory.map((entry) => entry.status), ["Saved", "Applied", "Interviewed"]);
});

test("reached status follows the lifecycle ranking", () => {
  const offered = app({
    status: "Offered",
    dateApplied: "2026-10-01",
    statusHistory: [
      { status: "Saved", at: "2026-09-01T09:00:00.000Z" },
      { status: "Applied", at: "2026-09-05T09:00:00.000Z" },
      { status: "Interviewed", at: "2026-09-20T09:00:00.000Z" },
      { status: "Offered", at: "2026-10-01T09:00:00.000Z" }
    ]
  });
  assert.equal(Core.reachedStatus(offered, "Applied"), true);
  assert.equal(Core.reachedStatus(offered, "Interviewed"), true);
  assert.equal(Core.reachedStatus(offered, "Offered"), true);
  assert.equal(Core.isSubmitted(offered), true);
});

test("dashboard counts survive later status changes and never double count", () => {
  const list = [
    app({ id: "saved", status: "Saved" }),
    app({
      id: "applied",
      status: "Applied",
      dateApplied: "2026-11-05",
      statusHistory: [
        { status: "Saved", at: "2026-11-01T09:00:00.000Z" },
        { status: "Applied", at: "2026-11-05T09:00:00.000Z" }
      ]
    }),
    app({
      id: "offered",
      companyId: "company-b",
      status: "Offered",
      dateApplied: "2026-09-10",
      statusHistory: [
        { status: "Saved", at: "2026-09-01T09:00:00.000Z" },
        { status: "Applied", at: "2026-09-05T09:00:00.000Z" },
        { status: "Contacted", at: "2026-09-12T09:00:00.000Z" },
        { status: "Interviewed", at: "2026-09-20T09:00:00.000Z" },
        { status: "Offered", at: "2026-10-01T09:00:00.000Z" }
      ]
    }),
    app({
      id: "rejected-after-interview",
      companyId: "company-b",
      status: "Rejected",
      dateApplied: "2026-09-11",
      statusHistory: [
        { status: "Saved", at: "2026-09-02T09:00:00.000Z" },
        { status: "Applied", at: "2026-09-06T09:00:00.000Z" },
        { status: "Interviewed", at: "2026-09-21T09:00:00.000Z" },
        { status: "Rejected", at: "2026-10-02T09:00:00.000Z" }
      ]
    })
  ];

  const stats = Core.computeStats(list, { settings: { currency: "USD" } });
  assert.equal(stats.total, 4);
  assert.equal(stats.saved, 1);
  assert.equal(stats.submitted, 3);
  assert.equal(stats.total, stats.saved + stats.submitted);
  assert.equal(stats.interviewed, 2, "an offer and a rejection still carry their interview");
  assert.equal(stats.offered, 1);
  assert.equal(stats.rejected, 1);
  assert.equal(stats.contactedCompanies, 1, "only company-b was contacted");
  assert.equal(stats.active, 2, "rejected records leave the active count exactly once");
});

test("a record that is both rejected and withdrawn is counted once as closed", () => {
  const record = app({
    status: "Rejected",
    dateApplied: "2026-09-11",
    statusHistory: [
      { status: "Applied", at: "2026-09-06T09:00:00.000Z" },
      { status: "Withdrawn", at: "2026-09-20T09:00:00.000Z" },
      { status: "Rejected", at: "2026-09-25T09:00:00.000Z" }
    ]
  });
  const stats = Core.computeStats([record]);
  assert.equal(stats.rejected, 1);
  assert.equal(stats.withdrawn, 1);
  assert.equal(stats.active, 0);
});

test("compensation totals only submissions stored in the preferred currency", () => {
  const list = [
    app({ status: "Applied", dateApplied: "2026-11-05", compensationAmount: "30", currency: "USD" }),
    app({ status: "Interviewed", dateApplied: "2026-11-05", compensationAmount: "20", currency: "USD", companyId: "company-b" }),
    app({ status: "Applied", dateApplied: "2026-11-05", compensationAmount: "900", currency: "EUR", companyId: "company-c" }),
    app({ status: "Saved", compensationAmount: "50", currency: "USD", companyId: "company-d" }),
    app({ status: "Applied", dateApplied: "2026-11-05", compensationAmount: "", currency: "USD", companyId: "company-e" })
  ];

  const stats = Core.computeStats(list, { settings: { currency: "USD" } });
  assert.equal(stats.compensation.currency, "USD");
  assert.equal(stats.compensation.total, 50);
  assert.equal(stats.compensation.count, 2);
  assert.equal(stats.compensation.others.length, 1);
  assert.equal(stats.compensation.others[0].currency, "EUR");
  assert.equal(stats.compensation.others[0].total, 900);
});

test("monthly activity keeps submitted and saved records apart", () => {
  const activity = Core.buildMonthlyActivity([
    app({ status: "Applied", dateApplied: "2026-11-05" }),
    app({ status: "Rejected", dateApplied: "2026-10-10" }),
    app({ status: "Saved", dateDiscovered: "2026-10-02" }),
    app({ status: "Applied", dateApplied: "2026-05-10" })
  ], { months: 6, now: NOW });

  assert.deepEqual(activity.labels, ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]);
  assert.equal(sum(activity.submitted), 2, "the May submission is outside the window");
  assert.equal(sum(activity.saved), 1);
  assert.equal(activity.submittedTotal, 2);
  assert.equal(activity.submitted[4], 1);
  assert.equal(activity.submitted[5], 1);
  assert.equal(activity.saved[4], 1);
  assert.equal(activity.saved[5], 0);
});

test("status distribution uses one denominator and keeps every status", () => {
  const distribution = Core.buildStatusDistribution([
    app({ status: "Saved" }),
    app({ status: "Applied" }),
    app({ status: "Rejected" })
  ]);
  assert.equal(distribution.length, Core.STATUS_ORDER.length);
  assert.equal(sum(distribution.map((row) => row.count)), 3);
  assert.equal(distribution.find((row) => row.status === "Rejected").count, 1);
  assert.equal(distribution.find((row) => row.status === "Saved").share, 1 / 3);
});

test("sources exclude saved opportunities and fold the remainder into one bucket", () => {
  const sources = ["LinkedIn", "LinkedIn", "Referral", "Handshake", "Indeed", "Other", "Company website"];
  const submitted = sources.map((source, index) => app({
    id: "source-" + index,
    status: "Applied",
    dateApplied: "2026-11-05",
    source: source
  }));
  submitted.push(app({ status: "Saved", source: "LinkedIn" }));

  const result = Core.buildSourceDistribution(submitted, { limit: 5 });
  assert.equal(result.total, 7, "the saved record is not a source of an application");
  assert.equal(result.rows.length, 5);
  assert.equal(result.rows[0].source, "LinkedIn");
  assert.equal(result.rows[0].count, 2);
  assert.equal(result.rows[4].source, "Other sources");
  assert.equal(result.rows[4].count, 2);
});

test("resume usage merges deleted and missing versions without losing counts", () => {
  const usage = Core.buildResumeUsage([
    app({ status: "Applied", dateApplied: "2026-11-05", resumeId: "r1", resumeSnapshot: { name: "Main", fileName: "main.pdf" } }),
    app({ status: "Interviewed", dateApplied: "2026-11-05", resumeId: "r1", resumeSnapshot: { name: "Main", fileName: "main.pdf" } }),
    app({ status: "Applied", dateApplied: "2026-11-05", resumeId: "r2", resumeSnapshot: { name: "Old version", fileName: "old.pdf" } }),
    app({ status: "Applied", dateApplied: "2026-11-05", resumeId: "" }),
    app({ status: "Saved", resumeId: "" })
  ], [
    { id: "r1", name: "Main resume", fileName: "main.pdf", uploadedAt: "2026-11-01T09:00:00.000Z", size: 1000 }
  ], { missingIds: { r1: true } });

  assert.equal(usage.noResume, 1, "only submitted records without a resume count");
  assert.equal(usage.rows.length, 2);
  const main = usage.rows.find((row) => row.resumeId === "r1");
  const deleted = usage.rows.find((row) => row.resumeId === "r2");
  assert.equal(main.count, 2);
  assert.equal(main.state, "missing");
  assert.equal(deleted.name, "Old version");
  assert.equal(deleted.state, "deleted");
});

test("reconcile links by id, creates only from a name and never resurrects a deleted company", () => {
  const byId = Core.reconcile({
    applications: [{ id: "a1", title: "Intern", companyId: "company-a", companyName: "Acme" }],
    companies: [{ id: "company-a", name: "Acme" }]
  });
  assert.equal(byId.repairs.length, 0);
  assert.equal(byId.applications[0].companyId, "company-a");
  assert.equal(byId.applications[0].companyName, "");

  const created = Core.reconcile({
    applications: [{ id: "a2", title: "Intern", companyName: "New Co" }],
    companies: []
  });
  assert.equal(created.companies.length, 1);
  assert.equal(created.applications[0].companyId, created.companies[0].id);
  assert.equal(created.repairs[0].kind, "missing-company");

  const removed = Core.reconcile({
    applications: [{ id: "a3", title: "Intern", companyId: "", companyName: "", formerCompanyName: "Acme" }],
    companies: []
  });
  assert.equal(removed.companies.length, 0, "a deleted company must not come back");
  assert.equal(removed.applications[0].companyId, "");
  assert.equal(removed.applications[0].formerCompanyName, "Acme");

  const dangling = Core.reconcile({
    applications: [{ id: "a4", title: "Intern", companyId: "company-gone", companyName: "Acme" }],
    companies: []
  });
  assert.equal(dangling.companies.length, 0);
  assert.equal(dangling.applications[0].companyId, "");
  assert.equal(dangling.applications[0].formerCompanyName, "Acme");
});

test("reconcile merges duplicate companies and re-points their applications", () => {
  const result = Core.reconcile({
    applications: [{ id: "a1", title: "Intern", companyId: "company-new" }],
    companies: [
      { id: "company-old", name: "Acme" },
      { id: "company-new", name: "acme" }
    ]
  });
  assert.equal(result.companies.length, 1);
  assert.equal(result.companies[0].id, "company-old");
  assert.equal(result.applications[0].companyId, "company-old");
});

test("reconcile clears an orphaned resume but keeps its snapshot", () => {
  const result = Core.reconcile({
    applications: [{
      id: "a1",
      title: "Intern",
      companyId: "company-a",
      resumeId: "resume-gone",
      resumeSnapshot: { name: "Product v2", fileName: "product-v2.pdf", atsScore: 88 }
    }],
    companies: [{ id: "company-a", name: "Acme" }],
    resumes: []
  });
  const application = result.applications[0];
  assert.equal(application.resumeId, "");
  assert.equal(application.resumeName, "Product v2");
  assert.equal(application.resumeSnapshot.atsScore, 88);
  assert.equal(result.repairs[0].kind, "orphan-resume");
});

test("application validation reports each problem against its field", () => {
  const missing = Core.validateApplication({}, { today: "2026-11-23" });
  assert.equal(missing.valid, false);
  assert.ok(missing.errors.title);
  assert.ok(missing.errors.jobType);
  assert.ok(missing.errors.companyName);
  assert.ok(missing.errors.source);

  const future = Core.validateApplication({
    title: "Intern",
    jobType: "Internship",
    companyName: "Acme",
    source: "LinkedIn",
    status: "Applied",
    dateDiscovered: "2026-11-01",
    dateApplied: "2026-12-01"
  }, { today: "2026-11-23" });
  assert.match(future.errors.dateApplied, /future/);

  const beforeDiscovery = Core.validateApplication({
    title: "Intern",
    jobType: "Internship",
    companyName: "Acme",
    source: "LinkedIn",
    status: "Applied",
    dateDiscovered: "2026-11-10",
    dateApplied: "2026-11-02"
  }, { today: "2026-11-23" });
  assert.match(beforeDiscovery.errors.dateApplied, /before the discovery date/);

  const numeric = Core.validateApplication({
    title: "Intern",
    jobType: "Internship",
    companyName: "Acme",
    source: "LinkedIn",
    status: "Saved",
    listingUrl: "javascript:alert(1)",
    compensationAmount: "-4",
    hoursPerDay: "30"
  }, { today: "2026-11-23" });
  assert.ok(numeric.errors.listingUrl);
  assert.ok(numeric.errors.compensationAmount);
  assert.ok(numeric.errors.hoursPerDay);

  const valid = Core.validateApplication({
    title: "Intern",
    jobType: "Internship",
    companyName: "Acme",
    source: "LinkedIn",
    status: "Saved",
    listingUrl: "https://acme.example.com/jobs/1",
    compensationAmount: "28"
  }, { today: "2026-11-23" });
  assert.equal(valid.valid, true);
});

test("company and resume validation reject unsafe values", () => {
  const company = Core.validateCompany({ name: "Acme", website: "acme.com", contactEmail: "nope" });
  assert.equal(company.valid, false);
  assert.ok(company.errors.website);
  assert.ok(company.errors.contactEmail);
  assert.equal(Core.validateCompany({ name: "Acme", website: "https://acme.com" }).valid, true);

  const resume = Core.validateResume({ name: "Main", atsScore: "103" }, {
    fileRequired: true,
    file: { name: "resume.txt", type: "text/plain", size: 10 }
  });
  assert.equal(resume.valid, false);
  assert.ok(resume.errors.atsScore);
  assert.ok(resume.errors.file);

  const accepted = Core.validateResume({ name: "Main", atsScore: "80" }, {
    fileRequired: true,
    file: { name: "resume.pdf", type: "application/pdf", size: 2048 }
  });
  assert.equal(accepted.valid, true);
});

test("csv output escapes separators, quotes and newlines with a BOM", () => {
  const csv = Core.buildCsv([
    app({ title: "Design, \"Lead\"", notes: "line one\nline two", companyId: "" })
  ], { companyName: () => "Acme, Inc" });

  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"Design, ""Lead"""'));
  assert.ok(csv.includes('"Acme, Inc"'));
  assert.ok(csv.includes('"line one\nline two"'));
  assert.equal(csv.split("\r\n").length, 2);
});

test("backup bundle round-trips records and PDF bytes", () => {
  const backup = Core.buildBackup({
    applications: [app({ id: "a1" })],
    companies: [{ id: "company-a", name: "Acme", industry: "Software" }],
    resumes: [{ id: "r1", name: "Main", fileName: "main.pdf", uploadedAt: "2026-11-01T09:00:00.000Z", size: 5 }],
    settings: { theme: "dark", currency: "EUR" },
    files: [{ id: "r1", fileName: "main.pdf", mimeType: "application/pdf", size: 5, bytes: new Uint8Array([37, 80, 68, 70, 45]) }],
    now: NOW
  });

  assert.equal(backup.format, "applytrack-backup");
  assert.equal(backup.schemaVersion, Core.SCHEMA_VERSION);
  assert.equal(backup.counts.pdfs, 1);
  assert.equal(backup.data.settings.currency, "EUR");

  const parsed = Core.parseBackup(JSON.stringify(backup));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.applications.length, 1);
  assert.equal(parsed.data.companies[0].industry, "Software");
  assert.equal(parsed.files.length, 1);
  assert.equal(parsed.files[0].bytes.length, 5);
  assert.equal(String.fromCharCode.apply(null, parsed.files[0].bytes), "%PDF-");
  assert.equal(parsed.files[0].fileName, "main.pdf");
});

test("backup import rejects unusable files with a specific reason", () => {
  assert.equal(Core.parseBackup("").ok, false);
  assert.equal(Core.parseBackup("{not json").ok, false);

  const wrongFormat = Core.parseBackup(JSON.stringify({ format: "something-else", schemaVersion: 1, data: {} }));
  assert.equal(wrongFormat.ok, false);
  assert.match(wrongFormat.error, /not an ApplyTrack backup/);

  const newer = Core.parseBackup(JSON.stringify({
    format: "applytrack-backup",
    schemaVersion: Core.SCHEMA_VERSION + 1,
    data: { applications: [], companies: [], resumes: [] }
  }));
  assert.equal(newer.ok, false);
  assert.match(newer.error, /newer version/);

  const noRecords = Core.parseBackup(JSON.stringify({ format: "applytrack-backup", schemaVersion: 1, data: {} }));
  assert.equal(noRecords.ok, false);
});

test("storage adapter reports corruption and rolls back partial writes", () => {
  const map = new Map();
  const storage = {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key)
  };
  const store = Core.createStore(storage);
  assert.equal(store.available, true);

  const absent = store.read("missing", []);
  assert.equal(absent.ok, true);
  assert.equal(absent.empty, true);
  assert.deepEqual(absent.value, []);

  map.set("broken", "{not json");
  const corrupt = store.read("broken", []);
  assert.equal(corrupt.ok, false);
  assert.equal(corrupt.corrupted, true);

  assert.equal(store.write("applications", [{ id: "a1" }]).ok, true);
  assert.deepEqual(store.read("applications", []).value, [{ id: "a1" }]);

  let writes = 0;
  const failing = new Map();
  const flaky = {
    getItem: (key) => (failing.has(key) ? failing.get(key) : null),
    removeItem: (key) => failing.delete(key),
    setItem: (key, value) => {
      writes += 1;
      if (writes === 3) {
        const error = new Error("quota");
        error.name = "QuotaExceededError";
        throw error;
      }
      failing.set(key, value);
    }
  };
  const flakyStore = Core.createStore(flaky);
  const result = flakyStore.writeMany([["applications", [{ id: "a1" }]], ["companies", [{ id: "c1" }]]]);
  assert.equal(result.ok, false);
  assert.match(result.error, /storage is full/i);
  assert.equal(failing.has("applications"), false, "the first key was rolled back");
  assert.equal(failing.has("companies"), false);
});

test("filtering keeps closed records reachable and sorting never mutates", () => {
  const list = [
    app({ id: "saved", status: "Saved", title: "Saved role" }),
    app({ id: "withdrawn", status: "Withdrawn", title: "Withdrawn role", dateApplied: "2026-09-01" }),
    app({ id: "rejected", status: "Rejected", title: "Rejected role", dateApplied: "2026-10-01" }),
    app({ id: "new", status: "Applied", title: "Newest role", dateApplied: "2026-11-20" })
  ];
  const lookup = (application) => (application.id === "rejected" ? "Zenith Labs" : "Acme");

  assert.equal(Core.filterApplications(list, { scope: "all" }).length, 4);
  assert.equal(Core.filterApplications(list, { scope: "submitted" }).length, 3);
  assert.equal(Core.filterApplications(list, { status: "__submitted__" }).length, 3);
  assert.equal(Core.filterApplications(list, { status: "Withdrawn" })[0].id, "withdrawn");
  assert.equal(Core.filterApplications(list, { query: "zenith" }, { companyName: lookup })[0].id, "rejected");

  const sorted = Core.sortApplications(list, "date-desc", { companyName: lookup });
  assert.equal(sorted[0].id, "new");
  const ascending = Core.sortApplications(list, "company-asc", { companyName: lookup });
  assert.equal(ascending[0].id, "saved", "Acme entries keep their order before Zenith Labs");
  assert.equal(ascending[3].id, "rejected");
  assert.equal(list[0].companyLabel, undefined, "sorting must not annotate the records");
});

test("settings and theme preferences normalize to supported values", () => {
  assert.deepEqual(Core.normalizeSettings({ theme: "neon", currency: "XYZ" }), {
    theme: "system",
    currency: "USD",
    lastBackupAt: null,
    sampleLoaded: false
  });
  assert.equal(Core.normalizeSettings({ theme: "dark", currency: "inr" }).currency, "INR");
  assert.equal(Core.resolveTheme("system", true), "dark");
  assert.equal(Core.resolveTheme("system", false), "light");
  assert.equal(Core.resolveTheme("light", true), "light");
});

test("sample data is internally consistent and requires no repairs", () => {
  const sample = Core.buildSampleData({ now: NOW });
  const reconciled = Core.reconcile(sample);

  assert.equal(reconciled.repairs.length, 0);
  assert.equal(reconciled.applications.length, 12);
  assert.equal(reconciled.companies.length, 5);
  assert.equal(reconciled.resumes.length, 3);

  reconciled.applications.forEach((application) => {
    assert.ok(application.companyId, application.title + " resolves to a company");
    assert.equal(application.statusHistory[application.statusHistory.length - 1].status, application.status);
    const times = application.statusHistory.map((entry) => entry.at);
    assert.deepEqual(times, times.slice().sort(), application.title + " history is chronological");
  });

  const stats = Core.computeStats(reconciled.applications, { settings: { currency: "USD" } });
  assert.equal(stats.total, 12);
  assert.equal(stats.saved, 2);
  assert.equal(stats.submitted, 10);
  assert.equal(stats.offered, 1);
  assert.equal(stats.rejected, 2);
  assert.equal(stats.withdrawn, 1);
  assert.equal(stats.interviewed, 5);
  assert.equal(stats.active, 7);
});
