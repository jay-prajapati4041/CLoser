import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeOrigin } from "../routes/auth.js";

test("normalizes configured origins with whitespace or a trailing slash", () => {
  assert.equal(normalizeOrigin(" https://closer-alpha.vercel.app/ "), "https://closer-alpha.vercel.app");
});

test("rejects malformed or non-HTTP origins", () => {
  assert.equal(normalizeOrigin("not a URL"), null);
  assert.equal(normalizeOrigin("javascript:alert(1)"), null);
});
