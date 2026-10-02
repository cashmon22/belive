import { useEffect, useState, type FormEvent } from "react";
import { MailWarning } from "lucide-react";
import { toast } from "sonner";
import type { EmailTemplate } from "@shared/site-settings";
import { AdminSettingsHeading, SettingsCard, SettingsField, SettingsInput, SettingsLoading, SettingsSaveButton, SettingsTextarea } from "@/components/admin-settings-ui";
import { getAdminSiteSettings, saveEmailTemplates } from "@/lib/site-settings";

export default function AdminEmailManagement() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const selected = templates.find((template) => template.key === selectedKey);

  useEffect(() => {
    let active = true;
    void getAdminSiteSettings().then(({ templates: values }) => {
      if (!active) return;
      setTemplates(values);
      setSelectedKey(values[0]?.key ?? "");
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load email templates.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const updateSelected = (field: keyof EmailTemplate, value: string | boolean) => {
    setTemplates((current) => current.map((template) => template.key === selectedKey ? { ...template, [field]: value } : template));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await saveEmailTemplates(templates);
      toast.success("Email templates saved.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save email templates.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return <><AdminSettingsHeading eyebrow="Communications" title="Email Management" description="Edit notification templates and control which event templates are enabled." />
    {isLoading ? <SettingsLoading /> : <form onSubmit={submit} className="mt-8 space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950" role="status"><MailWarning size={18} className="mt-0.5 shrink-0" /><div><p className="text-xs font-extrabold">Email delivery is not configured</p><p className="mt-1 text-xs leading-5">Templates are stored and validated, but this application currently has no server-side transactional email provider. Enabling a template will not send email until a provider is configured.</p></div></div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      <SettingsCard title="Notification event" description="Templates cover applications, device requests, messages, withdrawals, interviews, and general admin notifications.">
        <div className="grid gap-5 md:grid-cols-2">
          <SettingsField label="Template"><select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-orange focus:ring-2 focus:ring-orange/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">{templates.map((template) => <option key={template.key} value={template.key}>{template.label}</option>)}</select></SettingsField>
          {selected && <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700"><span><span className="block text-xs font-bold text-navy dark:text-slate-100">Template enabled</span><span className="mt-1 block text-[11px] text-slate-400">Applies when a delivery provider is configured.</span></span><input type="checkbox" checked={selected.enabled} onChange={(event) => updateSelected("enabled", event.target.checked)} className="h-4 w-4 accent-orange" /></label>}
        </div>
      </SettingsCard>
      {selected && <SettingsCard title="Template content" description="Supported variables: {{name}}, {{email}}, {{device}}, {{reference_number}}, {{status}}, {{date}}.">
        <div className="space-y-5">
          <SettingsField label="Subject"><SettingsInput required maxLength={200} value={selected.subject} onChange={(event) => updateSelected("subject", event.target.value)} /></SettingsField>
          <SettingsField label="Plain-text body"><SettingsTextarea maxLength={10000} value={selected.body} onChange={(event) => updateSelected("body", event.target.value)} /></SettingsField>
          <SettingsField label="HTML body" hint="Script, style, event-handler, and unsafe link attributes are removed before storage."><SettingsTextarea className="min-h-48 font-mono text-xs" maxLength={20000} value={selected.html} onChange={(event) => updateSelected("html", event.target.value)} /></SettingsField>
        </div>
      </SettingsCard>}
      <div className="flex justify-end"><SettingsSaveButton isSaving={isSaving} /></div>
    </form>}
  </>;
}
