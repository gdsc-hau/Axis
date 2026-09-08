import { redirect } from "next/navigation";
import { getMemberForAuthUser, getUser } from "@hau/auth";
import { ApplicationShell } from "@hau/axis-ui";
import { AdminSidebar } from "./AdminSidebar";

export default async function AdminLayout({
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

  if (member.role !== "ADMIN") {
    redirect("/member/dashboard");
  }

  return (
    <ApplicationShell
      navigation={<AdminSidebar />}
      contentClassName="min-h-screen overflow-y-auto"
      containerClassName="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-8 lg:px-8"
    >
      {children}
    </ApplicationShell>
  );
}
