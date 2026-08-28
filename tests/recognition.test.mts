import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  AwardRecognitionBadgeSchema,
  CertificateNumberSchema,
  CreateRecognitionBadgeSchema,
  PrepareCertificateBatchSchema,
} from "../packages/contracts/src/index.ts";
import {
  getBadgeAwardSourceLabel,
  getBadgeAwardStatusLabel,
} from "../packages/badges/src/rules.ts";

const migrationUrl = new URL(
  "../supabase/migrations/20260825170545_credentials_recognition.sql",
  import.meta.url,
);
const pdfUrl = new URL("../packages/certificates/src/pdf.ts", import.meta.url);
const storageUrl = new URL(
  "../packages/certificates/src/storage.ts",
  import.meta.url,
);
const adminActionsUrl = new URL(
  "../apps/gdg-hub/app/admin/credentials/actions.ts",
  import.meta.url,
);
const publicVerificationUrl = new URL(
  "../apps/gdg-hub/app/verify/certificate/[certificateNumber]/page.tsx",
  import.meta.url,
);
const legacyIssueRouteUrl = new URL(
  "../apps/gdg-hub/app/api/certificates/issue/route.ts",
  import.meta.url,
);

test("validates badge and certificate administration inputs", () => {
  const badge = CreateRecognitionBadgeSchema.parse({
    slug: "event-champion",
    name: "Event Champion",
    description: "Recognizes confirmed event participation.",
    iconUrl: "https://example.com/event-champion.png",
    active: true,
  });
  assert.equal(badge.slug, "event-champion");
  assert.equal(
    CreateRecognitionBadgeSchema.safeParse({ ...badge, slug: "Bad Slug" })
      .success,
    false,
  );
  assert.equal(
    AwardRecognitionBadgeSchema.safeParse({
      memberId: "00000000-0000-4000-8000-000000000001",
      badgeId: "00000000-0000-4000-8000-000000000001",
      reason: "x",
      operationKey: "a1170000-0000-4000-8000-000000000001",
    }).success,
    false,
  );
  assert.equal(
    PrepareCertificateBatchSchema.safeParse({
      eventId: "00000000-0000-4000-8000-000000000001",
      title: "Certificate of Participation",
      templateVersion: "bad version with spaces",
      operationKey: "a1170000-0000-4000-8000-000000000001",
    }).success,
    false,
  );
  assert.equal(
    CertificateNumberSchema.parse("gdghau-0123456789abcdef0123456789abcdef"),
    "GDGHAU-0123456789ABCDEF0123456789ABCDEF",
  );
});

test("labels reversible badge awards", () => {
  assert.equal(getBadgeAwardStatusLabel("AWARDED"), "Awarded");
  assert.equal(getBadgeAwardStatusLabel("REVOKED"), "Revoked");
  assert.equal(getBadgeAwardSourceLabel("MANUAL"), "Manual award");
  assert.equal(
    getBadgeAwardSourceLabel("EVENT_ATTENDANCE"),
    "Confirmed attendance",
  );
});

test("keeps credential issuance private, attendance-backed, and audited", async () => {
  const [migration, pdf, storage, adminActions, publicVerification] =
    await Promise.all([
      readFile(migrationUrl, "utf8"),
      readFile(pdfUrl, "utf8"),
      readFile(storageUrl, "utf8"),
      readFile(adminActionsUrl, "utf8"),
      readFile(publicVerificationUrl, "utf8"),
    ]);

  assert.match(migration, /attendance_id UUID NOT NULL/);
  assert.match(migration, /certificates_attendance_key UNIQUE/);
  assert.match(migration, /status = 'CONFIRMED'/);
  assert.match(migration, /certificate_status_history/);
  assert.match(migration, /badge_award_status_history/);
  assert.match(migration, /RECOGNITION_BADGE_REVOKED/);
  assert.match(migration, /CERTIFICATE_REVOKED/);
  assert.match(migration, /'certificates',\s*'certificates',\s*FALSE/);
  assert.match(migration, /ARRAY\['application\/pdf'\]/);
  assert.match(migration, /SECURITY INVOKER/);
  assert.doesNotMatch(
    migration.match(
      /RETURNS TABLE \([\s\S]*?\)\s*LANGUAGE SQL\s*STABLE\s*SECURITY DEFINER/,
    )?.[0] ?? "",
    /email|storage_path/,
  );

  assert.match(pdf, /Placeholder template - final artwork pending/);
  assert.match(pdf, /CERTIFICATE OF RECOGNITION/);
  assert.match(storage, /createSignedUrl/);
  assert.match(storage, /contentType: "application\/pdf"/);
  assert.match(adminActions, /"use server"/);
  assert.match(adminActions, /getActiveAdmin/);
  assert.match(adminActions, /finalizeEventCertificate/);
  assert.match(publicVerification, /intentionally excludes/);
  assert.doesNotMatch(publicVerification, /member_email|storage_path/);

  await assert.rejects(readFile(legacyIssueRouteUrl, "utf8"), {
    code: "ENOENT",
  });
});
