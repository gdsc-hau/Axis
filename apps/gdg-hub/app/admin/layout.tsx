import { redirect } from "next/navigation";
import { getMemberForAuthUser, getUser } from "@hau/auth";
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
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AdminSidebar />
      <main className="flex-1 min-h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
