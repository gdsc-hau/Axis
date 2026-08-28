import { redirect } from "next/navigation";
import { getMemberForAuthUser, getUser } from "@hau/auth";
import { VerifyForm } from "./VerifyForm";

export default async function VerifyPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const member = await getMemberForAuthUser(user.id, user.email);
  if (!member || member.member_status !== "ACTIVE") {
    redirect("/account-status");
  }

  if (member.profile_completed_at) {
    redirect(
      member.role === "ADMIN" ? "/admin/dashboard" : "/member/dashboard",
    );
  }

  return <VerifyForm fullName={member.full_name} />;
}
