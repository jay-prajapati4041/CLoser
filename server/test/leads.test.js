// Lead API integration test: exercise CRUD and ownership without a MongoDB instance.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import { app } from "../server.js";
import Lead from "../models/Lead.js";
import Session from "../models/Session.js";

const users = {
  alice: {
    _id: new mongoose.Types.ObjectId(),
    name: "Alice",
    email: "alice@example.test",
  },
  bob: {
    _id: new mongoose.Types.ObjectId(),
    name: "Bob",
    email: "bob@example.test",
  },
};
const tokens = {
  alice: "lead-test-session-alice",
  bob: "lead-test-session-bob",
};
const usersByTokenHash = new Map(
  Object.entries(tokens).map(([name, token]) => [
    createHash("sha256").update(token).digest("hex"),
    users[name],
  ])
);
const originalMethods = {
  sessionFindOne: Session.findOne,
  leadCreate: Lead.create,
  leadFind: Lead.find,
  leadFindOne: Lead.findOne,
  leadFindOneAndUpdate: Lead.findOneAndUpdate,
  leadFindOneAndDelete: Lead.findOneAndDelete,
};

let server;
let baseUrl;
let records;

function isSameId(first, second) {
  return String(first) === String(second);
}

function matchesRecord(record, query) {
  return isSameId(record._id, query._id) && isSameId(record.owner, query.owner);
}

async function request(path, { user, method = "GET", body } = {}) {
  const headers = {};
  if (user) headers.Cookie = `closer_session=${tokens[user]}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  records = [];
  Session.findOne = (query) => ({
    populate: async () => {
      const user = usersByTokenHash.get(query.tokenHash);
      return user ? { _id: new mongoose.Types.ObjectId(), user } : null;
    },
  });
  Lead.create = async (data) => {
    const now = new Date();
    const lead = { ...data, _id: new mongoose.Types.ObjectId(), createdAt: now, updatedAt: now };
    records.push(lead);
    return lead;
  };
  Lead.find = (query) => ({
    sort: async (sortFields) => records
      .filter((record) => isSameId(record.owner, query.owner))
      .filter((record) => !query.status?.$nin || !query.status.$nin.includes(record.status))
      .filter((record) => typeof query.status === "string" ? record.status === query.status : true)
      .filter((record) => !query.nextFollowUpDate || record.nextFollowUpDate != null)
      .filter((record) => {
        if (!query.$or) return true;
        return query.$or.some((condition) => {
          const [field, regex] = Object.entries(condition)[0];
          return typeof record[field] === "string" && regex.test(record[field]);
        });
      })
      .filter((record) => {
        if (!query.city) return true;
        return typeof record.city === "string" && query.city.test(record.city);
      })
      .sort((first, second) => {
        const [field, direction] = Object.entries(sortFields)[0];
        const firstValue = field.endsWith("At") ? first[field]?.getTime() || 0 : new Date(first[field] || 0).getTime();
        const secondValue = field.endsWith("At") ? second[field]?.getTime() || 0 : new Date(second[field] || 0).getTime();
        return (firstValue - secondValue) * direction;
      }),
  });
  Lead.findOne = async (query) => records.find((record) => matchesRecord(record, query)) || null;
  Lead.findOneAndUpdate = async (query, update) => {
    const lead = records.find((record) => matchesRecord(record, query));
    if (!lead) return null;
    Object.assign(lead, update.$set, { updatedAt: new Date() });
    return lead;
  };
  Lead.findOneAndDelete = async (query) => {
    const index = records.findIndex((record) => matchesRecord(record, query));
    return index === -1 ? null : records.splice(index, 1)[0];
  };

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  Session.findOne = originalMethods.sessionFindOne;
  Lead.create = originalMethods.leadCreate;
  Lead.find = originalMethods.leadFind;
  Lead.findOne = originalMethods.leadFindOne;
  Lead.findOneAndUpdate = originalMethods.leadFindOneAndUpdate;
  Lead.findOneAndDelete = originalMethods.leadFindOneAndDelete;
});

test("lead CRUD validates input and isolates records by owner", async () => {
  const unauthorized = await request("/api/leads");
  assert.equal(unauthorized.status, 401);

  const emptyList = await request("/api/leads", { user: "alice" });
  assert.equal(emptyList.status, 200);
  assert.deepEqual(emptyList.body.leads, []);

  const invalidLead = await request("/api/leads", {
    user: "alice",
    method: "POST",
    body: { company: "Example", owner: users.bob._id },
  });
  assert.equal(invalidLead.status, 400);

  const created = await request("/api/leads", {
    user: "alice",
    method: "POST",
    body: {
      company: "Northwind",
      contactPerson: "Sam Lee",
      phone: "9876543210",
      email: "sam@northwind.example",
      city: "Seattle",
      status: "New",
      nextFollowUpDate: "2026-12-01",
    },
  });
  assert.equal(created.status, 201);
  assert.equal(typeof created.body.lead._id, "string");
  assert.equal(created.body.lead.id, created.body.lead._id);
  assert.equal(created.body.lead.owner.toString(), users.alice._id.toString());
  const leadId = created.body.lead._id;

  const ownDetails = await request(`/api/leads/${leadId}`, { user: "alice" });
  assert.equal(ownDetails.status, 200);
  assert.equal(ownDetails.body.lead.company, "Northwind");

  const otherDetails = await request(`/api/leads/${leadId}`, { user: "bob" });
  assert.equal(otherDetails.status, 404);
  const ownList = await request("/api/leads", { user: "alice" });
  assert.equal(typeof ownList.body.leads[0].id, "string");
  assert.equal(ownList.body.leads[0].id, leadId);
  const searchList = await request("/api/leads?search=north&status=New&city=Seattle&sort=newest", { user: "alice" });
  assert.equal(searchList.status, 200);
  assert.deepEqual(searchList.body.leads.map((lead) => lead.company), ["Northwind"]);
  const phoneList = await request("/api/leads?search=987654", { user: "alice" });
  assert.equal(phoneList.body.leads[0].company, "Northwind");
  const csvResponse = await fetch(`${baseUrl}/api/leads/export.csv?search=north&status=New&sort=newest`, {
    headers: { Cookie: `closer_session=${tokens.alice}` },
  });
  assert.equal(csvResponse.status, 200);
  assert.match(csvResponse.headers.get("content-type"), /text\/csv/);
  const csvText = await csvResponse.text();
  assert.match(csvText, /companyName,contactPerson,phone,email,city,status,nextFollowUpDate/);
  assert.match(csvText, /Northwind/);
  const imported = await fetch(`${baseUrl}/api/leads/import`, {
    method: "POST",
    headers: {
      Cookie: `closer_session=${tokens.alice}`,
      "Content-Type": "text/csv",
    },
    body: [
      "companyName,contactPerson,phone,email,city,status,nextFollowUpDate",
      "Northwind,Duplicate,9876543210,sam@northwind.example,Seattle,New,2026-12-01",
      "ABC Technologies,Rahul,9876543210,rahul@example.com,Ahmedabad,New,2026-11-20",
      ",Missing Company,9876500000,bad@,Ahmedabad,New,2026-11-20",
    ].join("\n"),
  });
  assert.equal(imported.status, 201);
  const importBody = await imported.json();
  assert.equal(importBody.imported, 1);
  assert.equal(importBody.failed, 2);
  assert.equal(importBody.errors[0].reason, "Duplicate lead.");
  const otherList = await request("/api/leads", { user: "bob" });
  assert.deepEqual(otherList.body.leads, []);

  records.push(
    {
      _id: new mongoose.Types.ObjectId(),
      owner: users.alice._id,
      company: "Won Co",
      status: "Won",
      nextFollowUpDate: new Date("2026-12-01T00:00:00.000Z"),
      updatedAt: new Date(),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      owner: users.alice._id,
      company: "Lost Co",
      status: "Lost",
      nextFollowUpDate: new Date("2026-12-02T00:00:00.000Z"),
      updatedAt: new Date(),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      owner: users.alice._id,
      company: "Unscheduled Co",
      status: "New",
      updatedAt: new Date(),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      owner: users.bob._id,
      company: "Bob's Lead",
      status: "New",
      nextFollowUpDate: new Date("2026-12-03T00:00:00.000Z"),
      updatedAt: new Date(),
    }
  );
  const followUps = await request("/api/leads/follow-ups", { user: "alice" });
  assert.equal(followUps.status, 200);
  assert.deepEqual(followUps.body.leads.map((lead) => lead.company), ["ABC Technologies", "Northwind"]);

  const updated = await request(`/api/leads/${leadId}`, {
    user: "alice",
    method: "PATCH",
    body: { company: "Northwind Labs", status: "Meeting" },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.lead.company, "Northwind Labs");
  assert.equal(updated.body.lead.status, "Meeting");

  const invalidUpdate = await request(`/api/leads/${leadId}`, {
    user: "alice",
    method: "PATCH",
    body: { status: "In progress" },
  });
  assert.equal(invalidUpdate.status, 400);

  const otherDelete = await request(`/api/leads/${leadId}`, { user: "bob", method: "DELETE" });
  assert.equal(otherDelete.status, 404);

  const deleted = await request(`/api/leads/${leadId}`, { user: "alice", method: "DELETE" });
  assert.equal(deleted.status, 200);
  const missingAfterDelete = await request(`/api/leads/${leadId}`, { user: "alice" });
  assert.equal(missingAfterDelete.status, 404);
});
