import type { ReactNode } from "react";
import { LoaderCircle, Save } from "lucide-react";

export function AdminSettingsHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">{eyebrow}</p><h2 className="mt-2 text-[32px] font-extrabold tracking-[-0.04em] text-navy dark:text-slate-100 sm:text-[40px]">{title}</h2><p className="mt-3 max-w-[640px] text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p></div></div>;
}

export function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_16px_rgba(20,36,52,0.04)] dark:border-slate-700 dark:bg-slate-900 sm:p-7"><div className="mb-6"><h3 className="text-sm font-extrabold text-navy dark:text-slate-100">{title}</h3>{description && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>}</div>{children}</section>;
}

export function SettingsField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block"><span className="text-xs font-bold text-navy dark:text-slate-100">{label}</span>{children}{hint && <span className="mt-1 block text-[11px] leading-5 text-slate-400 dark:text-slate-500">{hint}</span>}</label>;
}

export function SettingsInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-orange focus:ring-2 focus:ring-orange/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${props.className ?? ""}`} />;
}

export function SettingsTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`mt-2 min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-navy outline-none transition placeholder:text-slate-400 focus:border-orange focus:ring-2 focus:ring-orange/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${props.className ?? ""}`} />;
}

export function SettingsSaveButton({ isSaving }: { isSaving: boolean }) {
  return <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange px-5 py-3 text-xs font-extrabold text-navy shadow-[0_6px_18px_rgba(255,153,0,0.16)] transition hover:bg-orange-light disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}{isSaving ? "Saving…" : "Save changes"}</button>;
}

export function SettingsLoading() {
  return <div className="mt-8 space-y-4" role="status" aria-label="Loading settings"><div className="h-5 w-40 animate-pulse rounded bg-slate-200" /><div className="h-52 animate-pulse rounded-xl bg-white dark:bg-slate-800" /><div className="h-36 animate-pulse rounded-xl bg-white dark:bg-slate-800" /></div>;
}
