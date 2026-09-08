import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  );
}
