import { redirect } from 'next/navigation';
import { getUser, getUserRole } from '@hau/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const role = await getUserRole(user.id);

  if (role !== 'ADMIN') {
    // If they are not an admin, redirect them to the member dashboard
    redirect('/member/dashboard');
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Admin Sidebar would go here */}
      <aside className="w-64 bg-white dark:bg-zinc-950 border-r dark:border-zinc-800 hidden md:block">
        <div className="p-4 border-b dark:border-zinc-800">
          <h2 className="text-lg font-bold">GDG Admin</h2>
        </div>
        <nav className="p-4 space-y-2">
          {/* Add admin navigation links here */}
        </nav>
      </aside>
      
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
