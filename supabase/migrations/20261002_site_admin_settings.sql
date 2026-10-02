CREATE TABLE IF NOT EXISTS public.site_admin_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  seo jsonb NOT NULL,
  site jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_admin_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.site_admin_settings (id, seo, site)
VALUES (
  true,
  '{"siteTitle":"Amazon Contributor Program","metaDescription":"Flexible work opportunities for a world of possibilities.","defaultKeywords":"Amazon contributor program, flexible work, remote work","ogTitle":"Amazon Contributor Program","ogDescription":"Flexible work opportunities for a world of possibilities.","ogImage":"","twitterTitle":"Amazon Contributor Program","twitterDescription":"Flexible work opportunities for a world of possibilities.","canonicalUrl":"","allowIndexing":true}'::jsonb,
  '{"siteName":"Amazon Contributor Program","siteDescription":"Flexible work opportunities for a world of possibilities.","supportEmail":"","contactInformation":"","defaultNotificationPreferences":{"emailEnabled":false,"inAppEnabled":true},"maintenanceMode":false,"maintenanceMessage":"We’re making a few improvements. Please check back shortly."}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.site_email_templates (
  key text PRIMARY KEY,
  label text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  html text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_email_templates ENABLE ROW LEVEL SECURITY;

INSERT INTO public.site_email_templates (key, label, subject, body, html, enabled) VALUES
  ('new_application', 'New application received', 'We received your application, {{name}}', 'Hello {{name}},\n\nYour application ({{reference_number}}) was received on {{date}}.', '<p>Hello {{name}},</p><p>Your application (<strong>{{reference_number}}</strong>) was received on {{date}}.</p>', false),
  ('application_status_changed', 'Application status changed', 'Your application status is {{status}}', 'Hello {{name}},\n\nYour application status changed to {{status}} on {{date}}.', '<p>Hello {{name}},</p><p>Your application status changed to <strong>{{status}}</strong> on {{date}}.</p>', false),
  ('device_request_received', 'Device request received', 'We received your {{device}} request', 'Hello {{name}},\n\nYour request for {{device}} ({{reference_number}}) was received on {{date}}.', '<p>Hello {{name}},</p><p>Your request for {{device}} (<strong>{{reference_number}}</strong>) was received on {{date}}.</p>', false),
  ('device_approved', 'Device request approved', 'Your {{device}} request was approved', 'Hello {{name}},\n\nYour request for {{device}} was approved on {{date}}.', '<p>Hello {{name}},</p><p>Your request for {{device}} was approved on {{date}}.</p>', false),
  ('device_rejected', 'Device request rejected', 'Your {{device}} request status changed', 'Hello {{name}},\n\nYour request for {{device}} was {{status}} on {{date}}.', '<p>Hello {{name}},</p><p>Your request for {{device}} was <strong>{{status}}</strong> on {{date}}.</p>', false),
  ('new_message', 'New message', 'You have a new message', 'Hello {{name}},\n\nYou have a new message about {{reference_number}}.', '<p>Hello {{name}},</p><p>You have a new message about {{reference_number}}.</p>', false),
  ('withdrawal_status', 'Withdrawal status changed', 'Your withdrawal status is {{status}}', 'Hello {{name}},\n\nYour withdrawal request ({{reference_number}}) is {{status}} as of {{date}}.', '<p>Hello {{name}},</p><p>Your withdrawal request (<strong>{{reference_number}}</strong>) is <strong>{{status}}</strong> as of {{date}}.</p>', false),
  ('interview_status', 'Interview status changed', 'Your interview status is {{status}}', 'Hello {{name}},\n\nYour interview status changed to {{status}} on {{date}}.', '<p>Hello {{name}},</p><p>Your interview status changed to <strong>{{status}}</strong> on {{date}}.</p>', false),
  ('admin_notification', 'Administrative notification', '{{status}}', '{{name}}: {{status}} ({{reference_number}}) on {{date}}.', '<p>{{name}}: <strong>{{status}}</strong> (<strong>{{reference_number}}</strong>) on {{date}}.</p>', false)
ON CONFLICT (key) DO NOTHING;
