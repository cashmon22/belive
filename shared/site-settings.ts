export type SeoSettings = {
  siteTitle: string;
  metaDescription: string;
  defaultKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  canonicalUrl: string;
  allowIndexing: boolean;
};

export type SiteSettings = {
  siteName: string;
  siteDescription: string;
  supportEmail: string;
  contactInformation: string;
  defaultNotificationPreferences: {
    emailEnabled: boolean;
    inAppEnabled: boolean;
  };
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

export type EmailTemplate = {
  key: string;
  label: string;
  subject: string;
  body: string;
  html: string;
  enabled: boolean;
};

export type AdminSettingsResponse = {
  seo: SeoSettings;
  site: SiteSettings;
  templates: EmailTemplate[];
};

export type PublicSiteSettings = {
  seo: SeoSettings;
  site: Pick<SiteSettings, "siteName" | "siteDescription" | "supportEmail" | "contactInformation" | "maintenanceMode" | "maintenanceMessage">;
};
