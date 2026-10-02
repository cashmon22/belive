import { useEffect, useState } from "react";
import { Cookie, Settings2 } from "lucide-react";

type Preferences = { essential: true; analytics: boolean; marketing: boolean };
const STORAGE_KEY = "contributor-cookie-preferences";
const defaultPreferences: Preferences = { essential: true, analytics: false, marketing: false };

function readPreferences(): Preferences | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<Preferences>;
    return { essential: true, analytics: parsed.analytics === true, marketing: parsed.marketing === true };
  } catch {
    return null;
  }
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event("open-cookie-preferences"));
}

export default function CookiePrivacyControls() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

  useEffect(() => {
    const saved = readPreferences();
    setPreferences(saved ?? defaultPreferences);
    setOpen(!saved);
    const onOpen = () => {
      setPreferences(readPreferences() ?? defaultPreferences);
      setOpen(true);
    };
    window.addEventListener("open-cookie-preferences", onOpen);
    return () => window.removeEventListener("open-cookie-preferences", onOpen);
  }, []);

  const save = (value: Preferences) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setPreferences(value);
    setOpen(false);
  };

  if (!open) return null;
  return <div className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-3 sm:px-5 sm:pb-5"><section className="mx-auto max-w-[860px] rounded-xl border border-slate-200 bg-white p-5 shadow-[0_16px_55px_rgba(9,22,35,0.24)] sm:p-6" aria-labelledby="cookie-preferences-title"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange/10 text-orange"><Cookie size={19} /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange">Privacy preferences</p><h2 id="cookie-preferences-title" className="mt-1 text-sm font-extrabold text-navy">Choose your non-essential cookies</h2><p className="mt-2 text-xs leading-5 text-slate-500">Essential storage supports sign-in and required application functionality and cannot be disabled. Optional categories are off unless you choose to enable them.</p></div></div><div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-lg border border-slate-200 bg-[#fbfcfd] p-3"><p className="text-xs font-bold text-navy">Essential <span className="text-emerald-700">Always on</span></p><p className="mt-1 text-[10px] leading-4 text-slate-500">Authentication and core security.</p></div>{(["analytics", "marketing"] as const).map((key) => <label key={key} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><span><span className="block text-xs font-bold capitalize text-navy">{key}</span><span className="mt-1 block text-[10px] text-slate-500">Non-essential preference</span></span><input type="checkbox" checked={preferences[key]} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-orange" /></label>)}</div><div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => save({ essential: true, analytics: false, marketing: false })} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:border-navy">Reject non-essential</button><button type="button" onClick={() => save(preferences)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-xs font-extrabold text-navy hover:bg-orange-light"><Settings2 size={14} />Save preferences</button></div></section></div>;
}
