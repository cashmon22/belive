const FORMSPREE_ENDPOINT = "https://formspree.io/f/mvkodbjw";
const submittingFormTypes = new Set<string>();

export const FORM_SUBMISSION_ERROR = "Unable to submit your form. Please try again.";

export async function submitForm(formType: string, formData: Record<string, unknown>) {
  if (submittingFormTypes.has(formType)) throw new Error(FORM_SUBMISSION_ERROR);

  submittingFormTypes.add(formType);
  try {
    const submittedAt = new Date().toISOString();

    if (formType === "application") {
      // Supabase is the primary database — insert must succeed.
      const applicationId = crypto.randomUUID();
      const mirrorResponse = await fetch("/api/applications/mirror", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, applicationId, submittedAt }),
      });
      if (!mirrorResponse.ok) throw new Error("Database submission failed");

      // Formspree is a secondary notification — best effort, never blocks success.
      try {
        await fetch(FORMSPREE_ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, formType, submittedAt }),
        });
      } catch {
        // Formspree is not the database source — ignore failures.
      }
    } else {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, formType, submittedAt }),
      });
      if (!response.ok) throw new Error("Form submission failed");
    }
  } catch {
    throw new Error(FORM_SUBMISSION_ERROR);
  } finally {
    submittingFormTypes.delete(formType);
  }
}
