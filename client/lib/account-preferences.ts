export function showInAppNotifications(userMetadata: Record<string, unknown> | undefined) {
  const preferences = userMetadata?.contributor_preferences;
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) return true;
  return (preferences as Record<string, unknown>).showInAppNotifications !== false;
}
