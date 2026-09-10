import { test } from "node:test";
import assert from "node:assert/strict";
import { accessTermsFor, explicitProgrammeEnd } from "../lib/academy-access-terms.server";

const terms = JSON.stringify({
  ga: { starts: "redemption", hours: 48, version: "fixture-ga" },
  vip: { starts: "redemption", hours: 720, version: "fixture-vip" },
  accelerator: { starts: "redemption", hours: 2880, version: "fixture-cohort" },
});

test("Accelerator requires an explicit valid timestamp and timezone", () => {
  for (const value of [undefined, "", "December 2026", "2026-12-31", "2026-12-31T23:59:59", "2026-02-30T12:00:00Z", "2026-12-31T24:00:00Z", "2026-12-31T23:59:59+14:30", "infinity"]) {
    assert.equal(explicitProgrammeEnd(value), null);
    assert.equal(accessTermsFor("accelerator", { ACADEMY_ACCESS_TERMS_JSON: terms, ACADEMY_ACCELERATOR_ENDS_AT: value }), null);
  }
  assert.equal(explicitProgrammeEnd("2026-12-31T23:59:59-05:00"), "2027-01-01T04:59:59.000Z");
  assert.equal(explicitProgrammeEnd("2028-02-29T12:00:00.12Z"), "2028-02-29T12:00:00.120Z");
});

test("GA and VIP keep their approved rolling terms, independent of cohort configuration", () => {
  for (const end of [undefined, "invalid", "2026-12-31T23:59:59Z"]) {
    const env = { ACADEMY_ACCESS_TERMS_JSON: terms, ACADEMY_ACCELERATOR_ENDS_AT: end };
    assert.deepEqual(accessTermsFor("ga", env), { hours: 48, version: "fixture-ga", programmeEndsAt: null });
    assert.deepEqual(accessTermsFor("vip", env), { hours: 720, version: "fixture-vip", programmeEndsAt: null });
  }
});

test("Accelerator stores the explicit cap without changing the approved hours or version", () => {
  assert.deepEqual(accessTermsFor("accelerator", { ACADEMY_ACCESS_TERMS_JSON: terms, ACADEMY_ACCELERATOR_ENDS_AT: "2026-12-31T23:59:59-05:00" }),
    { hours: 2880, version: "fixture-cohort", programmeEndsAt: "2027-01-01T04:59:59.000Z" });
  assert.equal(accessTermsFor("accelerator", { ACADEMY_ACCESS_TERMS_JSON: "{}", ACADEMY_ACCELERATOR_ENDS_AT: "2026-12-31T23:59:59Z" }), null);
});
