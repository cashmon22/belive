import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { SeoSettings } from "@shared/site-settings";
import { AdminSettingsHeading, SettingsCard, SettingsField, SettingsInput, SettingsLoading, SettingsSaveButton, SettingsTextarea } from "@/components/admin-settings-ui";
import { getAdminSiteSettings, saveSeoSettings } from "@/lib/site-settings";

const emptySeo: SeoSettings = {
  siteTitle: "",
  metaDescription: "",
  defaultKeywords: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterTitle: "",
  twitterDescription: "",
  canonicalUrl: "",
  allowIndexing: true,
};

export default function AdminSEO() {
  const [seo, setSeo] = useState(emptySeo);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminSiteSettings().then(({ seo: settings }) => {
      if (active) setSeo(settings);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load SEO settings.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const update = (field: keyof SeoSettings, value: string | boolean) => setSeo((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      await saveSeoSettings(seo);
      toast.success("SEO settings saved.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save SEO settings.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return <><AdminSettingsHeading eyebrow="Discoverability" title="SEO Center" description="Manage the public site’s search, canonical, and social preview metadata." />
    {isLoading ? <SettingsLoading /> : <form onSubmit={submit} className="mt-8 space-y-6">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      <SettingsCard title="Search appearance" description="These defaults apply across the public website and update without a rebuild.">
        <div className="grid gap-5 md:grid-cols-2">
          <SettingsField label="Site title"><SettingsInput required maxLength={120} value={seo.siteTitle} onChange={(event) => update("siteTitle", event.target.value)} /></SettingsField>
          <SettingsField label="Default keywords" hint="Separate keywords with commas."><SettingsInput maxLength={500} value={seo.defaultKeywords} onChange={(event) => update("defaultKeywords", event.target.value)} /></SettingsField>
          <div className="md:col-span-2"><SettingsField label="Meta description"><SettingsTextarea maxLength={320} value={seo.metaDescription} onChange={(event) => update("metaDescription", event.target.value)} /></SettingsField></div>
          <SettingsField label="Canonical site URL" hint="Use the production site root. When blank, the live request origin is used."><SettingsInput type="url" placeholder="https://example.com" value={seo.canonicalUrl} onChange={(event) => update("canonicalUrl", event.target.value)} /></SettingsField>
          <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700"><span><span className="block text-xs font-bold text-navy dark:text-slate-100">Allow search indexing</span><span className="mt-1 block text-[11px] text-slate-400">Controls robots directives and sitemap availability.</span></span><input type="checkbox" checked={seo.allowIndexing} onChange={(event) => update("allowIndexing", event.target.checked)} className="h-4 w-4 accent-orange" /></label>
        </div>
      </SettingsCard>
      <SettingsCard title="Social previews" description="Open Graph and Twitter/X metadata for shared public pages.">
        <div className="grid gap-5 md:grid-cols-2">
          <SettingsField label="Open Graph title"><SettingsInput maxLength={120} value={seo.ogTitle} onChange={(event) => update("ogTitle", event.target.value)} /></SettingsField>
          <SettingsField label="Open Graph image URL"><SettingsInput type="url" maxLength={2048} value={seo.ogImage} onChange={(event) => update("ogImage", event.target.value)} /></SettingsField>
          <div className="md:col-span-2"><SettingsField label="Open Graph description"><SettingsTextarea maxLength={320} value={seo.ogDescription} onChange={(event) => update("ogDescription", event.target.value)} /></SettingsField></div>
          <SettingsField label="Twitter/X card title"><SettingsInput maxLength={120} value={seo.twitterTitle} onChange={(event) => update("twitterTitle", event.target.value)} /></SettingsField>
          <div className="md:col-span-2"><SettingsField label="Twitter/X card description"><SettingsTextarea maxLength={320} value={seo.twitterDescription} onChange={(event) => update("twitterDescription", event.target.value)} /></SettingsField></div>
        </div>
      </SettingsCard>
      <div className="flex justify-end"><SettingsSaveButton isSaving={isSaving} /></div>
    </form>}
  </>;
}
