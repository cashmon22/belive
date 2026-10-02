import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FilePlus2, ShieldCheck } from "lucide-react";
import { AdminSettingsHeading, SettingsCard, SettingsField, SettingsInput, SettingsLoading, SettingsSaveButton, SettingsTextarea } from "@/components/admin-settings-ui";
import { getAdminPolicies, saveAdminPolicy } from "@/lib/legal";
import type { LegalPolicy, LegalPolicyKey } from "@shared/legal";

type PolicyDraft = {
  id?: string;
  policy_key: LegalPolicyKey;
  title: string;
  content: string;
  version: number;
  effective_date: string;
  is_published: boolean;
  acknowledgement_required: boolean;
};

const policyLabels: Record<LegalPolicyKey, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  cookies: "Cookie Policy",
  "contributor-agreement": "Contributor Agreement",
};
const policyKeys = Object.keys(policyLabels) as LegalPolicyKey[];
const today = () => new Date().toISOString().slice(0, 10);

function nextDraft(policies: LegalPolicy[], key: LegalPolicyKey): PolicyDraft {
  const version = Math.max(0, ...policies.filter((policy) => policy.policy_key === key).map((policy) => policy.version)) + 1;
  return { policy_key: key, title: policyLabels[key], content: "", version, effective_date: today(), is_published: false, acknowledgement_required: false };
}

export default function AdminLegalManagement() {
  const [policies, setPolicies] = useState<LegalPolicy[]>([]);
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const selected = policies.find((policy) => policy.id === selectedId);
  const isPublished = Boolean(selected?.is_published);

  useEffect(() => {
    let active = true;
    void getAdminPolicies().then((result) => {
      if (!active) return;
      setPolicies(result.policies);
      const first = result.policies[0];
      if (first) {
        setSelectedId(first.id);
        setDraft({ id: first.id, policy_key: first.policy_key, title: first.title, content: first.content, version: first.version, effective_date: first.effective_date, is_published: Boolean(first.is_published), acknowledgement_required: first.acknowledgement_required });
      }
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load legal policies.");
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const options = useMemo(() => policies.map((policy) => ({
    ...policy,
    label: `${policyLabels[policy.policy_key]} · v${policy.version}${policy.is_published ? " · Published" : " · Draft"}`,
  })), [policies]);

  const select = (id: string, availablePolicies = policies) => {
    setSelectedId(id);
    const policy = availablePolicies.find((item) => item.id === id);
    setDraft(policy ? { id: policy.id, policy_key: policy.policy_key, title: policy.title, content: policy.content, version: policy.version, effective_date: policy.effective_date, is_published: Boolean(policy.is_published), acknowledgement_required: policy.acknowledgement_required } : null);
  };

  const createVersion = (key: LegalPolicyKey) => {
    setSelectedId("");
    setDraft(nextDraft(policies, key));
    setError("");
  };

  const update = <K extends keyof PolicyDraft>(field: K, value: PolicyDraft[K]) => {
    setDraft((current) => current ? { ...current, [field]: value } : current);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      await saveAdminPolicy(draft);
      const refreshed = await getAdminPolicies();
      setPolicies(refreshed.policies);
      const saved = refreshed.policies.find((item) => item.id === draft.id || (item.policy_key === draft.policy_key && item.version === draft.version));
      if (saved) select(saved.id, refreshed.policies);
      toast.success("Policy version saved.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save policy.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return <><AdminSettingsHeading eyebrow="Governance" title="Legal & Compliance" description="Publish policy documents and preserve each historical version. Published versions cannot be edited." />
    {isLoading ? <SettingsLoading /> : <>
      {error && <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      <div className="mt-8 flex flex-wrap gap-2">{policyKeys.map((key) => <button key={key} type="button" onClick={() => createVersion(key)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-navy hover:border-orange"><FilePlus2 size={15} />New {policyLabels[key]} version</button>)}</div>
      <form onSubmit={submit} className="mt-6 space-y-6">
        <SettingsCard title="Policy version" description="Use a new sequential version when policy content changes after publication.">
          <div className="grid gap-5 md:grid-cols-2"><SettingsField label="Existing versions"><select value={selectedId} onChange={(event) => select(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-orange dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"><option value="">New version</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></SettingsField><SettingsField label="Policy type"><select disabled={Boolean(draft?.id)} value={draft?.policy_key ?? "terms"} onChange={(event) => createVersion(event.target.value as LegalPolicyKey)} className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-orange disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"><option value="terms">Terms of Service</option><option value="privacy">Privacy Policy</option><option value="cookies">Cookie Policy</option><option value="contributor-agreement">Contributor Agreement</option></select></SettingsField></div>
          {draft && <div className="mt-5 grid gap-5 md:grid-cols-2"><SettingsField label="Version"><SettingsInput type="number" min={1} value={draft.version} readOnly className="bg-slate-50" /></SettingsField><SettingsField label="Effective date"><SettingsInput type="date" required value={draft.effective_date} disabled={isPublished} onChange={(event) => update("effective_date", event.target.value)} /></SettingsField></div>}
        </SettingsCard>
        {draft && <>
          <SettingsCard title="Policy content" description="Write the policy text to be displayed publicly. Content is rendered as plain text.">
            <div className="space-y-5"><SettingsField label="Policy title"><SettingsInput required maxLength={160} value={draft.title} disabled={isPublished} onChange={(event) => update("title", event.target.value)} /></SettingsField><SettingsField label="Content"><SettingsTextarea required maxLength={50000} className="min-h-80" value={draft.content} disabled={isPublished} onChange={(event) => update("content", event.target.value)} /></SettingsField></div>
          </SettingsCard>
          <SettingsCard title="Publication & consent" description="Required acknowledgement prompts contributors to accept each new published version once.">
            <div className="space-y-3"><label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700"><input type="checkbox" checked={draft.is_published} disabled={isPublished} onChange={(event) => update("is_published", event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange" /><span><span className="block text-xs font-bold text-navy dark:text-slate-100">Published</span><span className="mt-1 block text-xs leading-5 text-slate-500">Published policy content is immutable. Create a new version for future changes.</span></span></label><label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700"><input type="checkbox" checked={draft.acknowledgement_required} disabled={isPublished} onChange={(event) => update("acknowledgement_required", event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange" /><span><span className="block text-xs font-bold text-navy dark:text-slate-100">Acknowledgement required</span><span className="mt-1 block text-xs leading-5 text-slate-500">Contributors will be prompted to review and acknowledge this version.</span></span></label></div>
          </SettingsCard>
          {isPublished && <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-900"><ShieldCheck size={17} className="mt-0.5 shrink-0" />This published version is preserved in policy history and cannot be overwritten.</div>}
          {!isPublished && <div className="flex justify-end"><SettingsSaveButton isSaving={isSaving} /></div>}
        </>}
      </form>
    </>}
  </>;
}
