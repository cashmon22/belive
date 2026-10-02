import { useEffect, useState } from "react";
import { Check, Copy, Share2, UsersRound } from "lucide-react";
import { getContributorReferrals } from "@/lib/referrals";
import type { ContributorReferralSummary } from "@shared/referrals";

function displayDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(date));
}

export default function ReferEarnSection() {
  const [data, setData] = useState<ContributorReferralSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const referralLink = data ? `${window.location.origin}/apply?ref=${encodeURIComponent(data.code)}` : "";

  useEffect(() => {
    let active = true;
    void getContributorReferrals().then((result) => {
      if (active) setData(result);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load referrals.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("Clipboard access is unavailable in this browser.");
    }
  };

  const share = async () => {
    if (!data) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join the Contributor Program", url: referralLink });
      } catch (shareError) {
        if (shareError instanceof Error && shareError.name !== "AbortError") setError("Unable to share the referral link.");
      }
      return;
    }
    await copy("link", referralLink);
  };

  return <div>
    <div className="border-b border-slate-200 pb-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Contributor growth</p><h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.04em] text-navy sm:text-[32px]">Refer &amp; Earn</h1><p className="mt-2 max-w-[600px] text-sm leading-6 text-slate-500">Invite people to apply to the contributor program and track their application status here.</p></div>
    {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</div>}
    {isLoading ? <div className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Loading referral information">{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div> : data && <>
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6" aria-labelledby="referral-link-title">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange/10 text-orange"><UsersRound size={20} /></span><div><h2 id="referral-link-title" className="text-sm font-extrabold text-navy">Your invitation link</h2><p className="mt-1 text-xs text-slate-500">Share this link so the referral code is included with an application.</p></div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="min-w-0 rounded-lg border border-slate-200 bg-[#fbfcfd] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Referral link</p><p className="mt-1 break-all text-xs font-semibold text-navy">{referralLink}</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void copy("link", referralLink)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-bold text-navy hover:border-orange/50">{copied === "link" ? <Check size={15} /> : <Copy size={15} />}{copied === "link" ? "Copied" : "Copy link"}</button><button type="button" onClick={() => void share()} className="inline-flex items-center gap-2 rounded-lg bg-orange px-3 py-2.5 text-xs font-extrabold text-navy hover:bg-orange-light"><Share2 size={15} />Share</button></div>
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Referral code</p><p className="mt-1 font-mono text-sm font-extrabold tracking-[0.12em] text-navy">{data.code}</p></div><button type="button" onClick={() => void copy("code", data.code)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-bold text-navy hover:border-orange/50">{copied === "code" ? <Check size={15} /> : <Copy size={15} />}{copied === "code" ? "Copied" : "Copy code"}</button></div>
      </section>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{[["Total referrals", data.total], ["Successful", data.successful], ["Pending", data.pending]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold text-navy">{value}</p></div>)}</div>
      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card" aria-labelledby="referral-history-title"><div className="border-b border-slate-100 px-5 py-4"><h2 id="referral-history-title" className="text-sm font-extrabold text-navy">Referral history</h2></div>{data.history.length === 0 ? <p className="px-5 py-12 text-center text-sm text-slate-500">Your referral history will appear here once an invited contributor account is created.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-[#fbfcfd] text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3 font-bold">Referred contributor</th><th className="px-5 py-3 font-bold">Date</th><th className="px-5 py-3 font-bold">Status</th><th className="px-5 py-3 font-bold">Reward</th></tr></thead><tbody className="divide-y divide-slate-100">{data.history.map((referral) => <tr key={referral.id}><td className="px-5 py-4 font-bold text-navy">{referral.referredContributor}</td><td className="px-5 py-4 text-slate-500">{displayDate(referral.date)}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{referral.status}</span></td><td className="px-5 py-4 text-slate-500">{referral.reward === null ? "—" : `$${referral.reward.toFixed(2)}`}</td></tr>)}</tbody></table></div>}</section>
      <p className="mt-4 text-xs leading-5 text-slate-400">No referral reward is shown unless a reward transaction has been recorded.</p>
    </>}
  </div>;
}
