import type { Session } from "@supabase/supabase-js";
import {
  BadgeCheck,
  CalendarDays,
  CreditCard,
  IdCard,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

interface ProfileSectionProps {
  session: Session | null;
  contributorId: string;
}

export default function ProfileSection({
  session,
  contributorId,
}: ProfileSectionProps) {
  const email = session?.user.email ?? "—";
  const memberSince = session?.user.created_at
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(session.user.created_at))
    : "—";

  return (
    <div>
      <div className="border-b border-slate-200 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">
          Contributor workspace
        </p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.04em] text-navy sm:text-[32px]">
          Profile
        </h1>
        <p className="mt-2 max-w-[600px] text-sm leading-6 text-slate-500">
          View your contributor profile and account information.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-orange/10 text-orange">
              <UserRound size={17} />
            </span>
            <h2 className="text-sm font-extrabold text-navy">Account Details</h2>
          </div>
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
              <Mail size={16} className="shrink-0 text-slate-400" />
              <div>
                <p className="text-[10px] font-semibold text-slate-400">Email</p>
                <p className="mt-0.5 text-xs font-bold text-navy">{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <IdCard size={16} className="shrink-0 text-slate-400" />
              <div>
                <p className="text-[10px] font-semibold text-slate-400">
                  Contributor ID
                </p>
                <p className="mt-0.5 text-xs font-bold text-navy">
                  {contributorId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <BadgeCheck size={16} className="shrink-0 text-slate-400" />
              <div>
                <p className="text-[10px] font-semibold text-slate-400">
                  Contributor level
                </p>
                <p className="mt-0.5 text-xs font-bold text-navy">
                  Standard Contributor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays size={16} className="shrink-0 text-slate-400" />
              <div>
                <p className="text-[10px] font-semibold text-slate-400">
                  Member since
                </p>
                <p className="mt-0.5 text-xs font-bold text-navy">{memberSince}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-orange/10 text-orange">
              <ShieldCheck size={17} />
            </span>
            <h2 className="text-sm font-extrabold text-navy">Account Status</h2>
          </div>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="text-xs font-bold text-emerald-700">
                Account
              </span>
              <span className="flex items-center gap-2 text-xs font-extrabold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Approved
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-orange/30 bg-orange/[0.06] px-4 py-3">
              <span className="text-xs font-bold text-orange">Device</span>
              <span className="flex items-center gap-2 text-xs font-extrabold text-orange">
                <span className="h-2 w-2 rounded-full bg-orange" /> Not Recognized
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#fbfcfd] px-4 py-3">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <CreditCard size={14} /> Payment gateway
              </span>
              <span className="text-xs font-bold text-slate-400">
                Not configured
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
