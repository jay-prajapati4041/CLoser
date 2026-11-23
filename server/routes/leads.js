// Lead routes only return records owned by the authenticated user.
import express from "express";
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();
const LEAD_FIELDS = new Set([
  "company",
  "contactPerson",
  "phone",
  "email",
  "city",
  "status",
  "nextFollowUpDate",
]);
const LEAD_STATUSES = new Set(["New", "Contacted", "Meeting", "Won", "Lost"]);
const FIELD_LIMITS = {
  company: 160,
  contactPerson: 120,
  phone: 40,
  email: 254,
  city: 100,
};

// Convert Mongo documents into a stable API shape with string IDs for the client.
function serializeLead(lead) {
  const values = typeof lead.toObject === "function" ? lead.toObject() : lead;
  const id = String(values._id);
  return { ...values, _id: id, id };
}

// Escape user text before MongoDB uses it as a regular expression.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Parse CSV fields while preserving quoted commas and escaped double quotes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  return rows;
}

function normalizeHeader(header) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function csvValue(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

// Validate and normalize client fields; ownership is always assigned from the session.
function validateLeadInput(body, { creating = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Send lead details as a JSON object." };
  }

  const keys = Object.keys(body);
  const unknownFields = keys.filter((key) => !LEAD_FIELDS.has(key));
  if (unknownFields.length) {
    return { error: `Unknown lead field: ${unknownFields[0]}.` };
  }
  if (!creating && keys.length === 0) {
    return { error: "Provide at least one field to update." };
  }

  const values = {};
  for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
    if (!(field in body)) continue;
    if (typeof body[field] !== "string") {
      return { error: `${field} must be text.` };
    }
    const value = body[field].trim();
    if (value.length > limit) {
      return { error: `${field} must be ${limit} characters or fewer.` };
    }
    values[field] = value;
  }

  if (creating && !values.company) {
    return { error: "Company name is required." };
  }
  if ("company" in body && !values.company) {
    return { error: "Company name is required." };
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    return { error: "Enter a valid contact email address." };
  }

  if ("status" in body) {
    if (typeof body.status !== "string" || !LEAD_STATUSES.has(body.status)) {
      return { error: "Choose a valid lead status." };
    }
    values.status = body.status;
  } else if (creating) {
    values.status = "New";
  }

  if ("nextFollowUpDate" in body) {
    const date = body.nextFollowUpDate;
    if (date === null || date === "") {
      values.nextFollowUpDate = null;
    } else if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const parsed = new Date(`${date}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
        return { error: "Enter a valid follow-up date." };
      }
      values.nextFollowUpDate = parsed;
    } else {
      return { error: "Follow-up date must use YYYY-MM-DD format." };
    }
  }

  return { values };
}

// List the signed-in user's leads with MongoDB search, filters, and sorting.
router.get("/", requireAuth, async (req, res) => {
  const query = { owner: req.user._id };
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
  const city = typeof req.query.city === "string" ? req.query.city.trim() : "";

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    query.$or = [
      { company: searchRegex },
      { contactPerson: searchRegex },
      { phone: searchRegex },
    ];
  }
  if (LEAD_STATUSES.has(status)) {
    query.status = status;
  }
  if (city) {
    query.city = new RegExp(`^${escapeRegex(city)}$`, "i");
  }

  const sortOptions = {
    followUpAsc: { nextFollowUpDate: 1 },
    followUpDesc: { nextFollowUpDate: -1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
  };
  const sort = sortOptions[req.query.sort] || { updatedAt: -1 };
  const leads = await Lead.find(query).sort(sort);
  res.json({ leads: leads.map(serializeLead) });
});

// Return scheduled reminders only; terminal deals are not active follow-ups.
router.get("/follow-ups", requireAuth, async (req, res) => {
  const leads = await Lead.find({
    owner: req.user._id,
    status: { $nin: ["Won", "Lost"] },
    nextFollowUpDate: { $ne: null },
  }).sort({ nextFollowUpDate: 1 });
  return res.json({ leads: leads.map(serializeLead) });
});

// Import valid CSV rows and report duplicates or invalid records individually.
router.post(
  "/import",
  requireAuth,
  express.text({ type: ["text/csv", "application/vnd.ms-excel"], limit: "5mb" }),
  async (req, res) => {
    const text = typeof req.body === "string" ? req.body.replace(/^\uFEFF/, "") : "";
    const rows = parseCsv(text);
    if (rows.length < 2) {
      return res.status(400).json({ error: "The CSV file is empty or has no header row." });
    }

    const headers = rows[0].map(normalizeHeader);
    const companyIndex = headers.findIndex((header) => header === "company" || header === "companyname");
    if (companyIndex === -1) {
      return res.status(400).json({ error: "Required column 'companyName' is missing." });
    }
    const columnIndex = (name) => headers.findIndex((header) => header === normalizeHeader(name));
    const contactIndex = columnIndex("contactPerson");
    const phoneIndex = columnIndex("phone");
    const emailIndex = columnIndex("email");
    const cityIndex = columnIndex("city");
    const statusIndex = columnIndex("status");
    const dateIndex = columnIndex("nextFollowUpDate");

    const existing = await Lead.find({ owner: req.user._id }).sort({ createdAt: -1 });
    const seen = new Set(existing.map((lead) => {
      const values = typeof lead.toObject === "function" ? lead.toObject() : lead;
      return `${String(values.company || "").trim().toLowerCase()}|${String(values.phone || "").trim()}|${String(values.email || "").trim().toLowerCase()}`;
    }));
    const successful = [];
    const failed = [];

    for (let rowNumber = 1; rowNumber < rows.length; rowNumber += 1) {
      const row = rows[rowNumber];
      const getValue = (index) => index >= 0 ? String(row[index] || "").trim() : "";
      const body = {
        company: getValue(companyIndex),
        contactPerson: getValue(contactIndex),
        phone: getValue(phoneIndex),
        email: getValue(emailIndex),
        city: getValue(cityIndex),
        status: getValue(statusIndex) || "New",
        nextFollowUpDate: getValue(dateIndex) || null,
      };
      const { values, error } = validateLeadInput(body, { creating: true });

      if (error) {
        failed.push({ row: rowNumber + 1, reason: error });
        continue;
      }
      const duplicateKey = `${values.company.toLowerCase()}|${values.phone}|${values.email.toLowerCase()}`;
      if (seen.has(duplicateKey)) {
        failed.push({ row: rowNumber + 1, reason: "Duplicate lead." });
        continue;
      }

      try {
        const lead = await Lead.create({ ...values, owner: req.user._id });
        seen.add(duplicateKey);
        successful.push(serializeLead(lead));
      } catch {
        failed.push({ row: rowNumber + 1, reason: "Could not save lead." });
      }
    }

    return res.status(successful.length ? 201 : 200).json({
      imported: successful.length,
      failed: failed.length,
      leads: successful,
      errors: failed,
    });
  }
);

// Export the signed-in user's filtered leads as a downloadable CSV file.
router.get("/export.csv", requireAuth, async (req, res) => {
  const query = { owner: req.user._id };
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
  const city = typeof req.query.city === "string" ? req.query.city.trim() : "";

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    query.$or = [
      { company: searchRegex },
      { contactPerson: searchRegex },
      { phone: searchRegex },
    ];
  }
  if (LEAD_STATUSES.has(status)) query.status = status;
  if (city) query.city = new RegExp(`^${escapeRegex(city)}$`, "i");

  const sortOptions = {
    followUpAsc: { nextFollowUpDate: 1 },
    followUpDesc: { nextFollowUpDate: -1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
  };
  const sort = sortOptions[req.query.sort] || { updatedAt: -1 };
  const leads = await Lead.find(query).sort(sort);
  const header = "companyName,contactPerson,phone,email,city,status,nextFollowUpDate";
  const lines = leads.map((lead) => {
    const values = typeof lead.toObject === "function" ? lead.toObject() : lead;
    const date = values.nextFollowUpDate
      ? new Date(values.nextFollowUpDate).toISOString().slice(0, 10)
      : "";
    return [
      values.company,
      values.contactPerson,
      values.phone,
      values.email,
      values.city,
      values.status,
      date,
    ].map(csvValue).join(",");
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="closer-leads.csv"');
  return res.send([header, ...lines].join("\r\n"));
});

// Create a lead and bind it to the authenticated user, never to client input.
router.post("/", requireAuth, async (req, res) => {
  const { values, error } = validateLeadInput(req.body, { creating: true });
  if (error) return res.status(400).json({ error });

  const lead = await Lead.create({ ...values, owner: req.user._id });
  return res.status(201).json({ lead: serializeLead(lead) });
});

// Read one lead only when it belongs to the authenticated user.
router.get("/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid lead ID." });
  }

  const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });
  if (!lead) return res.status(404).json({ error: "Lead not found." });
  return res.json({ lead: serializeLead(lead) });
});

// Update a user's lead without allowing ownership or other protected fields to change.
router.patch("/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid lead ID." });
  }

  const { values, error } = validateLeadInput(req.body);
  if (error) return res.status(400).json({ error });

  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { $set: values },
    { new: true, runValidators: true }
  );
  if (!lead) return res.status(404).json({ error: "Lead not found." });
  return res.json({ lead: serializeLead(lead) });
});

// Delete only the authenticated user's lead.
router.delete("/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid lead ID." });
  }

  const lead = await Lead.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!lead) return res.status(404).json({ error: "Lead not found." });
  return res.json({ message: "Lead deleted." });
});

export default router;

/*
Follow-up API workflow:
1. Create or edit a lead with nextFollowUpDate; the date is saved on the lead.
2. GET /api/leads/follow-ups returns only this user's scheduled, non-Won/Lost leads.
3. The client calculates Overdue, Due Today, or Upcoming from each saved date and today's local date.
4. Marking a lead contacted PATCHes its status; rescheduling PATCHes its nextFollowUpDate.

Search and filtering API workflow:
1. The dashboard sends search, status, city, and sort values as URL query parameters.
2. GET /api/leads always adds the signed-in owner's ID to keep other users' data isolated.
3. MongoDB applies a case-insensitive escaped regex for text search and exact status/city filters.
4. The requested sort field is selected from a fixed allowlist before Lead.find() runs.

CSV API workflow:
1. POST /api/leads/import receives UTF-8 CSV text and reads the header names.
2. Each row is normalized and validated with the same lead rules as the create API.
3. Existing and in-file duplicate keys are excluded; valid rows are created for the signed-in owner.
4. The response reports imported and failed row counts plus the reason for each failed row.
5. GET /api/leads/export.csv applies the dashboard filters and downloads the matching leads as CSV.
*/
