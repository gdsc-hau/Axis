import { redirect } from 'next/navigation';
import { getUser, isProfileComplete } from '@hau/auth';

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const profileComplete = await isProfileComplete(user.id);

  if (!profileComplete) {
    // If their profile is incomplete, force them to complete it via the verify route
    redirect('/verify');
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-zinc-950">
      {/* Member Sidebar would go here */}
      <aside className="w-64 bg-gray-50 dark:bg-zinc-900 border-r dark:border-zinc-800 hidden md:block">
        <div className="p-4 border-b dark:border-zinc-800">
          <h2 className="text-lg font-bold">Member Portal</h2>
        </div>
        <nav className="p-4 space-y-2">
          {/* Add member navigation links here */}
        </nav>
      </aside>
      
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
