import { getMemberForAuthUser, getUser } from "@hau/auth";
import { redirect } from "next/navigation";
import { ConfirmInviteForm } from "./ConfirmInviteForm";

export default async function ConfirmInvitePage() {
  const user = await getUser();

  if (user) {
    const member = await getMemberForAuthUser(user.id, user.email, {
      allowUnlinkedEmail: true,
    });

    if (!member || member.member_status !== "ACTIVE") {
      redirect("/account-status");
    }

    if (!member.activated_at) {
      redirect("/activate");
    }

    if (!member.profile_completed_at) {
      redirect("/verify");
    }

    redirect(
      member.role === "ADMIN" ? "/admin/dashboard" : "/member/dashboard",
    );
  }

  return <ConfirmInviteForm />;
}
