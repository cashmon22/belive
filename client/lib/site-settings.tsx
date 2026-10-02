import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "./api-request";
import type { AdminSettingsResponse, EmailTemplate, PublicSiteSettings, SeoSettings, SiteSettings } from "@shared/site-settings";

const SiteSettingsContext = createContext<PublicSiteSettings | null>(null);
const SiteSettingsLoadedContext = createContext(false);

export function PublicSiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSiteSettings | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/site/settings", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load site settings.");
        const data = (await response.json()) as PublicSiteSettings;
        if (active) setSettings(data);
      } catch {
        if (active) setSettings(null);
      } finally {
        if (active) setLoaded(true);
      }
    };
    void loadSettings();
    const interval = window.setInterval(() => void loadSettings(), 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return <SiteSettingsLoadedContext.Provider value={loaded}><SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider></SiteSettingsLoadedContext.Provider>;
}

export function usePublicSiteSettings() {
  return useContext(SiteSettingsContext);
}

export function useSiteSettingsLoaded() {
  return useContext(SiteSettingsLoadedContext);
}

export function getAdminSiteSettings() {
  return apiRequest<AdminSettingsResponse>("/api/admin/site-settings");
}

export function saveSeoSettings(settings: SeoSettings) {
  return apiRequest<{ success: true }>("/api/admin/site-settings/seo", { method: "PUT", body: JSON.stringify(settings) });
}

export function saveSiteSettings(settings: SiteSettings) {
  return apiRequest<{ success: true }>("/api/admin/site-settings/site", { method: "PUT", body: JSON.stringify(settings) });
}

export function saveEmailTemplates(templates: EmailTemplate[]) {
  return apiRequest<{ success: true }>("/api/admin/site-settings/templates", { method: "PUT", body: JSON.stringify(templates) });
}
