import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getPublicPolicies } from "@/lib/legal";
import type { LegalPolicy, LegalPolicyKey } from "@shared/legal";

const policyLabels: Record<LegalPolicyKey, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  cookies: "Cookie Policy",
  "contributor-agreement": "Contributor Agreement",
};

function PolicyText({ policy }: { policy: LegalPolicy }) {
  return <article className="mt-7 rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange">Version {policy.version}</p><h2 className="mt-2 text-xl font-extrabold text-navy">{policy.title}</h2></div><p className="text-xs text-slate-500">Effective {new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${policy.effective_date}T00:00:00Z`))}</p></div><div className="whitespace-pre-wrap break-words pt-6 text-sm leading-7 text-slate-600">{policy.content}</div>{policy.acknowledgement_required && <p className="mt-6 rounded-lg border border-orange/25 bg-orange/[0.06] p-4 text-xs leading-5 text-slate-700">This policy version requires acknowledgement from signed-in contributors.</p>}</article>;
}

export default function LegalPolicies() {
  const { slug } = useParams();
  const [policies, setPolicies] = useState<LegalPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void getPublicPolicies().then((items) => { if (active) setPolicies(items); }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load policies.");
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);
  const selected = policies.find((policy) => policy.policy_key === slug);
  return <div className="min-h-screen bg-[#f8f9fa] text-ink"><SiteHeader /><main className="mx-auto min-h-[60vh] max-w-[1000px] px-5 py-12 sm:px-8 sm:py-16"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy text-orange"><ShieldCheck size={23} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Trust &amp; transparency</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">Legal &amp; Policies</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Review the current policies for the Contributor Program.</p></div></div>
    {isLoading ? <div className="mt-8 h-40 animate-pulse rounded-xl border border-slate-200 bg-white" aria-label="Loading policies" /> : error ? <div role="alert" className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : policies.length === 0 ? <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center"><FileText size={24} className="mx-auto text-slate-300" /><h2 className="mt-3 text-sm font-bold text-navy">Policies are not published yet</h2><p className="mt-2 text-xs text-slate-500">Published policy documents will appear here.</p></div> : <>
      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Legal policy documents">{policies.map((policy) => <Link key={policy.id} to={`/legal/${policy.policy_key}`} aria-current={selected?.id === policy.id ? "page" : undefined} className={`rounded-lg border px-4 py-2.5 text-xs font-bold transition ${selected?.id === policy.id || (!slug && policies[0].id === policy.id) ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-navy hover:border-orange"}`}>{policyLabels[policy.policy_key]}</Link>)}</nav>
      {selected ? <PolicyText policy={selected} /> : slug ? <div role="alert" className="mt-7 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No published policy was found for this section.</div> : <div className="mt-7 space-y-4">{policies.map((policy) => <PolicyText key={policy.id} policy={policy} />)}</div>}
    </>}
    <p className="mt-8 text-xs text-slate-500">Questions about these policies? <Link className="font-bold text-navy hover:text-orange" to="/contact">Contact support</Link>.</p>
  </main><SiteFooter /></div>;
}
