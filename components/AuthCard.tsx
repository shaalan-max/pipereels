import type { AgencySettings } from "@/lib/types";
import { BrandMark, BrandStyle } from "@/components/Shells";

export function AuthCard({ settings, title, subtitle, children }: { settings: AgencySettings; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <BrandStyle color={settings.brand_color}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-zinc-100 px-4 py-12">
        <div className="mb-8">
          <BrandMark settings={settings} size="lg" />
        </div>
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-zinc-200 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-8 text-xs text-zinc-400">{settings.tagline}</p>
      </div>
    </BrandStyle>
  );
}
