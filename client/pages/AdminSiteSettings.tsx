import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { SiteSettings } from "@shared/site-settings";
import { AdminSettingsHeading, SettingsCard, SettingsField, SettingsInput, SettingsLoading, SettingsSaveButton, SettingsTextarea } from "@/components/admin-settings-ui";
import { getAdminSiteSettings, saveSiteSettings } from "@/lib/site-settings";

const emptySite: SiteSettings = {
  siteName: "",
  siteDescription: "",
  supportEmail: "",
  contactInformation: "",
  defaultNotificationPreferences: { emailEnabled: false, inAppEnabled: true },
  maintenanceMode: false,
  maintenanceMessage: "",
};

export default function AdminSiteSettings() {
  const [site, setSite] = useState(emptySite);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminSiteSettings().then(({ site: settings }) => {
      if (active) setSite(settings);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load site settings.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const update = (field: keyof SiteSettings, value: string | boolean) => setSite((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await saveSiteSettings(site);
      toast.success("Site settings saved.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save site settings.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return <><AdminSettingsHeading eyebrow="Configuration" title="Site Settings" description="Manage global site details, notification defaults, and public maintenance mode." />
    {isLoading ? <SettingsLoading /> : <form onSubmit={submit} className="mt-8 space-y-6">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      <SettingsCard title="Site identity and contact" description="These details are available centrally to the public site and admin tools.">
        <div className="grid gap-5 md:grid-cols-2">
          <SettingsField label="Site name"><SettingsInput required maxLength={120} value={site.siteName} onChange={(event) => update("siteName", event.target.value)} /></SettingsField>
          <SettingsField label="Support email"><SettingsInput type="email" maxLength={254} value={site.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} /></SettingsField>
          <div className="md:col-span-2"><SettingsField label="Site description"><SettingsTextarea maxLength={500} value={site.siteDescription} onChange={(event) => update("siteDescription", event.target.value)} /></SettingsField></div>
          <div className="md:col-span-2"><SettingsField label="Contact information" hint="Displayed as text; email addresses are not opened in an external mail application."><SettingsTextarea maxLength={1000} value={site.contactInformation} onChange={(event) => update("contactInformation", event.target.value)} /></SettingsField></div>
        </div>
      </SettingsCard>
      <SettingsCard title="Default notification preferences" description="Defaults for future notification workflows; changing these does not alter existing notification records.">
        <div className="grid gap-3 sm:grid-cols-2">{(["emailEnabled", "inAppEnabled"] as const).map((field) => <label key={field} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700"><span className="text-xs font-bold text-navy dark:text-slate-100">{field === "emailEnabled" ? "Email notifications" : "In-app notifications"}</span><input type="checkbox" checked={site.defaultNotificationPreferences[field]} onChange={(event) => setSite((current) => ({ ...current, defaultNotificationPreferences: { ...current.defaultNotificationPreferences, [field]: event.target.checked } }))} className="h-4 w-4 accent-orange" /></label>)}</div>
      </SettingsCard>
      <SettingsCard title="Maintenance mode" description="Public routes display the maintenance notice while the admin panel and sign-in remain available.">
        <div className="space-y-5">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700"><span><span className="block text-xs font-bold text-navy dark:text-slate-100">Enable maintenance mode</span><span className="mt-1 block text-[11px] text-slate-400">The public site updates within a few seconds after saving.</span></span><input type="checkbox" checked={site.maintenanceMode} onChange={(event) => update("maintenanceMode", event.target.checked)} className="h-4 w-4 accent-orange" /></label>
          <SettingsField label="Maintenance message"><SettingsTextarea required maxLength={500} value={site.maintenanceMessage} onChange={(event) => update("maintenanceMessage", event.target.value)} /></SettingsField>
        </div>
      </SettingsCard>
      <div className="flex justify-end"><SettingsSaveButton isSaving={isSaving} /></div>
    </form>}
  </>;
}
