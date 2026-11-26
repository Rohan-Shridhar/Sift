/**
 * Sift / Sift — core domain layer.
 *
 * Everything here is a pure function: no DOM, no global storage access at load time.
 * The UI layer (script.js) owns rendering; this file owns records, integrity, maths,
 * validation and file formats so the same logic can be tested under Node.
 *
 * Loaded as a classic script before script.js and exposed as window.SiftCore.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SiftCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var APP_NAME = "Sift";
  var SCHEMA_VERSION = 1;

  var STORAGE_KEYS = {
    applications: "applytrack.applications.v1",
    companies: "applytrack.companies.v1",
    resumes: "applytrack.resumes.v1",
    settings: "applytrack.settings.v1",
    theme: "applytrack.theme.v1",
    sidebar: "applytrack.sidebar-collapsed.v1"
  };

  var RESUME_DB = { name: "applytrack.documents.v1", version: 1, store: "pdfs" };

  var STATUS_ORDER = ["Saved", "Applied", "Contacted", "Interviewed", "Offered", "On Hold", "Rejected", "Withdrawn"];
  var STATUS_CHAIN = ["Saved", "Applied", "Contacted", "Interviewed", "Offered"];
  var SIDE_STATUSES = ["On Hold", "Rejected", "Withdrawn"];
  var JOB_TYPES = ["Internship", "Full-time", "Part-time", "Contract"];
  var WORK_MODES = ["Remote", "Hybrid", "On-site"];
  var PAYMENT_FREQUENCIES = ["Hourly", "Monthly", "Annual", "Total", "Unpaid"];
  var SOURCES = ["LinkedIn", "Company website", "Referral", "Handshake", "Indeed", "Networking", "Other"];
  var CURRENCIES = [
    { code: "USD", label: "USD — US Dollar" },
    { code: "INR", label: "INR — Indian Rupee" },
    { code: "EUR", label: "EUR — Euro" },
    { code: "GBP", label: "GBP — British Pound" },
    { code: "CAD", label: "CAD — Canadian Dollar" },
    { code: "AUD", label: "AUD — Australian Dollar" }
  ];
  var THEMES = ["system", "light", "dark"];
  var DEFAULT_SETTINGS = { theme: "system", currency: "USD", lastBackupAt: null, sampleLoaded: false };
  var MAX_RESUME_BYTES = 20 * 1024 * 1024;

  var COMPANY_TEXT_FIELDS = [
    "logo", "industry", "description", "website", "careersUrl", "contactEmail",
    "contactPerson", "contactDesignation", "linkedInUrl", "location", "size", "notes"
  ];

  /* ------------------------------------------------------------------ *
   * Primitives
   * ------------------------------------------------------------------ */

  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function text(value) {
    return value == null ? "" : String(value);
  }

  function trimmed(value) {
    return text(value).trim();
  }

  function cleanCompanyName(value) {
    return text(value).normalize("NFKC").trim().replace(/\s+/g, " ");
  }

  function normalizeCompanyName(value) {
    return cleanCompanyName(value).toLocaleLowerCase();
  }

  function createId(prefix) {
    var random;
    try {
      random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "";
    } catch (error) {
      random = "";
    }
    if (!random) random = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
    return text(prefix || "record") + "-" + random;
  }

  function isIsoDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var date = new Date(value + "T12:00:00");
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function isTimestamp(value) {
    return typeof value === "string" && value.length > 10 && !Number.isNaN(Date.parse(value));
  }

  function toIsoDate(date) {
    var copy = new Date(date.getTime());
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().slice(0, 10);
  }

  function todayISO(now) {
    var date = now ? new Date(now) : new Date();
    return toIsoDate(Number.isNaN(date.getTime()) ? new Date() : date);
  }

  function nowStamp(now) {
    var date = now ? new Date(now) : new Date();
    return (Number.isNaN(date.getTime()) ? new Date() : date).toISOString();
  }

  function safeDate(value) {
    var date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  }

  function isTimestampOrDate(value) {
    return isTimestamp(value) || isIsoDate(value);
  }

  function normalizeStatus(value) {
    return STATUS_ORDER.indexOf(value) >= 0 ? value : "Saved";
  }

  function isKnownStatus(value) {
    return STATUS_ORDER.indexOf(value) >= 0;
  }

  function stageRank(value) {
    return STATUS_CHAIN.indexOf(value);
  }

  /* ------------------------------------------------------------------ *
   * Storage adapter
   * ------------------------------------------------------------------ */

  function describeStorageError(error) {
    var name = error && error.name ? error.name : "";
    if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" || (error && error.code === 22)) {
      return "Browser storage is full. Export a backup, then remove some records or stored PDFs.";
    }
    if (name === "SecurityError") {
      return "Browser storage is blocked in this context. Allow site data and reload.";
    }
    return "Browser storage could not be read or written. Check available space and try again.";
  }

  function createStore(storage) {
    var memory = Object.create(null);
    var available = false;

    if (storage) {
      try {
        var probe = "__applytrack_probe__";
        storage.setItem(probe, "1");
        storage.removeItem(probe);
        available = true;
      } catch (error) {
        available = false;
      }
    }

    function readRaw(key) {
      if (available) return storage.getItem(key);
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    }

    function writeRaw(key, value) {
      if (available) storage.setItem(key, value);
      else memory[key] = value;
    }

    function removeRaw(key) {
      if (available) storage.removeItem(key);
      else delete memory[key];
    }

    function encode(value) {
      return JSON.stringify(value);
    }

    return {
      available: available,

      /** Read and parse a key. Corrupt payloads are reported instead of thrown. */
      read: function (key, fallback) {
        var raw;
        try {
          raw = readRaw(key);
        } catch (error) {
          return { ok: false, value: fallback, error: describeStorageError(error) };
        }
        if (raw === null || raw === undefined || raw === "") {
          return { ok: true, value: fallback, empty: true };
        }
        try {
          return { ok: true, value: JSON.parse(raw) };
        } catch (error) {
          return {
            ok: false,
            value: fallback,
            corrupted: true,
            error: "Stored data for “" + key + "” is not valid JSON, so it was skipped."
          };
        }
      },

      write: function (key, value) {
        try {
          writeRaw(key, encode(value));
          return { ok: true };
        } catch (error) {
          return { ok: false, error: describeStorageError(error) };
        }
      },

      /**
       * Write several keys as one unit. If any write fails, the keys already
       * written are restored so applications and companies cannot desynchronise.
       */
      writeMany: function (entries) {
        var list = entries || [];
        var snapshot = [];
        var index;

        try {
          for (index = 0; index < list.length; index += 1) {
            snapshot.push({ key: list[index][0], raw: readRaw(list[index][0]), encoded: encode(list[index][1]) });
          }
        } catch (error) {
          return { ok: false, error: describeStorageError(error) };
        }

        try {
          for (index = 0; index < snapshot.length; index += 1) {
            writeRaw(snapshot[index].key, snapshot[index].encoded);
          }
          return { ok: true };
        } catch (error) {
          for (index = 0; index < snapshot.length; index += 1) {
            try {
              if (snapshot[index].raw === null) removeRaw(snapshot[index].key);
              else writeRaw(snapshot[index].key, snapshot[index].raw);
            } catch (rollbackError) {
              /* Nothing further can be done for this key. */
            }
          }
          return { ok: false, error: describeStorageError(error) };
        }
      },

      remove: function (key) {
        try {
          removeRaw(key);
          return { ok: true };
        } catch (error) {
          return { ok: false, error: describeStorageError(error) };
        }
      },

      removeMany: function (keys) {
        var failures = [];
        (keys || []).forEach(function (key) {
          var result = this.remove(key);
          if (!result.ok) failures.push(result.error);
        }, this);
        return { ok: failures.length === 0, error: failures[0] || "" };
      },

      /** Measured browser quota when the platform exposes it. */
      usage: function () {
        try {
          if (typeof navigator !== "undefined" && navigator.storage && typeof navigator.storage.estimate === "function") {
            return navigator.storage.estimate().then(function (estimate) {
              return { usage: estimate.usage || 0, quota: estimate.quota || 0 };
            }).catch(function () {
              return null;
            });
          }
        } catch (error) {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }
    };
  }

  /* ------------------------------------------------------------------ *
   * Normalization
   * ------------------------------------------------------------------ */

  function normalizeHistory(rawHistory, status, fallbackAt) {
    var entries = [];

    if (Array.isArray(rawHistory)) {
      rawHistory.forEach(function (entry) {
        if (!isObject(entry) || !isKnownStatus(entry.status)) return;
        entries.push({
          status: entry.status,
          at: isTimestampOrDate(entry.at) ? entry.at : ""
        });
      });
    }

    entries.sort(function (first, second) {
      return text(first.at).localeCompare(text(second.at));
    });

    var deduped = [];
    entries.forEach(function (entry) {
      var previous = deduped[deduped.length - 1];
      if (previous && previous.status === entry.status) {
        if (!previous.at && entry.at) previous.at = entry.at;
        return;
      }
      deduped.push({ status: entry.status, at: entry.at });
    });

    if (!deduped.length) {
      deduped.push({ status: status, at: fallbackAt || "" });
    } else if (deduped[deduped.length - 1].status !== status) {
      deduped.push({ status: status, at: fallbackAt || "" });
    }

    return deduped;
  }

  function normalizeResumeSnapshot(record) {
    var snapshot = isObject(record.resumeSnapshot) ? record.resumeSnapshot : {};
    var name = trimmed(snapshot.name || record.resumeName);
    if (!name) return null;
    var rawScore = snapshot.atsScore === undefined ? record.resumeAtsScore : snapshot.atsScore;
    var score = rawScore === "" || rawScore === null || rawScore === undefined ? null : Number(rawScore);
    return {
      name: name,
      fileName: trimmed(snapshot.fileName || record.resumeFileName),
      uploadedAt: trimmed(snapshot.uploadedAt),
      atsScore: Number.isInteger(score) && score >= 0 && score <= 100 ? score : null
    };
  }

  function normalizeApplication(record) {
    var status = normalizeStatus(record.status);
    var createdAt = isTimestamp(record.createdAt) ? record.createdAt : nowStamp();
    var updatedAt = isTimestamp(record.updatedAt) ? record.updatedAt : createdAt;

    var legacyDate = isIsoDate(record.date) ? record.date : "";
    var dateDiscovered = isIsoDate(record.dateDiscovered) ? record.dateDiscovered : legacyDate;
    var dateApplied = isIsoDate(record.dateApplied) ? record.dateApplied : "";
    if (!dateApplied && status !== "Saved" && dateDiscovered) dateApplied = dateDiscovered;

    var legacyPay = text(record.stipend);
    var legacyAmount = legacyPay.match(/([\d,]+(?:\.\d+)?)/);
    var frequency = text(record.paymentFrequency);
    if (!frequency) frequency = /hr|hour/i.test(legacyPay) ? "Hourly" : "";
    if (PAYMENT_FREQUENCIES.indexOf(frequency) < 0) frequency = "Not specified";

    var rawSkills = Array.isArray(record.skills) ? record.skills : text(record.skills).split(/[,;\n]/);
    var currency = trimmed(record.currency).toUpperCase();

    return {
      id: trimmed(record.id),
      companyId: trimmed(record.companyId),
      companyName: cleanCompanyName(record.companyName || record.company),
      formerCompanyName: cleanCompanyName(record.formerCompanyName),
      title: trimmed(record.title || record.jobTitle),
      jobType: JOB_TYPES.indexOf(record.jobType) >= 0 ? record.jobType : "Internship",
      description: text(record.description || record.jobDescription),
      listingUrl: trimmed(record.listingUrl || record.url),
      skills: rawSkills.map(function (skill) { return trimmed(skill); }).filter(Boolean),
      location: trimmed(record.location),
      workMode: WORK_MODES.indexOf(record.workMode || record.mode) >= 0 ? (record.workMode || record.mode) : "",
      compensationAmount: trimmed(
        record.compensationAmount !== undefined && record.compensationAmount !== null
          ? record.compensationAmount
          : (legacyAmount ? legacyAmount[1].replace(/,/g, "") : "")
      ),
      currency: currency || "USD",
      paymentFrequency: frequency,
      duration: trimmed(record.duration),
      hoursPerDay: trimmed(record.hoursPerDay),
      source: trimmed(record.source) || "Other",
      status: status,
      statusHistory: normalizeHistory(record.statusHistory || record.history, status, dateApplied || updatedAt || createdAt),
      dateDiscovered: dateDiscovered,
      dateApplied: dateApplied,
      deadline: isIsoDate(record.deadline) ? record.deadline : "",
      followUpDate: isIsoDate(record.followUpDate) ? record.followUpDate : "",
      resumeId: trimmed(record.resumeId),
      resumeName: trimmed(record.resumeName),
      resumeSnapshot: normalizeResumeSnapshot(record),
      notes: text(record.notes),
      createdAt: createdAt,
      updatedAt: updatedAt
    };
  }

  /**
   * Normalization only guarantees unique ids and valid field shapes. Company
   * references are left alone on purpose: reconcile() is the single place that
   * decides whether a company is matched, created or left behind.
   */
  function normalizeApplications(records) {
    var usedIds = Object.create(null);

    return (Array.isArray(records) ? records : [])
      .filter(function (record) { return isObject(record); })
      .map(function (record) {
        var normalized = normalizeApplication(record);
        if (!normalized.id || usedIds[normalized.id]) normalized.id = createId("application");
        usedIds[normalized.id] = true;
        return normalized;
      });
  }

  function makeCompanyRecord(name, id, now) {
    var cleanName = cleanCompanyName(name);
    var stamp = nowStamp(now);
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
      createdAt: stamp,
      updatedAt: stamp
    };
  }

  /**
   * Companies are unique by normalized name. Duplicates are merged and their
   * ids recorded as aliases so applications can be re-pointed at the survivor.
   */
  function normalizeCompanies(records) {
    var companies = [];
    var byName = Object.create(null);
    var idAliases = Object.create(null);
    var usedIds = Object.create(null);

    (Array.isArray(records) ? records : []).forEach(function (record) {
      if (!isObject(record)) return;
      var name = cleanCompanyName(record.name || record.companyName);
      var key = normalizeCompanyName(name);
      if (!key) return;

      var previous = byName[key];
      if (previous) {
        if (record.id) idAliases[trimmed(record.id)] = previous.id;
        COMPANY_TEXT_FIELDS.forEach(function (field) {
          if (!previous[field] && record[field]) previous[field] = trimmed(record[field]);
        });
        return;
      }

      var id = trimmed(record.id);
      if (!id || usedIds[id]) id = createId("company");
      usedIds[id] = true;

      var company = makeCompanyRecord(name, id);
      company.normalizedName = key;
      company.createdAt = isTimestamp(record.createdAt) ? record.createdAt : company.createdAt;
      company.updatedAt = isTimestamp(record.updatedAt) ? record.updatedAt : company.updatedAt;
      COMPANY_TEXT_FIELDS.forEach(function (field) {
        company[field] = trimmed(record[field]);
      });

      byName[key] = company;
      companies.push(company);
      if (trimmed(record.id)) idAliases[trimmed(record.id)] = id;
    });

    return { companies: companies, idAliases: idAliases };
  }

  function normalizeResume(record) {
    var rawScore = record.atsScore === "" || record.atsScore === null || record.atsScore === undefined
      ? null
      : Number(record.atsScore);
    var size = Number(record.size);
    return {
      id: trimmed(record.id),
      name: trimmed(record.name),
      fileName: trimmed(record.fileName),
      uploadedAt: isTimestamp(record.uploadedAt) ? record.uploadedAt : nowStamp(),
      size: Number.isFinite(size) && size > 0 ? size : 0,
      atsScore: Number.isInteger(rawScore) && rawScore >= 0 && rawScore <= 100 ? rawScore : null,
      notes: text(record.notes),
      sample: record.sample === true
    };
  }

  function normalizeResumes(records) {
    var ids = Object.create(null);
    var output = [];
    (Array.isArray(records) ? records : []).forEach(function (record) {
      if (!isObject(record)) return;
      var resume = normalizeResume(record);
      if (!resume.name) return;
      if (!resume.id || ids[resume.id]) resume.id = createId("resume");
      ids[resume.id] = true;
      output.push(resume);
    });
    return output;
  }

  function normalizeSettings(raw) {
    var source = isObject(raw) ? raw : {};
    var theme = THEMES.indexOf(source.theme) >= 0 ? source.theme : DEFAULT_SETTINGS.theme;
    var currency = trimmed(source.currency).toUpperCase();
    if (!CURRENCIES.some(function (entry) { return entry.code === currency; })) currency = DEFAULT_SETTINGS.currency;
    return {
      theme: theme,
      currency: currency,
      lastBackupAt: isTimestamp(source.lastBackupAt) ? source.lastBackupAt : null,
      sampleLoaded: source.sampleLoaded === true
    };
  }

  function resolveTheme(preference, systemPrefersDark) {
    if (preference === "light" || preference === "dark") return preference;
    return systemPrefersDark ? "dark" : "light";
  }

  /* ------------------------------------------------------------------ *
   * Referential integrity
   * ------------------------------------------------------------------ */

  /**
   * Repair the three record sets against each other.
   *
   * Rules:
   * - Applications always resolve their company through companyId, never a name.
   * - A name is only turned into a company when the application has no company
   *   reference at all (legacy or imported data).
   * - A reference to a company that no longer exists keeps its label as
   *   formerCompanyName and is never recreated.
   * - A reference to a resume that no longer exists is cleared, but the stored
   *   snapshot (name, file, ATS score) stays with the application.
   */
  function reconcile(input) {
    var source = isObject(input) ? input : {};
    var stamps = { now: source.now };
    var repairs = [];

    var companyData = normalizeCompanies(source.companies);
    var companies = companyData.companies;
    var idAliases = companyData.idAliases;

    var byId = Object.create(null);
    var byName = Object.create(null);
    companies.forEach(function (company) {
      byId[company.id] = company;
      byName[company.normalizedName] = company;
    });

    var applications = normalizeApplications(source.applications).map(function (application) {
      var repaired = Object.assign({}, application);
      var rawName = repaired.companyName;
      var aliasId = idAliases[repaired.companyId] || repaired.companyId;

      if (aliasId && byId[aliasId]) {
        repaired.companyId = aliasId;
        repaired.companyName = "";
        return repaired;
      }

      if (aliasId) {
        // Dangling company reference: keep what the record said, do not recreate.
        repaired.formerCompanyName = repaired.formerCompanyName || rawName || "Company removed";
        repaired.companyId = "";
        repaired.companyName = "";
        repairs.push({ kind: "dangling-company", id: repaired.id, detail: repaired.formerCompanyName });
        return repaired;
      }

      if (repaired.formerCompanyName) {
        repaired.companyName = "";
        return repaired;
      }

      var key = normalizeCompanyName(rawName);
      var existing = key ? byName[key] : null;
      if (existing) {
        repaired.companyId = existing.id;
        repaired.companyName = "";
        return repaired;
      }

      if (key) {
        var created = makeCompanyRecord(rawName, "", stamps.now);
        byId[created.id] = created;
        byName[key] = created;
        companies.push(created);
        repaired.companyId = created.id;
        repaired.companyName = "";
        repairs.push({ kind: "missing-company", id: repaired.id, detail: created.name });
        return repaired;
      }

      repaired.companyId = "";
      return repaired;
    });

    var resumes = normalizeResumes(source.resumes);
    var resumeIds = Object.create(null);
    resumes.forEach(function (resume) { resumeIds[resume.id] = true; });

    applications = applications.map(function (application) {
      if (application.resumeId && !resumeIds[application.resumeId]) {
        var snapshot = application.resumeSnapshot;
        repairs.push({ kind: "orphan-resume", id: application.id, detail: application.resumeId });
        return Object.assign({}, application, {
          resumeId: "",
          resumeName: application.resumeName || (snapshot && snapshot.name) || ""
        });
      }
      return application;
    });

    return {
      applications: applications,
      companies: companies,
      resumes: resumes,
      settings: normalizeSettings(source.settings),
      repairs: repairs
    };
  }

  /* ------------------------------------------------------------------ *
   * Dashboard maths
   * ------------------------------------------------------------------ */

  function hasStatus(application, status) {
    if (application.status === status) return true;
    return (application.statusHistory || []).some(function (entry) { return entry.status === status; });
  }

  /**
   * True when the record has reached at least the given stage, either now or
   * earlier in its history. Side statuses (Rejected, Withdrawn, On Hold) have
   * no rank, so a rejected application still clears whatever it cleared before.
   */
  function reachedStatus(application, stage) {
    var target = stageRank(stage);
    if (target < 0) return application.status === stage;

    var statuses = [application.status].concat(
      (application.statusHistory || []).map(function (entry) { return entry.status; })
    );

    var ranked = statuses.some(function (status) {
      var rank = stageRank(status);
      return rank >= 0 && rank >= target;
    });
    if (ranked) return true;

    return stage === "Applied" && isIsoDate(application.dateApplied);
  }

  function isSubmitted(application) {
    return application.status !== "Saved";
  }

  function computeStats(applications, options) {
    var list = Array.isArray(applications) ? applications : [];
    var settings = normalizeSettings(options && options.settings);

    var statusCounts = {};
    STATUS_ORDER.forEach(function (status) { statusCounts[status] = 0; });

    var saved = 0;
    var submitted = 0;
    var interviewed = 0;
    var offered = 0;
    var rejected = 0;
    var withdrawn = 0;
    var onHold = 0;
    var closedIds = Object.create(null);
    var contactedCompanyIds = Object.create(null);
    var compensationTotal = 0;
    var compensationCount = 0;
    var otherCurrency = Object.create(null);

    list.forEach(function (application) {
      if (isKnownStatus(application.status)) statusCounts[application.status] += 1;

      if (application.status === "Saved") saved += 1;
      if (isSubmitted(application)) submitted += 1;

      if (reachedStatus(application, "Interviewed")) interviewed += 1;
      if (reachedStatus(application, "Offered")) offered += 1;

      if (hasStatus(application, "Rejected")) { rejected += 1; closedIds[application.id] = true; }
      if (hasStatus(application, "Withdrawn")) { withdrawn += 1; closedIds[application.id] = true; }
      if (application.status === "On Hold") onHold += 1;

      if (reachedStatus(application, "Contacted") && application.companyId) {
        contactedCompanyIds[application.companyId] = true;
      }

      if (!isSubmitted(application)) return;
      var amount = Number(application.compensationAmount);
      if (!application.compensationAmount || !Number.isFinite(amount) || application.paymentFrequency === "Unpaid") return;
      if ((application.currency || "USD") === settings.currency) {
        compensationTotal += amount;
        compensationCount += 1;
      } else {
        var code = application.currency || "USD";
        if (!otherCurrency[code]) otherCurrency[code] = { currency: code, total: 0, count: 0 };
        otherCurrency[code].total += amount;
        otherCurrency[code].count += 1;
      }
    });

    function percent(part, whole) {
      return whole ? Math.round((part / whole) * 100) : 0;
    }

    return {
      total: list.length,
      saved: saved,
      submitted: submitted,
      interviewed: interviewed,
      offered: offered,
      rejected: rejected,
      withdrawn: withdrawn,
      onHold: onHold,
      contactedCompanies: Object.keys(contactedCompanyIds).length,
      active: Math.max(0, submitted - Object.keys(closedIds).length),
      statusCounts: statusCounts,
      compensation: {
        currency: settings.currency,
        total: compensationTotal,
        count: compensationCount,
        others: Object.keys(otherCurrency).map(function (code) { return otherCurrency[code]; })
      },
      conversion: {
        savedToSubmitted: percent(submitted, list.length),
        submittedToInterviewed: percent(interviewed, submitted),
        submittedToOffered: percent(offered, submitted)
      }
    };
  }

  function monthKey(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  }

  /**
   * Submitted and saved are disjoint by definition (saved records have not been
   * submitted), so the two series never double count a record.
   */
  function buildMonthlyActivity(applications, options) {
    var list = Array.isArray(applications) ? applications : [];
    var count = options && options.months ? options.months : 6;
    var now = options && options.now ? new Date(options.now) : new Date();
    if (Number.isNaN(now.getTime())) now = new Date();

    var months = [];
    var index;
    for (index = count - 1; index >= 0; index -= 1) {
      var date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      months.push({
        key: monthKey(date),
        label: new Intl.DateTimeFormat("en", { month: "short" }).format(date),
        year: date.getFullYear(),
        month: date.getMonth()
      });
    }

    var submittedByMonth = months.map(function () { return 0; });
    var savedByMonth = months.map(function () { return 0; });
    var positions = Object.create(null);
    months.forEach(function (month, position) { positions[month.key] = position; });

    list.forEach(function (application) {
      var dateValue = "";
      var bucket;
      if (isSubmitted(application)) {
        dateValue = application.dateApplied || application.dateDiscovered;
        if (!isIsoDate(dateValue)) return;
        bucket = positions[monthKey(new Date(dateValue + "T12:00:00"))];
        if (bucket === undefined) return;
        submittedByMonth[bucket] += 1;
        return;
      }
      dateValue = application.dateDiscovered || application.dateApplied;
      if (!isIsoDate(dateValue)) return;
      bucket = positions[monthKey(new Date(dateValue + "T12:00:00"))];
      if (bucket === undefined) return;
      savedByMonth[bucket] += 1;
    });

    return {
      months: months,
      labels: months.map(function (month) { return month.label; }),
      submitted: submittedByMonth,
      saved: savedByMonth,
      submittedTotal: submittedByMonth.reduce(function (sum, value) { return sum + value; }, 0)
    };
  }

  function buildStatusDistribution(applications) {
    var list = Array.isArray(applications) ? applications : [];
    var total = list.length;
    var counts = {};
    STATUS_ORDER.forEach(function (status) { counts[status] = 0; });
    list.forEach(function (application) {
      if (isKnownStatus(application.status)) counts[application.status] += 1;
    });
    return STATUS_ORDER.map(function (status) {
      return {
        status: status,
        count: counts[status],
        share: total ? counts[status] / total : 0
      };
    });
  }

  /** Sources describe how a submission was found, so saved rows are excluded. */
  function buildSourceDistribution(applications, options) {
    var limit = options && options.limit ? options.limit : 5;
    var counts = Object.create(null);
    (Array.isArray(applications) ? applications : []).forEach(function (application) {
      if (!isSubmitted(application)) return;
      var source = trimmed(application.source) || "Other";
      counts[source] = (counts[source] || 0) + 1;
    });

    var entries = Object.keys(counts).map(function (source) {
      return { source: source, count: counts[source] };
    }).sort(function (first, second) {
      return second.count - first.count || first.source.localeCompare(second.source);
    });

    if (entries.length <= limit) {
      return { rows: entries, total: entries.reduce(function (sum, row) { return sum + row.count; }, 0) };
    }

    var head = entries.slice(0, limit - 1);
    var remainder = entries.slice(limit - 1).reduce(function (sum, row) { return sum + row.count; }, 0);
    head.push({ source: "Other sources", count: remainder });
    return { rows: head, total: entries.reduce(function (sum, row) { return sum + row.count; }, 0) };
  }

  function buildResumeUsage(applications, resumes, options) {
    var list = Array.isArray(applications) ? applications : [];
    var library = Array.isArray(resumes) ? resumes : [];
    var missing = options && options.missingIds ? options.missingIds : {};
    var byId = Object.create(null);
    library.forEach(function (resume) { byId[resume.id] = resume; });

    var groups = Object.create(null);
    var noResume = 0;

    list.forEach(function (application) {
      if (!isSubmitted(application)) return;
      if (!application.resumeId) { noResume += 1; return; }
      var resume = byId[application.resumeId];
      var snapshot = application.resumeSnapshot || {};
      var name = resume ? resume.name : (snapshot.name || application.resumeName || "Resume deleted");
      var key = application.resumeId;
      if (!groups[key]) {
        groups[key] = {
          resumeId: key,
          name: name,
          count: 0,
          state: !resume ? "deleted" : (missing[key] && !resume.sample ? "missing" : "available")
        };
      }
      groups[key].count += 1;
    });

    var rows = Object.keys(groups).map(function (key) { return groups[key]; })
      .sort(function (first, second) { return second.count - first.count || first.name.localeCompare(second.name); });

    return { rows: rows, noResume: noResume };
  }

  /* ------------------------------------------------------------------ *
   * Filtering, sorting, validation
   * ------------------------------------------------------------------ */

  var SCOPES = {
    all: function () { return true; },
    saved: function (application) { return application.status === "Saved"; },
    submitted: function (application) { return application.status !== "Saved"; },
    interviews: function (application) { return reachedStatus(application, "Interviewed"); },
    offers: function (application) { return reachedStatus(application, "Offered"); },
    rejected: function (application) { return hasStatus(application, "Rejected"); },
    withdrawn: function (application) { return hasStatus(application, "Withdrawn"); },
    contacted: function (application) { return reachedStatus(application, "Contacted"); }
  };

  function companyNameOf(application, companyName) {
    if (typeof companyName === "function") {
      var resolved = companyName(application);
      if (resolved) return resolved;
    }
    return trimmed(application.formerCompanyName) || trimmed(application.companyName) || "";
  }

  function filterApplications(applications, filters, context) {
    var list = Array.isArray(applications) ? applications : [];
    var options = filters || {};
    var nameOf = context && context.companyName;
    var query = trimmed(options.query).toLocaleLowerCase();
    var scope = SCOPES[options.scope] ? options.scope : "all";
    var status = trimmed(options.status);

    return list.filter(function (application) {
      if (!SCOPES[scope](application)) return false;

      if (status === "__submitted__" && application.status === "Saved") return false;
      else if (status && status !== "__submitted__" && application.status !== status) return false;

      if (options.companyId) {
        if (options.companyId === "__unassigned__") {
          if (application.companyId) return false;
        } else if (application.companyId !== options.companyId) return false;
      }

      if (options.jobType && application.jobType !== options.jobType) return false;
      if (options.workMode && application.workMode !== options.workMode) return false;
      if (options.source && application.source !== options.source) return false;
      if (options.resumeId && application.resumeId !== options.resumeId) return false;

      if (!query) return true;
      var haystack = [
        application.title,
        companyNameOf(application, nameOf),
        application.location,
        application.workMode,
        application.status,
        application.source,
        application.jobType,
        application.notes
      ].join(" ").toLocaleLowerCase();
      return haystack.indexOf(query) >= 0;
    });
  }

  var SORTERS = {
    "date-desc": function (first, second) {
      var left = first.application.dateApplied || first.application.dateDiscovered;
      var right = second.application.dateApplied || second.application.dateDiscovered;
      return right.localeCompare(left);
    },
    "date-asc": function (first, second) {
      var left = first.application.dateApplied || first.application.dateDiscovered;
      var right = second.application.dateApplied || second.application.dateDiscovered;
      return left.localeCompare(right);
    },
    "company-asc": function (first, second) {
      return first.label.localeCompare(second.label);
    },
    "title-asc": function (first, second) {
      return first.application.title.localeCompare(second.application.title);
    }
  };

  function sortApplications(applications, sort, context) {
    var nameOf = context && context.companyName;
    var entries = (Array.isArray(applications) ? applications : []).map(function (application) {
      return { application: application, label: companyNameOf(application, nameOf) };
    });
    entries.sort(SORTERS[sort] || SORTERS["date-desc"]);
    return entries.map(function (entry) { return entry.application; });
  }

  function isValidHttpUrl(value) {
    if (!value) return true;
    try {
      var parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (error) {
      return false;
    }
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed(value));
  }

  function validateApplication(values, options) {
    var input = values || {};
    var today = (options && options.today) || todayISO();
    var errors = {};
    var status = input.status;

    if (!trimmed(input.title)) errors.title = "Enter the job title.";
    else if (trimmed(input.title).length > 140) errors.title = "Keep the job title under 140 characters.";

    if (JOB_TYPES.indexOf(input.jobType) < 0) errors.jobType = "Choose a job type.";

    if (!trimmed(input.companyName)) errors.companyName = "Enter or choose a company.";

    if (!trimmed(input.source)) errors.source = "Choose where you found this role.";

    if (status && !isKnownStatus(status)) errors.status = "Choose a valid status.";

    if (trimmed(input.dateDiscovered)) {
      if (!isIsoDate(input.dateDiscovered)) errors.dateDiscovered = "Enter a valid date.";
      else if (input.dateDiscovered > today) errors.dateDiscovered = "The discovery date cannot be in the future.";
    }

    if (status && status !== "Saved") {
      if (!trimmed(input.dateApplied)) errors.dateApplied = "Add the date you applied.";
      else if (!isIsoDate(input.dateApplied)) errors.dateApplied = "Enter a valid application date.";
      else if (input.dateApplied > today) errors.dateApplied = "The application date cannot be in the future.";
      else if (isIsoDate(input.dateDiscovered) && input.dateApplied < input.dateDiscovered) {
        errors.dateApplied = "The application date cannot be before the discovery date.";
      }
    } else if (trimmed(input.dateApplied) && !isIsoDate(input.dateApplied)) {
      errors.dateApplied = "Enter a valid application date.";
    }

    ["deadline", "followUpDate"].forEach(function (field) {
      if (trimmed(input[field]) && !isIsoDate(input[field])) errors[field] = "Enter a valid date.";
    });

    if (trimmed(input.listingUrl) && !isValidHttpUrl(input.listingUrl)) {
      errors.listingUrl = "Enter a full link starting with http:// or https://.";
    }

    if (trimmed(input.compensationAmount)) {
      var amount = Number(input.compensationAmount);
      if (!Number.isFinite(amount) || amount < 0) errors.compensationAmount = "Enter a number of 0 or more.";
    }

    if (trimmed(input.hoursPerDay)) {
      var hours = Number(input.hoursPerDay);
      if (!Number.isFinite(hours) || hours < 0 || hours > 24) errors.hoursPerDay = "Hours per day must be between 0 and 24.";
    }

    return { valid: Object.keys(errors).length === 0, errors: errors };
  }

  function validateCompany(values) {
    var input = values || {};
    var errors = {};

    if (!trimmed(input.name)) errors.name = "Enter the company name.";
    else if (trimmed(input.name).length > 120) errors.name = "Keep the company name under 120 characters.";

    if (trimmed(input.website) && !isValidHttpUrl(input.website)) {
      errors.website = "Enter a full link starting with http:// or https://.";
    }
    if (trimmed(input.careersUrl) && !isValidHttpUrl(input.careersUrl)) {
      errors.careersUrl = "Enter a full link starting with http:// or https://.";
    }
    if (trimmed(input.logo) && !isValidHttpUrl(input.logo)) {
      errors.logo = "Enter a full image link starting with http:// or https://.";
    }
    if (trimmed(input.linkedInUrl) && !isValidHttpUrl(input.linkedInUrl)) {
      errors.linkedInUrl = "Enter a full link starting with http:// or https://.";
    }
    if (trimmed(input.contactEmail) && !isValidEmail(input.contactEmail)) {
      errors.contactEmail = "Enter a valid email address.";
    }

    return { valid: Object.keys(errors).length === 0, errors: errors };
  }

  function validateResume(values, options) {
    var input = values || {};
    var fileRequired = Boolean(options && options.fileRequired);
    var file = options && options.file;
    var maxBytes = options && options.maxBytes ? options.maxBytes : MAX_RESUME_BYTES;
    var errors = {};

    if (!trimmed(input.name)) errors.name = "Give this resume version a name.";
    else if (trimmed(input.name).length > 100) errors.name = "Keep the name under 100 characters.";

    if (trimmed(input.notes).length > 4000) errors.notes = "Keep notes under 4,000 characters.";

    if (trimmed(input.atsScore) !== "") {
      var score = Number(input.atsScore);
      if (!Number.isInteger(score) || score < 0 || score > 100) errors.atsScore = "Enter a whole number from 0 to 100.";
    }

    if (fileRequired && !file) {
      errors.file = "Choose a PDF file to upload.";
    } else if (file) {
      var isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
      if (!isPdf) errors.file = "Only PDF resumes can be uploaded.";
      else if (!file.size) errors.file = "This file is empty.";
      else if (file.size > maxBytes) errors.file = "Resume files must be 20 MB or smaller.";
    }

    return { valid: Object.keys(errors).length === 0, errors: errors };
  }

  /* ------------------------------------------------------------------ *
   * Exports and backups
   * ------------------------------------------------------------------ */

  function csvCell(value) {
    var raw = text(value);
    return '"' + raw.replace(/"/g, '""') + '"';
  }

  function buildCsv(applications, context) {
    var nameOf = context && context.companyName;
    var headers = [
      "Job title", "Company", "Job type", "Work mode", "Location", "Status", "Source",
      "Date discovered", "Date applied", "Deadline", "Follow-up date",
      "Currency", "Compensation", "Payment frequency", "Resume", "Listing URL", "Skills", "Notes"
    ];

    var lines = [headers.map(csvCell).join(",")];

    (Array.isArray(applications) ? applications : []).forEach(function (application) {
      var snapshot = application.resumeSnapshot || {};
      lines.push([
        application.title,
        companyNameOf(application, nameOf),
        application.jobType,
        application.workMode,
        application.location,
        application.status,
        application.source,
        application.dateDiscovered,
        application.dateApplied,
        application.deadline,
        application.followUpDate,
        application.currency,
        application.compensationAmount,
        application.paymentFrequency,
        application.resumeId ? (snapshot.name || application.resumeName) : "",
        application.listingUrl,
        (application.skills || []).join("; "),
        application.notes
      ].map(csvCell).join(","));
    });

    return "\uFEFF" + lines.join("\r\n");
  }

  function base64FromBytes(bytes) {
    if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
      return Buffer.from(bytes).toString("base64");
    }
    var binary = "";
    var chunk = 0x8000;
    for (var index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
    }
    return btoa(binary);
  }

  function bytesFromBase64(encoded) {
    if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
      return new Uint8Array(Buffer.from(encoded, "base64"));
    }
    var binary = atob(encoded);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function stampForFileName(now) {
    var date = now ? new Date(now) : new Date();
    if (Number.isNaN(date.getTime())) date = new Date();
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) +
      "-" + pad(date.getHours()) + pad(date.getMinutes());
  }

  function backupFileName(now) {
    return "applytrack-backup-" + stampForFileName(now) + ".json";
  }

  function csvFileName(now) {
    return "applytrack-applications-" + stampForFileName(now) + ".csv";
  }

  /**
   * A backup is one JSON document: a manifest, the records, and every uploaded
   * PDF as base64 so a restore does not depend on the original browser.
   */
  function buildBackup(input) {
    var source = input || {};
    var applications = Array.isArray(source.applications) ? source.applications : [];
    var companies = Array.isArray(source.companies) ? source.companies : [];
    var resumes = Array.isArray(source.resumes) ? source.resumes : [];
    var files = Array.isArray(source.files) ? source.files : [];
    var exportedAt = nowStamp(source.now);

    var encodedFiles = files.map(function (file) {
      var bytes = file.bytes;
      if (!(bytes instanceof Uint8Array)) {
        bytes = new Uint8Array(bytes || []);
      }
      return {
        id: text(file.id),
        fileName: text(file.fileName),
        mimeType: text(file.mimeType) || "application/pdf",
        size: Number(file.size) || bytes.length,
        base64: base64FromBytes(bytes)
      };
    });

    return {
      format: "applytrack-backup",
      schemaVersion: SCHEMA_VERSION,
      app: { name: APP_NAME, version: "1.0.0" },
      exportedAt: exportedAt,
      counts: {
        applications: applications.length,
        companies: companies.length,
        resumes: resumes.length,
        pdfs: encodedFiles.length
      },
      data: {
        applications: applications,
        companies: companies,
        resumes: resumes,
        settings: normalizeSettings(source.settings)
      },
      files: encodedFiles
    };
  }

  function parseBackup(rawText) {
    if (typeof rawText !== "string" || !rawText.trim()) {
      return { ok: false, error: "That file is empty." };
    }

    var parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      return { ok: false, error: "That file is not valid JSON. Choose an Sift backup file." };
    }

    if (!isObject(parsed)) return { ok: false, error: "That file is not an Sift backup." };
    if (parsed.format !== "applytrack-backup") {
      return { ok: false, error: "That file is not an Sift backup." };
    }
    if (!Number.isInteger(parsed.schemaVersion) || parsed.schemaVersion < 1) {
      return { ok: false, error: "The backup is missing a readable format version." };
    }
    if (parsed.schemaVersion > SCHEMA_VERSION) {
      return { ok: false, error: "This backup was made by a newer version of Sift." };
    }
    if (!isObject(parsed.data)) return { ok: false, error: "The backup does not contain any records." };

    var data = parsed.data;
    if (!Array.isArray(data.applications) || !Array.isArray(data.companies) || !Array.isArray(data.resumes)) {
      return { ok: false, error: "The backup is missing its application, company or resume records." };
    }

    var files = [];
    var errors = [];
    (Array.isArray(parsed.files) ? parsed.files : []).forEach(function (file) {
      if (!isObject(file) || !trimmed(file.id) || typeof file.base64 !== "string") return;
      try {
        var bytes = bytesFromBase64(file.base64);
        files.push({
          id: trimmed(file.id),
          fileName: trimmed(file.fileName) || "resume.pdf",
          mimeType: trimmed(file.mimeType) || "application/pdf",
          size: bytes.length,
          bytes: bytes
        });
      } catch (error) {
        errors.push("A stored PDF could not be decoded and will be skipped.");
      }
    });

    return {
      ok: true,
      error: "",
      warning: errors.join(" "),
      counts: {
        applications: data.applications.length,
        companies: data.companies.length,
        resumes: data.resumes.length,
        pdfs: files.length
      },
      exportedAt: isTimestamp(parsed.exportedAt) ? parsed.exportedAt : "",
      backup: parsed,
      data: {
        applications: data.applications,
        companies: data.companies,
        resumes: data.resumes,
        settings: data.settings
      },
      files: files
    };
  }

  /* ------------------------------------------------------------------ *
   * Sample data
   * ------------------------------------------------------------------ */

  /**
   * Dates are generated relative to `now` and every status history is
   * consistent with the record's current status, so charts and counts agree.
   */
  function buildSampleData(options) {
    var now = options && options.now ? new Date(options.now) : new Date();
    if (Number.isNaN(now.getTime())) now = new Date();

    function monthsAgo(months, day) {
      return toIsoDate(new Date(now.getFullYear(), now.getMonth() - months, day));
    }
    function stamp(months, day, hour) {
      var date = new Date(now.getFullYear(), now.getMonth() - months, day, hour || 10, 0, 0);
      return date.toISOString();
    }
    function historyFor(steps) {
      return steps.map(function (step) {
        return { status: step[0], at: step[1] };
      });
    }

    var companySeeds = [
      { id: "company-sample-northwind", name: "Northwind Analytics", industry: "Data and analytics", location: "Boston, MA", size: "201–500 employees", website: "https://northwind.example.com", careersUrl: "https://northwind.example.com/careers", contactPerson: "Priya Raman", contactDesignation: "University recruiting lead", contactEmail: "priya@northwind.example.com", description: "Analytics platform for mid-market logistics teams. Interns join a product squad for the full term." },
      { id: "company-sample-brightline", name: "Brightline Health", industry: "Health technology", location: "Remote", size: "51–200 employees", website: "https://brightline.example.com", careersUrl: "https://brightline.example.com/jobs", contactPerson: "Daniel Okafor", contactDesignation: "Design manager", contactEmail: "daniel@brightline.example.com", description: "Patient scheduling tools used by outpatient clinics." },
      { id: "company-sample-fieldwork", name: "Fieldwork Studio", industry: "Design and research", location: "Chicago, IL", size: "11–50 employees", website: "https://fieldwork.example.com", careersUrl: "https://fieldwork.example.com/join", description: "Research and service design studio working with civic clients." },
      { id: "company-sample-kestrel", name: "Kestrel Robotics", industry: "Hardware and robotics", location: "Pittsburgh, PA", size: "201–500 employees", website: "https://kestrel.example.com", careersUrl: "https://kestrel.example.com/careers", contactPerson: "Alina Fischer", contactDesignation: "Technical recruiter", contactEmail: "alina@kestrel.example.com", description: "Warehouse robotics with a small internship cohort each summer." },
      { id: "company-sample-lumen", name: "Lumen Payments", industry: "Financial technology", location: "New York, NY", size: "501–1,000 employees", website: "https://lumen.example.com", careersUrl: "https://lumen.example.com/careers", description: "Payments infrastructure for independent retailers." }
    ];

    var companies = companySeeds.map(function (seed) {
      var record = makeCompanyRecord(seed.name, seed.id);
      COMPANY_TEXT_FIELDS.forEach(function (field) {
        if (seed[field] !== undefined) record[field] = seed[field];
      });
      record.createdAt = stamp(6, 2, 9);
      record.updatedAt = stamp(1, 4, 9);
      return record;
    });

    var resumes = [
      {
        id: "resume-sample-product", name: "Product design — Fall 2026", fileName: "product-design-fall-2026.pdf",
        uploadedAt: stamp(5, 12, 11), size: 0, atsScore: 82, sample: true,
        notes: "Case studies led by the logistics dashboard rebuild."
      },
      {
        id: "resume-sample-analytics", name: "Data analysis — general", fileName: "data-analysis-general.pdf",
        uploadedAt: stamp(4, 3, 16), size: 0, atsScore: 74, sample: true,
        notes: "SQL and Python projects, one research assistantship."
      },
      {
        id: "resume-sample-research", name: "UX research — one page", fileName: "ux-research-one-page.pdf",
        uploadedAt: stamp(2, 8, 10), size: 0, atsScore: null, sample: true,
        notes: "Condensed for research-only postings."
      }
    ];

    function application(config) {
      var createdAt = config.createdAt;
      var updatedAt = config.updatedAt || createdAt;
      return normalizeApplication({
        id: "application-sample-" + config.slug,
        companyId: config.companyId,
        title: config.title,
        jobType: "Internship",
        description: config.description || "",
        listingUrl: config.listingUrl || "",
        skills: config.skills || [],
        location: config.location,
        workMode: config.workMode,
        compensationAmount: config.compensationAmount,
        currency: "USD",
        paymentFrequency: config.paymentFrequency || "Hourly",
        duration: config.duration || "12 weeks",
        hoursPerDay: "8",
        source: config.source,
        status: config.status,
        statusHistory: historyFor(config.history),
        dateDiscovered: config.dateDiscovered,
        dateApplied: config.dateApplied || "",
        deadline: config.deadline || "",
        followUpDate: config.followUpDate || "",
        resumeId: config.resumeId || "",
        resumeName: "",
        resumeSnapshot: config.resumeId
          ? resumes.reduce(function (found, resume) {
            if (found || resume.id !== config.resumeId) return found;
            return { name: resume.name, fileName: resume.fileName, uploadedAt: resume.uploadedAt, atsScore: resume.atsScore };
          }, null)
          : null,
        notes: config.notes || "",
        createdAt: createdAt,
        updatedAt: updatedAt
      });
    }

    var applications = [
      application({
        slug: "northwind-product", companyId: "company-sample-northwind", title: "Product Design Intern",
        location: "Boston, MA", workMode: "Hybrid", compensationAmount: "32", source: "LinkedIn",
        status: "Offered", dateDiscovered: monthsAgo(5, 6), dateApplied: monthsAgo(5, 9),
        resumeId: "resume-sample-product", skills: ["Figma", "Design systems", "Usability testing"],
        description: "Twelve-week internship on the scheduling squad, owning one workflow end to end.",
        listingUrl: "https://northwind.example.com/careers/product-design-intern",
        notes: "Offer received. Decision needed before the deadline.",
        createdAt: stamp(5, 6, 9), updatedAt: stamp(0, 12, 15),
        history: [["Saved", stamp(5, 6, 9)], ["Applied", stamp(5, 9, 10)], ["Contacted", stamp(4, 26, 11)], ["Interviewed", stamp(3, 18, 14)], ["Offered", stamp(0, 12, 15)]]
      }),
      application({
        slug: "brightline-ux", companyId: "company-sample-brightline", title: "UX Research Intern",
        location: "Remote", workMode: "Remote", compensationAmount: "28", source: "Referral",
        status: "Interviewed", dateDiscovered: monthsAgo(3, 14), dateApplied: monthsAgo(3, 17),
        resumeId: "resume-sample-research", skills: ["Interviewing", "Synthesis", "Survey design"],
        description: "Mixed-methods research supporting a clinic onboarding redesign.",
        notes: "Second round scheduled with the design manager.",
        createdAt: stamp(3, 14, 9), updatedAt: stamp(0, 6, 12),
        history: [["Saved", stamp(3, 14, 9)], ["Applied", stamp(3, 17, 10)], ["Interviewed", stamp(0, 6, 12)]]
      }),
      application({
        slug: "kestrel-software", companyId: "company-sample-kestrel", title: "Software Engineering Intern",
        location: "Pittsburgh, PA", workMode: "On-site", compensationAmount: "36", source: "Company website",
        status: "Interviewed", dateDiscovered: monthsAgo(4, 2), dateApplied: monthsAgo(4, 5),
        resumeId: "resume-sample-analytics", skills: ["Python", "C++", "ROS"],
        description: "Firmware tooling for the warehouse fleet.",
        listingUrl: "https://kestrel.example.com/careers/software-engineering-intern",
        createdAt: stamp(4, 2, 8), updatedAt: stamp(1, 9, 13),
        history: [["Saved", stamp(4, 2, 8)], ["Applied", stamp(4, 5, 9)], ["Contacted", stamp(3, 26, 11)], ["Interviewed", stamp(1, 9, 13)]]
      }),
      application({
        slug: "lumen-analyst", companyId: "company-sample-lumen", title: "Product Analyst Intern",
        location: "New York, NY", workMode: "Hybrid", compensationAmount: "42", source: "Handshake",
        status: "Rejected", dateDiscovered: monthsAgo(4, 20), dateApplied: monthsAgo(4, 23),
        resumeId: "resume-sample-analytics", skills: ["SQL", "Experimentation"],
        description: "Analytics rotation across risk and merchant experience.",
        notes: "Rejected after the first round. Asked to reapply next cycle.",
        createdAt: stamp(4, 20, 9), updatedAt: stamp(2, 15, 10),
        history: [["Saved", stamp(4, 20, 9)], ["Applied", stamp(4, 23, 9)], ["Interviewed", stamp(3, 12, 14)], ["Rejected", stamp(2, 15, 10)]]
      }),
      application({
        slug: "fieldwork-research", companyId: "company-sample-fieldwork", title: "Design Research Intern",
        location: "Chicago, IL", workMode: "Hybrid", compensationAmount: "24", source: "Networking",
        status: "Applied", dateDiscovered: monthsAgo(2, 2), dateApplied: monthsAgo(2, 6),
        resumeId: "resume-sample-research", skills: ["Field research", "Affinity mapping"],
        description: "Civic service design projects with two partner agencies.",
        createdAt: stamp(2, 2, 9), updatedAt: stamp(2, 6, 9),
        history: [["Saved", stamp(2, 2, 9)], ["Applied", stamp(2, 6, 9)]]
      }),
      application({
        slug: "northwind-analyst", companyId: "company-sample-northwind", title: "Analytics Intern",
        location: "Boston, MA", workMode: "Hybrid", compensationAmount: "30", source: "Company website",
        status: "Applied", dateDiscovered: monthsAgo(1, 4), dateApplied: monthsAgo(1, 8),
        resumeId: "resume-sample-analytics", skills: ["SQL", "dbt", "Dashboarding"],
        description: "Second role at Northwind, reporting into the analytics team.",
        notes: "Applied to a second team after the design offer.",
        createdAt: stamp(1, 4, 9), updatedAt: stamp(1, 8, 9),
        history: [["Saved", stamp(1, 4, 9)], ["Applied", stamp(1, 8, 9)]]
      }),
      application({
        slug: "brightline-product", companyId: "company-sample-brightline", title: "Product Intern",
        location: "Remote", workMode: "Remote", compensationAmount: "26", source: "LinkedIn",
        status: "Contacted", dateDiscovered: monthsAgo(1, 16), dateApplied: monthsAgo(1, 19),
        resumeId: "resume-sample-product", skills: ["Roadmapping", "Analytics"],
        description: "Product operations work across the scheduling roadmap.",
        followUpDate: monthsAgo(0, 2),
        createdAt: stamp(1, 16, 9), updatedAt: stamp(0, 3, 11),
        history: [["Saved", stamp(1, 16, 9)], ["Applied", stamp(1, 19, 9)], ["Contacted", stamp(0, 3, 11)]]
      }),
      application({
        slug: "fieldwork-visual", companyId: "company-sample-fieldwork", title: "Visual Design Intern",
        location: "Chicago, IL", workMode: "On-site", compensationAmount: "22", source: "Referral",
        status: "Withdrawn", dateDiscovered: monthsAgo(3, 25), dateApplied: monthsAgo(3, 28),
        resumeId: "resume-sample-product", skills: ["Typography", "Editorial layout"],
        description: "Brand and editorial support for civic campaigns.",
        notes: "Withdrew after accepting the Northwind offer.",
        createdAt: stamp(3, 25, 9), updatedAt: stamp(1, 22, 16),
        history: [["Saved", stamp(3, 25, 9)], ["Applied", stamp(3, 28, 9)], ["Interviewed", stamp(2, 20, 13)], ["Withdrawn", stamp(1, 22, 16)]]
      }),
      application({
        slug: "kestrel-hardware", companyId: "company-sample-kestrel", title: "Hardware Engineering Intern",
        location: "Pittsburgh, PA", workMode: "On-site", compensationAmount: "34", source: "Handshake",
        status: "On Hold", dateDiscovered: monthsAgo(2, 11), dateApplied: monthsAgo(2, 14),
        resumeId: "resume-sample-analytics", skills: ["CAD", "PCB design"],
        description: "Sensor integration for the next generation of picking arms.",
        notes: "Recruiter paused the process until headcount is confirmed.",
        createdAt: stamp(2, 11, 9), updatedAt: stamp(0, 4, 10),
        history: [["Saved", stamp(2, 11, 9)], ["Applied", stamp(2, 14, 9)], ["Contacted", stamp(1, 26, 10)], ["On Hold", stamp(0, 4, 10)]]
      }),
      application({
        slug: "lumen-design", companyId: "company-sample-lumen", title: "Design Systems Intern",
        location: "New York, NY", workMode: "Hybrid", compensationAmount: "38", source: "Company website",
        status: "Saved", dateDiscovered: monthsAgo(0, 9),
        resumeId: "", skills: ["Design tokens", "Accessibility"],
        description: "Component library maintenance across three product surfaces.",
        deadline: monthsAgo(-1, 5),
        notes: "Portfolio link needed before applying.",
        createdAt: stamp(0, 9, 9), updatedAt: stamp(0, 9, 9),
        history: [["Saved", stamp(0, 9, 9)]]
      }),
      application({
        slug: "northwind-marketing", companyId: "company-sample-northwind", title: "Growth Marketing Intern",
        location: "Remote", workMode: "Remote", compensationAmount: "25", source: "Indeed",
        status: "Saved", dateDiscovered: monthsAgo(1, 27),
        resumeId: "", skills: ["Lifecycle marketing", "Copywriting"],
        description: "Campaign experiments for the self-serve funnel.",
        createdAt: stamp(1, 27, 9), updatedAt: stamp(1, 27, 9),
        history: [["Saved", stamp(1, 27, 9)]]
      }),
      application({
        slug: "brightline-ops", companyId: "company-sample-brightline", title: "Operations Intern",
        location: "Remote", workMode: "Remote", compensationAmount: "23", source: "Indeed",
        status: "Rejected", dateDiscovered: monthsAgo(2, 24), dateApplied: monthsAgo(2, 27),
        resumeId: "resume-sample-analytics", skills: ["Process mapping", "Spreadsheets"],
        description: "Clinic onboarding operations and documentation.",
        createdAt: stamp(2, 24, 9), updatedAt: stamp(1, 18, 10),
        history: [["Saved", stamp(2, 24, 9)], ["Applied", stamp(2, 27, 9)], ["Rejected", stamp(1, 18, 10)]]
      })
    ];

    return { applications: applications, companies: companies, resumes: resumes };
  }

  /* ------------------------------------------------------------------ *
   * Public API
   * ------------------------------------------------------------------ */

  var api = {
    APP_NAME: APP_NAME,
    SCHEMA_VERSION: SCHEMA_VERSION,
    STORAGE_KEYS: STORAGE_KEYS,
    RESUME_DB: RESUME_DB,
    STATUS_ORDER: STATUS_ORDER,
    STATUS_CHAIN: STATUS_CHAIN,
    SIDE_STATUSES: SIDE_STATUSES,
    JOB_TYPES: JOB_TYPES,
    WORK_MODES: WORK_MODES,
    PAYMENT_FREQUENCIES: PAYMENT_FREQUENCIES,
    SOURCES: SOURCES,
    CURRENCIES: CURRENCIES,
    THEMES: THEMES,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    MAX_RESUME_BYTES: MAX_RESUME_BYTES,

    createId: createId,
    cleanCompanyName: cleanCompanyName,
    normalizeCompanyName: normalizeCompanyName,
    isIsoDate: isIsoDate,
    isTimestamp: isTimestamp,
    todayISO: todayISO,
    nowStamp: nowStamp,
    normalizeStatus: normalizeStatus,
    normalizeSettings: normalizeSettings,
    resolveTheme: resolveTheme,
    createStore: createStore,
    describeStorageError: describeStorageError,

    normalizeApplication: normalizeApplication,
    normalizeApplications: normalizeApplications,
    normalizeCompany: function (record) {
      var result = normalizeCompanies(record ? [record] : []);
      return result.companies[0] || null;
    },
    normalizeCompanies: normalizeCompanies,
    makeCompanyRecord: makeCompanyRecord,
    normalizeResume: normalizeResume,
    normalizeResumes: normalizeResumes,
    reconcile: reconcile,

    hasStatus: hasStatus,
    reachedStatus: reachedStatus,
    isSubmitted: isSubmitted,
    computeStats: computeStats,
    buildMonthlyActivity: buildMonthlyActivity,
    buildStatusDistribution: buildStatusDistribution,
    buildSourceDistribution: buildSourceDistribution,
    buildResumeUsage: buildResumeUsage,

    filterApplications: filterApplications,
    sortApplications: sortApplications,
    validateApplication: validateApplication,
    validateCompany: validateCompany,
    validateResume: validateResume,
    isValidHttpUrl: isValidHttpUrl,
    isValidEmail: isValidEmail,

    buildCsv: buildCsv,
    buildBackup: buildBackup,
    parseBackup: parseBackup,
    backupFileName: backupFileName,
    csvFileName: csvFileName,
    buildSampleData: buildSampleData
  };

  return api;
});
