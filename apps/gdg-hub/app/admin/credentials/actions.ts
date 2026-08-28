"use server";

import { revalidatePath } from "next/cache";
import { getActiveAdmin } from "@hau/auth";
import {
  AwardEventRecognitionBadgeSchema,
  AwardRecognitionBadgeSchema,
  CreateRecognitionBadgeSchema,
  PrepareCertificateBatchSchema,
  RevokeCertificateSchema,
  RevokeRecognitionBadgeSchema,
} from "@hau/contracts";
import {
  awardEventRecognitionBadge,
  awardRecognitionBadge,
  createRecognitionBadge,
  failEventCertificate,
  finalizeEventCertificate,
  listCertificateBatchRenderRecords,
  prepareEventCertificateBatch,
  retryEventCertificate,
  revokeEventCertificate,
  revokeRecognitionBadge,
} from "@hau/db";
import {
  generateCertificatePdf,
  uploadCertificatePdf,
} from "@hau/certificates";

function refreshCredentials() {
  revalidatePath("/admin/credentials");
  revalidatePath("/member/credentials");
}

function firstIssue(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? "Invalid credential request.";
}

function databaseMessage(message: string) {
  if (message.includes("already holds this badge")) return message;
  if (message.includes("Active badge not found")) return message;
  if (message.includes("Active member not found")) return message;
  if (message.includes("confirmed attendance")) return message;
  if (message.includes("duplicate key"))
    return "That credential already exists.";
  return "The credential operation could not be completed.";
}

export async function createBadge(formData: FormData) {
  const parsed = CreateRecognitionBadgeSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    iconUrl: formData.get("iconUrl") ?? "",
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await getActiveAdmin())) {
    return { error: "Active administrator access required." };
  }

  const { data, error } = await createRecognitionBadge(parsed.data);
  if (error || !data) return { error: databaseMessage(error?.message ?? "") };
  refreshCredentials();
  return { success: true, badgeId: data.id };
}

export async function awardBadge(formData: FormData) {
  const parsed = AwardRecognitionBadgeSchema.safeParse({
    memberId: formData.get("memberId"),
    badgeId: formData.get("badgeId"),
    reason: formData.get("reason"),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await getActiveAdmin())) {
    return { error: "Active administrator access required." };
  }

  const { data, error } = await awardRecognitionBadge(parsed.data);
  if (error || !data) return { error: databaseMessage(error?.message ?? "") };
  refreshCredentials();
  return { success: true, awardId: data.id };
}

export async function awardEventBadge(formData: FormData) {
  const parsed = AwardEventRecognitionBadgeSchema.safeParse({
    eventId: formData.get("eventId"),
    badgeId: formData.get("badgeId"),
    reason: formData.get("reason"),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await getActiveAdmin())) {
    return { error: "Active administrator access required." };
  }

  const { data, error } = await awardEventRecognitionBadge(parsed.data);
  if (error || !data) return { error: databaseMessage(error?.message ?? "") };
  refreshCredentials();
  return {
    success: true,
    awardedCount: data.awarded_count,
    skippedCount: data.skipped_count,
  };
}

export async function revokeBadge(formData: FormData) {
  const parsed = RevokeRecognitionBadgeSchema.safeParse({
    memberBadgeId: formData.get("memberBadgeId"),
    reason: formData.get("reason"),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await getActiveAdmin())) {
    return { error: "Active administrator access required." };
  }

  const { data, error } = await revokeRecognitionBadge(parsed.data);
  if (error || !data) return { error: databaseMessage(error?.message ?? "") };
  refreshCredentials();
  return { success: true };
}

export async function issueCertificateBatch(formData: FormData) {
  const parsed = PrepareCertificateBatchSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    templateVersion: formData.get("templateVersion"),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await getActiveAdmin())) {
    return { error: "Active administrator access required." };
  }

  const { data: batch, error: batchError } = await prepareEventCertificateBatch(
    parsed.data,
  );
  if (batchError || !batch) {
    return { error: databaseMessage(batchError?.message ?? "") };
  }

  const { data: records, error: recordsError } =
    await listCertificateBatchRenderRecords(batch.id);
  if (recordsError) {
    return { error: "The prepared certificate records could not be loaded." };
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"
  ).replace(/\/$/, "");
  let issuedCount = 0;
  let failedCount = 0;

  for (const record of records) {
    if (!record.member || !record.event) {
      await failEventCertificate({
        certificateId: record.id,
        reason: "Certificate member or event data could not be resolved",
        operationKey: crypto.randomUUID(),
      });
      failedCount += 1;
      continue;
    }

    try {
      if (record.status === "FAILED") {
        const { error: retryError } = await retryEventCertificate({
          certificateId: record.id,
          operationKey: crypto.randomUUID(),
        });
        if (retryError) throw retryError;
      }

      const bytes = generateCertificatePdf({
        certificateTitle: record.title,
        certificateNumber: record.certificate_number,
        memberName: record.member.full_name,
        memberGdgId: record.member.gdg_id,
        eventTitle: record.event.title,
        eventDate: record.event.start_at,
        verificationUrl: `${siteUrl}/verify/certificate/${record.certificate_number}`,
      });
      const storagePath = `${record.event_id}/${record.certificate_number}.pdf`;
      const { error: uploadError } = await uploadCertificatePdf(
        storagePath,
        bytes,
      );
      if (uploadError) throw uploadError;

      const { error: finalizeError } = await finalizeEventCertificate({
        certificateId: record.id,
        storagePath,
        operationKey: crypto.randomUUID(),
      });
      if (finalizeError) throw finalizeError;
      issuedCount += 1;
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "PDF generation failed";
      await failEventCertificate({
        certificateId: record.id,
        reason: reason.slice(0, 500).padEnd(3, "."),
        operationKey: crypto.randomUUID(),
      });
      failedCount += 1;
    }
  }

  refreshCredentials();
  return {
    success: true,
    batchId: batch.id,
    eligibleCount: batch.eligible_count,
    preparedCount: batch.prepared_count,
    issuedCount,
    failedCount,
  };
}

export async function revokeCertificate(formData: FormData) {
  const parsed = RevokeCertificateSchema.safeParse({
    certificateId: formData.get("certificateId"),
    reason: formData.get("reason"),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await getActiveAdmin())) {
    return { error: "Active administrator access required." };
  }

  const { data, error } = await revokeEventCertificate(parsed.data);
  if (error || !data) return { error: databaseMessage(error?.message ?? "") };
  refreshCredentials();
  return { success: true };
}
