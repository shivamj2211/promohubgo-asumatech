import { TopNav } from "@/components/top-nav";
import MyAccountSidebar from "./_components/MyAccountSidebar";

export default function MyAccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <TopNav />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full lg:w-64 shrink-0">
            <MyAccountSidebar />
          </aside>

          <section className="flex-1 space-y-6">{children}</section>
        </div>
      </div>
    </div>
  );
}
