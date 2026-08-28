"use server";

import { getActiveAdmin } from "@hau/auth";
import { InviteMemberEmailsSchema } from "@hau/contracts";
import { createAdminClient, createServerClientInstance } from "@hau/db";
import { revalidatePath } from "next/cache";

type InviteResult = {
  email: string;
  status: "sent" | "skipped" | "error";
  reason?: string;
};

type EligibleMember = {
  id: string;
  email: string;
  full_name: string;
  member_status: string;
  role: string;
  auth_id: string | null;
};

function getInviteRedirectUrl() {
  const fallback = "http://localhost:3001";

  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallback);
    url.pathname = "/confirm-invite";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return `${fallback}/confirm-invite`;
  }
}

function friendlyInviteError(message?: string) {
  const normalized = message?.toLowerCase() ?? "";

  if (normalized.includes("rate limit")) {
    return "The email rate limit was reached. Wait before retrying this address.";
  }

  if (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("email_exists")
  ) {
    return "A confirmed Auth account already exists for this email. Link or recover that account instead.";
  }

  return "Supabase Auth could not send this invitation. Check the Auth logs before retrying.";
}

export async function sendInvites(
  formData: FormData,
): Promise<{ results?: InviteResult[]; error?: string }> {
  const access = await getActiveAdmin();
  if (!access) return { error: "Active administrator access required." };

  const parsed = InviteMemberEmailsSchema.safeParse(formData.get("emails"));
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Enter valid member email addresses.",
    };
  }

  const emails = parsed.data;
  const adminClient = createAdminClient();
  const supabase = await createServerClientInstance();
  const redirectTo = getInviteRedirectUrl();
  const results: InviteResult[] = [];

  // Resolve the batch once. Sending remains sequential so this action does not
  // create a burst against the project's configured SMTP rate limit.
  const { data: rawMembers, error: membersError } = await adminClient
    .from("members")
    .select("id, email, full_name, member_status, role, auth_id")
    .in("email", emails);

  if (membersError) {
    console.error("Failed to resolve invitation registry batch:", membersError);
    return {
      error:
        "The member registry could not be checked. No invitations were sent.",
    };
  }

  const membersByEmail = new Map(
    ((rawMembers as EligibleMember[] | null) ?? []).map((member) => [
      member.email,
      member,
    ]),
  );

  for (const email of emails) {
    const member = membersByEmail.get(email);

    if (!member) {
      results.push({
        email,
        status: "skipped",
        reason: "Not found in the member registry.",
      });
      continue;
    }

    if (member.member_status !== "ACTIVE") {
      results.push({
        email,
        status: "skipped",
        reason: `Member status is ${member.member_status.toLowerCase()}.`,
      });
      continue;
    }

    if (member.auth_id) {
      results.push({
        email,
        status: "skipped",
        reason: "Account is already activated.",
      });
      continue;
    }

    // The service credential stays on the server. Registry role remains the
    // authority, so an approved ADMIN row can be provisioned through the same
    // controlled invitation path as an approved MEMBER row.
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          axis_member_id: member.id,
          full_name: member.full_name,
        },
      });

    if (inviteError || !inviteData.user) {
      console.error(`Failed to send invite email to ${email}:`, inviteError);
      results.push({
        email,
        status: "error",
        reason: friendlyInviteError(inviteError?.message),
      });
      continue;
    }

    const { error: recordError } = await supabase.rpc(
      "record_member_invitation",
      { p_member_id: member.id },
    );

    if (recordError) {
      console.error(
        `Invitation sent but lifecycle recording failed for ${email}:`,
        recordError.message,
      );
      results.push({
        email,
        status: "error",
        reason:
          "Invitation was sent, but its audit record could not be saved. Contact an operator before retrying.",
      });
      continue;
    }

    results.push({ email, status: "sent" });
  }

  revalidatePath("/admin/invite");
  revalidatePath("/admin/members");

  return { results };
}
