import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import Image from "next/image";
import { HeaderClock } from "./HeaderClock";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

export function AppShell({ children, userEmail }: { children: React.ReactNode; userEmail?: string }) {
  const timeZone = process.env.APP_TIMEZONE || "Europe/Amsterdam";

  return (
    <div className="min-h-screen bg-occ-ink text-white">
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-occ-line bg-occ-ink/90 px-4 py-4 shadow-nova backdrop-blur md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-[0.12em] text-occ-platinum">NOVA</h1>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-occ-gold">Enterprise Monitoring & Mission Assistant</p>
              </div>
              <HeaderClock timeZone={timeZone} />
              <div className="order-2 flex items-center gap-3 md:order-3">
                <LanguageSwitcher compact />
                <div className="hidden rounded-md border border-occ-line bg-occ-panel/80 px-3 py-2 text-right text-xs text-zinc-400 shadow-occ sm:block">
                  <span className="block text-zinc-500">Family mission ready</span>
                  <span className="block max-w-48 truncate text-zinc-200">{userEmail}</span>
                </div>
                <Image
                  src="/brand/emma-occ-badge.png"
                  alt="NOVA badge"
                  width={64}
                  height={64}
                  className="h-14 w-14 rounded-full border border-occ-gold/50 bg-white object-cover shadow-nova sm:h-16 sm:w-16"
                />
              </div>
            </div>
          </header>
          <main className="px-4 pb-28 pt-5 md:px-6 lg:pb-8">
            {children}
            <footer className="mt-8 border-t border-occ-line pt-6">
              <div className="flex flex-col items-center justify-center gap-3">
                <Image
                  src="/brand/emma-occ-logo.png"
                  alt="NOVA Enterprise Monitoring and Mission Assistant"
                  width={420}
                  height={526}
                  className="max-h-56 w-full max-w-sm object-contain opacity-95 drop-shadow-2xl sm:max-h-72 sm:max-w-md"
                />
                <p className="text-center text-xs uppercase tracking-[0.18em] text-zinc-500">Family focused · Secure · Intelligent · Mission driven</p>
              </div>
            </footer>
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
