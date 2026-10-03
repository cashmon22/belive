import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, FileText, Image as ImageIcon, LoaderCircle, Save, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getAdminKyc, getAdminKycInstructions, getAdminKycSubmission, reviewKyc, saveAdminKycInstructions, type KycIdType, type KycInstructions, type KycSubmission } from "@/lib/kyc";

const tabs = ["Submissions", "Instructions"] as const;
type Tab = typeof tabs[number];
const fieldClass = "mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-orange focus:ring-2 focus:ring-orange/20";

export default function AdminKyc() {
  const [tab, setTab] = useState<Tab>("Submissions");
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [selected, setSelected] = useState<KycSubmission | null>(null);
  const [instructions, setInstructions] = useState<KycInstructions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const reloadList = async () => {
    const result = await getAdminKyc(statusFilter);
    setCounts(result.counts);
    setSubmissions(result.submissions);
    if (selected && !result.submissions.some((item) => item.id === selected.id)) setSelected(null);
  };

  useEffect(() => {
    let active = true;
    void getAdminKyc(statusFilter).then((result) => {
      if (!active) return;
      setCounts(result.counts);
      setSubmissions(result.submissions);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load KYC submissions.");
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [statusFilter]);

  useEffect(() => {
    if (tab !== "Instructions" || instructions) return;
    let active = true;
    void getAdminKycInstructions().then((value) => { if (active) setInstructions(value); }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load KYC instructions."); });
    return () => { active = false; };
  }, [tab, instructions]);

  const selectedType = useMemo(() => instructions?.acceptedIdTypes ?? [], [instructions]);
  const openSubmission = async (id: string) => {
    setError("");
    try {
      const result = await getAdminKycSubmission(id);
      setSelected(result.submission);
      setRejectionReason("");
      setShowReject(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the secure submission.");
    }
  };

  const decide = async (status: "approved" | "rejected") => {
    if (!selected || isSaving) return;
    if (status === "rejected" && !rejectionReason.trim()) {
      setError("Provide a rejection reason before rejecting this submission.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await reviewKyc(selected.id, status, rejectionReason.trim());
      toast.success(status === "approved" ? "KYC approved." : "KYC rejected. The contributor has been notified.");
      setSelected(null);
      setShowReject(false);
      setRejectionReason("");
      await reloadList();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to save the review decision.");
    } finally { setIsSaving(false); }
  };

  const updateType = (index: number, update: Partial<KycIdType>) => setInstructions((current) => current ? ({ ...current, acceptedIdTypes: current.acceptedIdTypes.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item) }) : current);
  const addType = () => setInstructions((current) => current ? ({ ...current, acceptedIdTypes: [...current.acceptedIdTypes, { id: `id_type_${Date.now()}`, label: "New ID type", instructions: "Add document guidance." }] }) : current);
  const removeType = (index: number) => setInstructions((current) => current ? ({ ...current, acceptedIdTypes: current.acceptedIdTypes.filter((_, itemIndex) => itemIndex !== index) }) : current);
  const saveInstructions = async () => {
    if (!instructions || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      await saveAdminKycInstructions({ instructions: instructions.instructions, acceptedIdTypes: instructions.acceptedIdTypes });
      toast.success("KYC instructions saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save KYC instructions.");
    } finally { setIsSaving(false); }
  };

  return <div className="space-y-7">
    <header><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Identity review</p><h2 className="mt-2 text-[32px] font-extrabold tracking-[-0.04em] text-navy sm:text-[40px]">KYC Verification</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Review private contributor identity submissions and manage the instructions shown in the verification flow.</p></header>
    <div className="flex gap-2 border-b border-slate-200">{tabs.map((item) => <button key={item} type="button" onClick={() => { setTab(item); setError(""); }} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === item ? "border-orange text-navy" : "border-transparent text-slate-500 hover:text-navy"}`}>{item}</button>)}</div>
    {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
    {tab === "Submissions" ? <>
      <section className="grid gap-3 sm:grid-cols-3" aria-label="KYC submission counts">{[{ id: "pending" as const, title: "Pending review", icon: ClipboardCheck }, { id: "approved" as const, title: "Approved", icon: CheckCircle2 }, { id: "rejected" as const, title: "Rejected", icon: XCircle }].map(({ id, title, icon: Icon }) => <button key={id} type="button" onClick={() => setStatusFilter(id)} className={`rounded-xl border bg-white p-5 text-left shadow-sm transition ${statusFilter === id ? "border-orange ring-2 ring-orange/10" : "border-slate-200 hover:border-orange/50"}`}><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange/10 text-orange"><Icon size={19} /></span><p className="mt-4 text-2xl font-extrabold text-navy">{counts[id]}</p><p className="mt-1 text-xs font-semibold text-slate-500">{title}</p></button>)}</section>
      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h3 className="text-sm font-extrabold text-navy">{statusFilter === "pending" ? "Pending submissions" : `${statusFilter[0].toUpperCase()}${statusFilter.slice(1)} submissions`}</h3><p className="mt-1 text-xs text-slate-500">Select a submission to inspect its private review materials.</p></div>{isLoading ? <p className="p-6 text-sm text-slate-500">Loading submissions…</p> : submissions.length ? <ul className="divide-y divide-slate-100">{submissions.map((item) => <li key={item.id}><button type="button" onClick={() => void openSubmission(item.id)} className={`w-full p-4 text-left transition hover:bg-slate-50 ${selected?.id === item.id ? "bg-orange/[0.06]" : ""}`}><span className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block truncate text-sm font-extrabold text-navy">{item.contributor_name || "Contributor"}</span><span className="mt-1 block truncate text-xs text-slate-500">{item.contributor_email}</span></span><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${item.status === "pending" ? "bg-amber-50 text-amber-700" : item.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{item.status}</span></span><span className="mt-3 block text-[11px] text-slate-400">Submitted {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : "—"}</span></button></li>)}</ul> : <div className="p-8 text-center"><ClipboardCheck size={25} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-bold text-navy">No submissions in this queue</p></div>}</div>
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">{!selected ? <div className="flex min-h-64 flex-col items-center justify-center text-center"><ShieldCheck size={30} className="text-slate-300" /><p className="mt-3 text-sm font-bold text-navy">Secure review workspace</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Submission images are available only to authorized reviewers and use temporary private links.</p></div> : <div className="space-y-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-orange">{selected.status}</p><h3 className="mt-1 text-xl font-extrabold text-navy">{selected.identity_information?.fullName || "Contributor"}</h3><p className="mt-1 text-xs text-slate-500">{selected.contributor_email}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Close KYC review" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><XCircle size={18} /></button></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">ID type</p><p className="mt-1 text-sm font-bold text-navy">{selected.id_type || "Not available"}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Submission date</p><p className="mt-1 text-sm font-bold text-navy">{selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : "—"}</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">{[{ title: "Government ID image", url: selected.id_image_url }, { title: "Selfie image", url: selected.selfie_image_url }].map(({ title, url }) => <div key={title} className="overflow-hidden rounded-lg border border-slate-200"><div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs font-bold text-navy"><ImageIcon size={15} className="text-orange" />{title}</div>{url ? <a href={url} target="_blank" rel="noreferrer" className="block bg-slate-50"><img src={url} alt={title} className="h-48 w-full object-contain" /></a> : <p className="p-5 text-xs text-red-700">Image is unavailable.</p>}</div>)}</div>
          <div className="rounded-lg border border-slate-200 p-4"><h4 className="flex items-center gap-2 text-xs font-extrabold text-navy"><UserRound size={15} />Submitted information</h4><dl className="mt-3 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">{[["Full name", selected.identity_information?.fullName], ["Date of birth", selected.identity_information?.dateOfBirth], ["Document number", selected.identity_information?.documentNumber], ["Expiry date", selected.identity_information?.expiryDate || "Not provided"]].map(([label, value]) => <div key={label}><dt className="text-slate-400">{label}</dt><dd className="mt-0.5 break-words font-semibold text-navy">{value || "—"}</dd></div>)}</dl></div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><h4 className="flex items-center gap-2 text-xs font-extrabold text-amber-900"><AlertCircle size={15} />Automatic quality flags</h4>{selected.quality_flags?.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-900">{selected.quality_flags.map((flag, index) => <li key={`${flag}-${index}`}>{flag}</li>)}</ul> : <p className="mt-2 text-xs text-amber-900">No basic image quality issue was flagged. No automated authenticity or liveness verification was performed.</p>}</div>
          {selected.status === "pending" && <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">{showReject && <label className="text-xs font-bold text-slate-600">Reason for rejection<textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={2000} rows={3} placeholder="Explain clearly what needs to be corrected…" className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal text-navy outline-none focus:border-orange" />{!rejectionReason.trim() && <span className="mt-1 block text-[11px] font-medium text-red-600">A reason is required to reject KYC.</span>}</label>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{showReject ? <button type="button" onClick={() => { setShowReject(false); setRejectionReason(""); }} className="h-11 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-600">Cancel</button> : <button type="button" onClick={() => setShowReject(true)} className="h-11 rounded-lg border border-red-200 px-4 text-xs font-bold text-red-700">Reject KYC</button>}{showReject ? <button type="button" onClick={() => void decide("rejected")} disabled={!rejectionReason.trim() || isSaving} className="h-11 rounded-lg bg-red-600 px-4 text-xs font-extrabold text-white disabled:opacity-50">{isSaving ? "Saving…" : "Confirm rejection"}</button> : <button type="button" onClick={() => void decide("approved")} disabled={isSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-extrabold text-white disabled:opacity-50">{isSaving ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}Approve KYC</button>}</div></div>}
          {selected.status !== "pending" && selected.rejection_reason && <p className="rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-800"><strong>Rejection reason: </strong>{selected.rejection_reason}</p>}
        </div>}</div>
      </section>
    </> : <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">{!instructions ? <div className="p-8 text-sm text-slate-500">Loading instructions…</div> : <><div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div><h3 className="flex items-center gap-2 text-sm font-extrabold text-navy"><FileText size={17} className="text-orange" />KYC instructions</h3><p className="mt-1 text-xs text-slate-500">These instructions are shown to contributors before and during KYC.</p></div><label className="block text-xs font-bold text-slate-600">General instructions<textarea value={instructions.instructions} onChange={(event) => setInstructions({ ...instructions, instructions: event.target.value })} maxLength={5000} rows={7} className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal leading-6 text-navy outline-none focus:border-orange" /></label><div className="flex items-center justify-between gap-3"><div><h4 className="text-xs font-extrabold text-navy">Accepted ID types</h4><p className="mt-1 text-[11px] text-slate-500">ID type IDs must be unique and stable.</p></div><button type="button" onClick={addType} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-navy hover:border-orange">Add ID type</button></div><div className="space-y-3">{instructions.acceptedIdTypes.map((type, index) => <div key={`${type.id}-${index}`} className="rounded-lg border border-slate-200 p-3"><div className="grid gap-3 sm:grid-cols-[0.7fr_1fr_auto]"><label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Identifier<input value={type.id} onChange={(event) => updateType(index, { id: event.target.value })} className={fieldClass} /></label><label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Display name<input value={type.label} onChange={(event) => updateType(index, { label: event.target.value })} className={fieldClass} /></label><button type="button" onClick={() => removeType(index)} disabled={instructions.acceptedIdTypes.length < 2} className="mt-5 h-11 rounded-lg px-3 text-xs font-bold text-red-600 disabled:opacity-40">Remove</button></div><label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Instructions<textarea value={type.instructions} onChange={(event) => updateType(index, { instructions: event.target.value })} rows={2} className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal text-navy outline-none focus:border-orange" /></label></div>)}</div><button type="button" onClick={() => void saveInstructions()} disabled={isSaving || !instructions.instructions.trim() || instructions.acceptedIdTypes.length < 1} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange px-4 text-xs font-extrabold text-navy disabled:opacity-50"><Save size={16} />{isSaving ? "Saving…" : "Save changes"}</button></div><aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange">Contributor view</p><h3 className="mt-2 text-xl font-extrabold text-navy">Preview instructions</h3><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{instructions.instructions}</p><div className="mt-5 space-y-3">{selectedType.map((type) => <div key={type.id} className="rounded-lg border border-slate-200 p-4"><p className="text-sm font-extrabold text-navy">{type.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{type.instructions}</p></div>)}</div><p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-slate-500"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-orange" />KYC documents are held in private storage. No third-party OCR, face verification, or liveness provider is configured.</p></aside></>}</section>}
  </div>;
}
