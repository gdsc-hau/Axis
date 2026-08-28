import "server-only";
import type { Database } from "./database.types";
import { createServerClientInstance } from "./server";

export type BadgeRow = Database["public"]["Tables"]["badges"]["Row"];
export type MemberBadgeRow =
  Database["public"]["Tables"]["member_badges"]["Row"];
export type BadgeAwardBatchRow =
  Database["public"]["Tables"]["badge_award_batches"]["Row"];
export type CertificateRow =
  Database["public"]["Tables"]["certificates"]["Row"];
export type CertificateBatchRow =
  Database["public"]["Tables"]["certificate_issuance_batches"]["Row"];
export type PublicCertificateVerification =
  Database["public"]["Functions"]["get_public_certificate_verification"]["Returns"][number];

export type MemberBadge = MemberBadgeRow & { badge: BadgeRow | null };
export type MemberCertificate = CertificateRow & {
  event: { id: string; title: string; start_at: string | null } | null;
};
export type AdminBadgeAward = MemberBadgeRow & {
  badge: BadgeRow | null;
  member: {
    id: string;
    full_name: string;
    gdg_id: string;
    email: string;
  } | null;
};
export type CertificateRenderRecord = CertificateRow & {
  member: { full_name: string; gdg_id: string } | null;
  event: { title: string; start_at: string | null } | null;
};

const badgeColumns =
  "id, slug, name, description, icon_url, active, created_by, created_at, updated_at";
const awardColumns =
  "id, member_id, badge_id, earned_at, status, source, event_id, attendance_id, reason, awarded_by, operation_key, revoked_at, revoked_by, revocation_reason, created_at, updated_at";
const certificateColumns =
  "id, member_id, event_id, attendance_id, issuance_batch_id, title, certificate_number, storage_path, template_version, status, issued_at, issued_by, request_operation_key, failure_reason, revoked_at, revoked_by, revocation_reason, created_at, updated_at";

export async function listAdminRecognitionData() {
  const supabase = await createServerClientInstance();
  const [
    badgesResult,
    awardsResult,
    batchesResult,
    certificatesResult,
    eventsResult,
    membersResult,
  ] = await Promise.all([
    supabase
      .from("badges")
      .select(badgeColumns)
      .order("created_at", { ascending: false }),
    supabase
      .from("member_badges")
      .select(awardColumns)
      .order("earned_at", { ascending: false })
      .limit(100),
    supabase
      .from("certificate_issuance_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("certificates")
      .select(certificateColumns)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("events")
      .select("id, title, start_at, status")
      .order("start_at", { ascending: false, nullsFirst: false })
      .limit(100),
    supabase
      .from("members")
      .select("id, full_name, gdg_id, email")
      .eq("member_status", "ACTIVE")
      .order("full_name", { ascending: true }),
  ]);

  const error =
    badgesResult.error ??
    awardsResult.error ??
    batchesResult.error ??
    certificatesResult.error ??
    eventsResult.error ??
    membersResult.error;

  const badges = (badgesResult.data ?? []) as BadgeRow[];
  const badgeMap = new Map(badges.map((badge) => [badge.id, badge]));
  const memberMap = new Map(
    (membersResult.data ?? []).map((member) => [member.id, member]),
  );

  return {
    badges,
    awards: ((awardsResult.data ?? []) as MemberBadgeRow[]).map((award) => ({
      ...award,
      badge: badgeMap.get(award.badge_id) ?? null,
      member: memberMap.get(award.member_id) ?? null,
    })) as AdminBadgeAward[],
    certificateBatches: (batchesResult.data ?? []) as CertificateBatchRow[],
    certificates: (certificatesResult.data ?? []) as CertificateRow[],
    events: eventsResult.data ?? [],
    activeMembers: membersResult.data ?? [],
    error,
  };
}

export async function listCurrentMemberCredentials() {
  const supabase = await createServerClientInstance();
  const { data: memberId, error: memberError } =
    await supabase.rpc("current_member_id");
  if (memberError || !memberId) {
    return {
      badges: [] as MemberBadge[],
      certificates: [] as MemberCertificate[],
      error: memberError ?? new Error("Active member was not found."),
    };
  }

  const [awardsResult, certificatesResult] = await Promise.all([
    supabase
      .from("member_badges")
      .select(awardColumns)
      .eq("member_id", memberId)
      .order("earned_at", { ascending: false }),
    supabase
      .from("certificates")
      .select(certificateColumns)
      .eq("member_id", memberId)
      .order("created_at", { ascending: false }),
  ]);
  const error = awardsResult.error ?? certificatesResult.error;
  if (error) {
    return {
      badges: [] as MemberBadge[],
      certificates: [] as MemberCertificate[],
      error,
    };
  }

  const awards = (awardsResult.data ?? []) as MemberBadgeRow[];
  const certificates = (certificatesResult.data ?? []) as CertificateRow[];
  const [badgesResult, eventsResult] = await Promise.all([
    awards.length
      ? supabase
          .from("badges")
          .select(badgeColumns)
          .in("id", Array.from(new Set(awards.map((award) => award.badge_id))))
      : Promise.resolve({ data: [] as BadgeRow[], error: null }),
    certificates.length
      ? supabase
          .from("events")
          .select("id, title, start_at")
          .in(
            "id",
            Array.from(
              new Set(certificates.map((certificate) => certificate.event_id)),
            ),
          )
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            title: string;
            start_at: string | null;
          }>,
          error: null,
        }),
  ]);
  const relatedError = badgesResult.error ?? eventsResult.error;
  if (relatedError) {
    return {
      badges: [] as MemberBadge[],
      certificates: [] as MemberCertificate[],
      error: relatedError,
    };
  }

  const badgeMap = new Map(
    ((badgesResult.data ?? []) as BadgeRow[]).map((badge) => [badge.id, badge]),
  );
  const eventMap = new Map(
    (eventsResult.data ?? []).map((event) => [event.id, event]),
  );
  return {
    badges: awards.map((award) => ({
      ...award,
      badge: badgeMap.get(award.badge_id) ?? null,
    })),
    certificates: certificates.map((certificate) => ({
      ...certificate,
      event: eventMap.get(certificate.event_id) ?? null,
    })),
    error: null,
  };
}

export async function createRecognitionBadge(args: {
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  active: boolean;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("create_recognition_badge", {
    p_slug: args.slug,
    p_name: args.name,
    p_description: args.description,
    p_icon_url: args.iconUrl,
    p_active: args.active,
  });
}

export async function awardRecognitionBadge(args: {
  memberId: string;
  badgeId: string;
  reason: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("award_recognition_badge", {
    p_member_id: args.memberId,
    p_badge_id: args.badgeId,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}

export async function revokeRecognitionBadge(args: {
  memberBadgeId: string;
  reason: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("revoke_recognition_badge", {
    p_member_badge_id: args.memberBadgeId,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}

export async function awardEventRecognitionBadge(args: {
  eventId: string;
  badgeId: string;
  reason: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("award_event_recognition_badge", {
    p_event_id: args.eventId,
    p_badge_id: args.badgeId,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}

export async function prepareEventCertificateBatch(args: {
  eventId: string;
  title: string;
  templateVersion: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("prepare_event_certificate_batch", {
    p_event_id: args.eventId,
    p_title: args.title,
    p_template_version: args.templateVersion,
    p_operation_key: args.operationKey,
  });
}

export async function listCertificateBatchRenderRecords(batchId: string) {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("certificates")
    .select(certificateColumns)
    .eq("issuance_batch_id", batchId)
    .in("status", ["PENDING", "FAILED"])
    .order("created_at", { ascending: true });
  if (error || !data?.length) {
    return { data: [] as CertificateRenderRecord[], error };
  }

  const certificates = data as CertificateRow[];
  const [
    { data: members, error: memberError },
    { data: events, error: eventError },
  ] = await Promise.all([
    supabase
      .from("members")
      .select("id, full_name, gdg_id")
      .in(
        "id",
        Array.from(
          new Set(certificates.map((certificate) => certificate.member_id)),
        ),
      ),
    supabase
      .from("events")
      .select("id, title, start_at")
      .in(
        "id",
        Array.from(
          new Set(certificates.map((certificate) => certificate.event_id)),
        ),
      ),
  ]);
  const relatedError = memberError ?? eventError;
  if (relatedError)
    return { data: [] as CertificateRenderRecord[], error: relatedError };

  const memberMap = new Map(
    (members ?? []).map((member) => [member.id, member]),
  );
  const eventMap = new Map((events ?? []).map((event) => [event.id, event]));
  return {
    data: certificates.map((certificate) => ({
      ...certificate,
      member: memberMap.get(certificate.member_id) ?? null,
      event: eventMap.get(certificate.event_id) ?? null,
    })),
    error: null,
  };
}

export async function finalizeEventCertificate(args: {
  certificateId: string;
  storagePath: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("finalize_event_certificate", {
    p_certificate_id: args.certificateId,
    p_storage_path: args.storagePath,
    p_operation_key: args.operationKey,
  });
}

export async function failEventCertificate(args: {
  certificateId: string;
  reason: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("fail_event_certificate", {
    p_certificate_id: args.certificateId,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}

export async function retryEventCertificate(args: {
  certificateId: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("retry_event_certificate", {
    p_certificate_id: args.certificateId,
    p_operation_key: args.operationKey,
  });
}

export async function revokeEventCertificate(args: {
  certificateId: string;
  reason: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("revoke_event_certificate", {
    p_certificate_id: args.certificateId,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}

export async function getPublicCertificateVerification(
  certificateNumber: string,
) {
  const supabase = await createServerClientInstance();
  const result = await supabase.rpc("get_public_certificate_verification", {
    p_certificate_number: certificateNumber,
  });
  return {
    data: (result.data?.[0] ?? null) as PublicCertificateVerification | null,
    error: result.error,
  };
}

export async function getAuthorizedCertificate(certificateId: string) {
  const supabase = await createServerClientInstance();
  return supabase
    .from("certificates")
    .select(certificateColumns)
    .eq("id", certificateId)
    .maybeSingle();
}
