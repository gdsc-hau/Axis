import { getMemberForAuthUser, getUser } from "@hau/auth";
import { redirect } from "next/navigation";
import { ActivateForm } from "./ActivateForm";

export default async function ActivatePage() {
  const user = await getUser();
  if (!user) redirect("/confirm-invite");

  const member = await getMemberForAuthUser(user.id, user.email, {
    allowUnlinkedEmail: true,
  });

  if (!member || member.member_status !== "ACTIVE") {
    redirect("/account-status");
  }

  if (member.activated_at) {
    if (!member.profile_completed_at) redirect("/verify");
    redirect(
      member.role === "ADMIN" ? "/admin/dashboard" : "/member/dashboard",
    );
  }

  return <ActivateForm />;
}
