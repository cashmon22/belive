import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserCircle,
  X,
  XCircle,
} from "lucide-react";
import type {
  AdminApplication,
  AdminApplicationStatus,
  VerificationStatus,
} from "@shared/admin-applications";
import {
  getAdminApplicationDetails,
  listAdminApplications,
  updateAdminApplicationStatus,
  updateAdminApplicationVerification,
} from "@/lib/admin-applications";

type FilterKey = "all" | VerificationStatus | AdminApplicationStatus;

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All Applicants" },
  { key: "Verified", label: "Verified" },
  { key: "Not Verified", label: "Not Verified" },
  { key: "Under Review", label: "Under Review" },
  { key: "Approved", label: "Approved" },
  { key: "Rejected", label: "Rejected" },
];

function formatDate(value: string) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function displayValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "string" && value.trim()) return value;
  return String(value ?? "—");
}

function StatusBadge({ status }: { status: AdminApplicationStatus }) {
  const styles: Record<AdminApplicationStatus, string> = {
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Rejected: "bg-red-50 text-red-700 border-red-200",
    "Under Review": "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${styles[status]}`}>
      {status}
    </span>
  );
}

function VerificationBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status === "Verified" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
      {status === "Verified" ? <BadgeCheck size={11} /> : <Clock size={11} />}
      {status}
    </span>
  );
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-navy">{displayValue(value)}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#fbfcfd] p-5">
      <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export default function AdminApplications() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedApplication, setSelectedApplication] = useState<AdminApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  const loadApplications = async (query: string, filter: FilterKey) => {
    setIsLoading(true);
    setError("");
    try {
      let status: AdminApplicationStatus | "" = "";
      let verification: VerificationStatus | "" = "";
      if (filter === "Under Review" || filter === "Approved" || filter === "Rejected") {
        status = filter;
      } else if (filter === "Verified" || filter === "Not Verified") {
        verification = filter;
      }
      const response = await listAdminApplications(query, status, verification);
      setApplications(response.applications);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load applications.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadApplications("", "all"); }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedSearch(search.trim());
    void loadApplications(search.trim(), activeFilter);
  };

  const handleFilter = (filter: FilterKey) => {
    setActiveFilter(filter);
    void loadApplications(submittedSearch, filter);
  };

  const selectApplication = async (application: AdminApplication) => {
    setSelectedApplication(application);
    try {
      setSelectedApplication(await getAdminApplicationDetails(application.id));
    } catch {
      setSelectedApplication(application);
    }
  };

  const handleStatusChange = async (value: AdminApplicationStatus) => {
    if (!selectedApplication || isUpdating || value === selectedApplication.status) return;
    setIsUpdating(true);
    setError("");
    try {
      await updateAdminApplicationStatus(selectedApplication.id, value);
      const updated = { ...selectedApplication, status: value };
      setSelectedApplication(updated);
      setApplications((current) => current.map((a) => (a.id === updated.id ? updated : a)));
      toast.success(`Application marked as ${value}`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update application status.");
      toast.error("Unable to update application status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerificationChange = async (value: VerificationStatus) => {
    if (!selectedApplication || isUpdating || value === selectedApplication.verificationStatus) return;
    setIsUpdating(true);
    setError("");
    try {
      await updateAdminApplicationVerification(selectedApplication.id, value);
      const updated = { ...selectedApplication, verificationStatus: value };
      setSelectedApplication(updated);
      setApplications((current) => current.map((a) => (a.id === updated.id ? updated : a)));
      toast.success(`Verification status set to ${value}`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update verification status.");
      toast.error("Unable to update verification status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const d = selectedApplication?.details;

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Onboarding</p>
          <h2 className="mt-2 text-[32px] font-extrabold tracking-[-0.04em] text-navy sm:text-[40px]">Applications</h2>
          <p className="mt-3 max-w-[580px] text-sm leading-6 text-slate-500">Review contributor applications, inspect submitted details, and manage review and verification status.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><ShieldCheck size={16} className="text-orange" /> Protected administrator data</div>
      </div>

      {/* Filters */}
      <div className="mt-7 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => handleFilter(f.key)}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${activeFilter === f.key ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-navy/30 hover:text-navy"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_16px_rgba(20,36,52,0.04)] sm:p-5">
        <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleSearch}>
          <label className="relative">
            <span className="sr-only">Search applications</span>
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by applicant name or email"
              className="h-11 w-full rounded-lg border border-slate-200 bg-[#fbfcfd] pl-10 pr-3 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-orange focus:ring-2 focus:ring-orange/10"
            />
          </label>
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-navy px-5 text-xs font-extrabold text-white transition hover:bg-navy/90">
            <Search size={15} /> Search
          </button>
        </form>
      </div>

      {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</div>}

      {/* Table */}
      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_16px_rgba(20,36,52,0.04)]">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h3 className="text-sm font-extrabold text-navy">Application queue</h3>
            <p className="mt-1 text-xs text-slate-500">
              {isLoading ? "Loading applications..." : `${applications.length} application${applications.length === 1 ? "" : "s"}${submittedSearch ? ` matching "${submittedSearch}"` : ""}`}
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Contributor submissions</span>
        </div>
        {isLoading ? (
          <div className="px-5 py-14 text-center text-sm text-slate-500">Loading submitted applications...</div>
        ) : applications.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <ClipboardList size={23} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-bold text-navy">No applications found</p>
            <p className="mt-1 text-xs text-slate-500">Try changing your search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead className="bg-[#fbfcfd] text-[10px] font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3">Full Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Country</th>
                  <th className="px-6 py-3">Applied</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Verification</th>
                  <th className="px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="transition hover:bg-[#fbfcfd]">
                    <td className="px-6 py-4">
                      <button type="button" onClick={() => void selectApplication(app)} className="flex items-center gap-2 text-left text-sm font-bold text-navy transition hover:text-orange">
                        <UserCircle size={16} className="text-slate-400" />
                        {app.applicantName}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{app.email || "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{app.phone || "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{app.country || "—"}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{formatDate(app.applicationDate)}</td>
                    <td className="px-6 py-4"><StatusBadge status={app.status} /></td>
                    <td className="px-6 py-4"><VerificationBadge status={app.verificationStatus} /></td>
                    <td className="px-6 py-4 text-right">
                      <button type="button" onClick={() => void selectApplication(app)} className="text-xs font-bold text-navy transition hover:text-orange">Open</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedApplication && d && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Application details"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedApplication(null); }}
        >
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-xl bg-white p-6 shadow-2xl sm:rounded-xl sm:p-7">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Submitted application</p>
                <h3 className="mt-2 text-xl font-extrabold text-navy">{selectedApplication.applicantName}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedApplication.status} />
                  <VerificationBadge status={selectedApplication.verificationStatus} />
                </div>
              </div>
              <button type="button" onClick={() => setSelectedApplication(null)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy" aria-label="Close application details">
                <X size={18} />
              </button>
            </div>

            {/* Contact bar */}
            <div className="mt-5 flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-[#fbfcfd] px-4 py-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5"><Mail size={13} className="text-slate-400" /> {displayValue(d.email)}</span>
              <span className="inline-flex items-center gap-1.5"><Phone size={13} className="text-slate-400" /> {displayValue(d.phone)}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" /> {displayValue(d.country)}</span>
            </div>

            {/* Grouped details */}
            <div className="mt-5 space-y-4">
              <DetailSection title="Personal Information">
                <DetailField label="Full name" value={`${displayValue(d.firstName)} ${displayValue(d.lastName)}`} />
                <DetailField label="Email" value={d.email} />
                <DetailField label="Phone" value={d.phone} />
                <DetailField label="Country" value={d.country} />
                <DetailField label="Time zone" value={d.timeZone} />
              </DetailSection>

              <DetailSection title="Contributor Information">
                <DetailField label="Assignment interests" value={d.interests} />
                <DetailField label="Weekly availability" value={d.hours} />
                <DetailField label="Previous experience" value={d.experience} />
                <DetailField label="Motivation" value={d.reason} />
                <DetailField label="Eligibility confirmations" value={d.eligibility} />
              </DetailSection>

              <DetailSection title="Application Information">
                <DetailField label="Application ID" value={selectedApplication.id} />
                <DetailField label="Submission date" value={formatDate(selectedApplication.applicationDate)} />
                <DetailField label="Current status" value={selectedApplication.status} />
                <DetailField label="Verification status" value={selectedApplication.verificationStatus} />
              </DetailSection>
            </div>

            {/* Admin actions */}
            <div className="mt-6 space-y-4">
              {/* Verification actions */}
              <div className="flex flex-col justify-between gap-3 rounded-lg border border-blue-200 bg-blue/[0.04] p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-extrabold text-navy">Verification status</p>
                  <p className="mt-1 text-xs text-slate-500">Mark this applicant as verified or not verified.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isUpdating || selectedApplication.verificationStatus === "Verified"}
                    onClick={() => void handleVerificationChange("Verified")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <BadgeCheck size={14} /> Verify
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating || selectedApplication.verificationStatus === "Not Verified"}
                    onClick={() => void handleVerificationChange("Not Verified")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Clock size={14} /> Unverify
                  </button>
                </div>
              </div>

              {/* Review status actions */}
              <div className="flex flex-col justify-between gap-3 rounded-lg border border-orange/20 bg-orange/[0.05] p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-extrabold text-navy">Application status</p>
                  <p className="mt-1 text-xs text-slate-500">Approve, reject, or return to review.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isUpdating || selectedApplication.status === "Approved"}
                    onClick={() => void handleStatusChange("Approved")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating || selectedApplication.status === "Rejected"}
                    onClick={() => void handleStatusChange("Rejected")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating || selectedApplication.status === "Under Review"}
                    onClick={() => void handleStatusChange("Under Review")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Clock size={14} /> Under Review
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-500">Only submitted application fields are shown. Passwords, tokens, and secret credentials are never exposed.</p>
          </section>
        </div>
      )}
    </>
  );
}
