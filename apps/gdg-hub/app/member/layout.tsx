import { redirect } from "next/navigation";
import { getMemberForAuthUser, getUser } from "@hau/auth";
import { ApplicationShell } from "@hau/axis-ui";
import { MemberSidebar } from "./MemberSidebar";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const member = await getMemberForAuthUser(user.id, user.email);

  if (!member || member.member_status !== "ACTIVE") {
    redirect("/account-status");
  }

  if (!member.profile_completed_at) {
    // If their profile is incomplete, force them to complete it via the verify route
    redirect("/verify");
  }

  return (
    <ApplicationShell
      navigation={<MemberSidebar />}
      contentClassName="overflow-y-auto"
      containerClassName="p-4 pt-20 sm:p-6 sm:pt-20 md:p-8"
    >
      {children}
    </ApplicationShell>
  );
}
