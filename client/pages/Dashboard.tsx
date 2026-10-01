import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMyApplication } from "@/lib/my-application";
import { Link, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  CreditCard,
  Headphones,
  HelpCircle,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  MonitorCheck,
  Settings,
  ShieldCheck,
  UserRound,
  Wallet,
  WalletCards,
  X,
  ClipboardList,
  LifeBuoy,
} from "lucide-react";

import AssignmentsSection from "@/components/dashboard/AssignmentsSection";
import MyTasksSection from "@/components/dashboard/MyTasksSection";
import EarningsSection from "@/components/dashboard/EarningsSection";
import ProfileSection from "@/components/dashboard/ProfileSection";
import SupportSection from "@/components/dashboard/SupportSection";
import DeviceNotRecognizedModal from "@/components/dashboard/DeviceNotRecognizedModal";
import ApprovedDeviceInstructions from "@/components/dashboard/ApprovedDeviceInstructions";
import MessagesSection from "@/components/dashboard/MessagesSection";
import VendorChat from "@/components/dashboard/VendorChat";
import NotificationCenter from "@/components/NotificationCenter";
import { SkeletonMetricCard } from "@/components/skeletons";
import { assignments, type Assignment } from "@/lib/assignments";
import { useContributorEarnings } from "@/lib/earnings";
import { useDeviceRequest } from "@/lib/use-device-request";
import { useUnreadMessageCount } from "@/lib/notifications";
import type { PaymentRequest } from "@shared/payment-requests";

const sidebarItems: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Assignments", icon: BriefcaseBusiness },
  { label: "My Tasks", icon: ClipboardList },
  { label: "Earnings", icon: CircleDollarSign },
  { label: "Profile", icon: UserRound },
  { label: "Messages", icon: MessageSquare },
  { label: "Support", icon: LifeBuoy },
];

const contributorId = "CTR-162-717";
const contributorName = "Contributor";
const availableAssignments = assignments.filter((a) => a.status === "Available").length;

function DashboardLogo({ dark = false }: { dark?: boolean }) {
  return (
    <Link to="/" aria-label="Amazon Contributor Program home" className={`inline-flex shrink-0 flex-col leading-none ${dark ? "text-navy" : "text-white"}`}>
      <span className="text-[24px] font-bold tracking-[-1.4px]" style={{ fontFamily: "Arial, sans-serif" }}>
        amazon
      </span>
      <svg className="-mt-1 ml-1 h-[10px] w-[48px]" viewBox="0 0 56 13" fill="none" aria-hidden="true">
        <path d="M4 4.8c11.1 5.2 28.6 6.7 43.1-1.2" stroke="#FF9900" strokeWidth="2.1" strokeLinecap="round" />
        <path d="m42.2 2.7 5.8.1-2.6 4.5" stroke="#FF9900" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

function SidebarContent({ activeItem, onSelect, unreadMessages = 0, unreadLoading = false }: { activeItem: string; onSelect: (label: string) => void; unreadMessages?: number; unreadLoading?: boolean }) {
  return (
    <>
      <div className="border-b border-slate-200 px-5 py-5">
        <DashboardLogo dark />
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Contributor workspace</p>
        <p className="mt-1 text-sm font-extrabold text-navy">Amazon Contributor Program</p>
      </div>
      <nav className="px-3 py-4" aria-label="Dashboard navigation">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
        <div className="space-y-1">
          {sidebarItems.map(({ label, icon: Icon }) => {
            const isActive = activeItem === label;
            return (
              <button
                key={label}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(label)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-xs font-semibold transition ${isActive ? "bg-orange/10 text-orange" : "text-slate-500 hover:bg-slate-50 hover:text-navy"}`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="min-w-0 flex-1">{label}</span>
                {label === "Assignments" && <span title={`${availableAssignments} assignments available`} aria-label={`${availableAssignments} assignments available`} role="img" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange text-[10px] font-extrabold text-navy">{availableAssignments}</span>}
                {label === "Messages" && unreadLoading && <span aria-hidden="true" className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-slate-200" />}
                {label === "Messages" && !unreadLoading && unreadMessages > 0 && <span title={`${unreadMessages} unread messages`} aria-label={`${unreadMessages} unread messages`} role="img" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange text-[10px] font-extrabold text-navy">{unreadMessages}</span>}
                {isActive && <ChevronRight size={14} />}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="mt-auto border-t border-slate-200 p-4">
        <div className="flex items-start gap-3 rounded-lg bg-[#f8f9fa] p-3">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-orange" />
          <div>
            <p className="text-[10px] font-extrabold text-navy">Secure workspace</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">Your account information is protected.</p>
          </div>
        </div>
      </div>
    </>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title, action }: { icon: LucideIcon; eyebrow?: string; title: string; action?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange/10 text-orange">
          <Icon size={17} />
        </span>
        <div>
          {eyebrow && <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>}
          <h2 className="mt-0.5 text-sm font-extrabold text-navy">{title}</h2>
        </div>
      </div>
      {action && <span className="hidden text-[10px] font-bold text-slate-400 sm:block">{action}</span>}
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#fbfcfd] p-4">
      <p className="text-[10px] font-semibold leading-4 text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold tracking-[-0.04em] ${accent ? "text-orange" : "text-navy"}`}>{value}</p>
    </div>
  );
}

function SecurityModal({ onClose, onContactVendor }: { onClose: () => void; onContactVendor: () => void }) {

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/65 p-4 backdrop-blur-sm" role="presentation">
      <div className="relative w-full max-w-[560px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="device-security-title" aria-describedby="device-security-description">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-orange/10 blur-3xl" />
        <div className="relative border-b border-slate-100 bg-[#fbfcfd] p-5 sm:p-6">
          <button type="button" onClick={onClose} aria-label="Close device authorization notice" className="absolute right-4 top-4 rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy"><X size={18} /></button>
          <div className="flex items-start gap-4 pr-8">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-navy text-orange shadow-[0_8px_20px_rgba(19,30,41,0.14)]"><ShieldCheck size={24} /></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange">Security verification</p>
              <h2 id="device-security-title" className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-navy sm:text-2xl">Device Not Recognized</h2>
            </div>
          </div>
        </div>
        <div className="relative p-5 sm:p-7">
          <p id="device-security-description" className="text-sm leading-6 text-slate-600">For security and account protection purposes, your current device has not yet been authorized for contributor access.</p>
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-orange/25 bg-orange/[0.06] p-4"><LockKeyhole size={17} className="mt-0.5 shrink-0 text-orange" /><p className="text-xs leading-5 text-slate-600">To access assignments, earnings, payments, and contributor tools, contact a trusted vendor for an authorized work device.</p></div>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-md border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-navy hover:text-navy">Close</button>
            <button type="button" onClick={onContactVendor} className="inline-flex items-center justify-center gap-2 rounded-md bg-orange px-5 py-3 text-sm font-extrabold text-navy shadow-[0_4px_14px_rgba(255,153,0,0.18)] transition hover:-translate-y-0.5 hover:bg-orange-light"><Mail size={16} /> Contact Trusted Vendor</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceNoticeModal({ onDismiss, onContactVendor }: { onDismiss: () => void; onContactVendor: () => void }) {
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-navy/65 p-4 backdrop-blur-sm" role="presentation">
      <div className="relative w-full max-w-[560px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="device-notice-title" aria-describedby="device-notice-description">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-orange/10 blur-3xl" />
        <div className="relative border-b border-slate-100 bg-[#fbfcfd] p-5 sm:p-6">
          <div className="flex items-start gap-4 pr-8">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-navy text-orange shadow-[0_8px_20px_rgba(19,30,41,0.14)]"><MonitorCheck size={24} /></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange">Device authorization</p>
              <h2 id="device-notice-title" className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-navy sm:text-2xl">You're not using an authorized Amazon work device</h2>
            </div>
          </div>
        </div>
        <div className="relative p-5 sm:p-7">
          <p id="device-notice-description" className="text-sm leading-6 text-slate-600">Your account has been approved, but you are not currently using an authorized work device.</p>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onDismiss} className="inline-flex items-center justify-center rounded-md border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-navy hover:text-navy">OK</button>
            <button type="button" onClick={onContactVendor} className="inline-flex items-center justify-center gap-2 rounded-md bg-orange px-5 py-3 text-sm font-extrabold text-navy shadow-[0_4px_14px_rgba(255,153,0,0.18)] transition hover:bg-orange-light"><Mail size={16} /> Contact Trusted Vendor</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustedVendorModal({ onClose }: { onClose: () => void }) {

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-navy/65 p-4 backdrop-blur-sm" role="presentation">
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="trusted-vendor-title" aria-describedby="trusted-vendor-description">
        <div className="relative border-b border-slate-100 bg-[#fbfcfd] p-5 sm:p-6">
          <button type="button" onClick={onClose} aria-label="Close trusted vendor information" className="absolute right-4 top-4 rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy"><X size={18} /></button>
          <div className="flex items-center gap-3 pr-8"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy text-orange"><ShieldCheck size={22} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange">Trusted vendor support</p><h2 id="trusted-vendor-title" className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-navy sm:text-2xl">Get an Authorized Work Device</h2></div></div>
        </div>
        <div className="p-5 sm:p-7">
          <p id="trusted-vendor-description" className="text-sm leading-6 text-slate-600">Contact a trusted vendor to obtain an authorized work device before participating in assignments.</p>
          <Link to="/trusted-vendor" onClick={onClose} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange px-5 py-3 text-sm font-extrabold text-navy shadow-[0_4px_14px_rgba(255,153,0,0.18)] transition hover:bg-orange-light"><Mail size={16} /> Contact Trusted Vendor</Link>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [trustedVendorOpen, setTrustedVendorOpen] = useState(false);
  const [deviceNotRecognizedOpen, setDeviceNotRecognizedOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [chatRequest, setChatRequest] = useState<{ request: PaymentRequest; deviceName: string } | null>(null);
  const [today, setToday] = useState(() => new Date());
  const { availableBalance, pendingEarnings, totalWithdrawn, paymentGatewayConfigured, isLoading: earningsLoading } = useContributorEarnings(session);
  const { request: deviceRequest, isLoading: deviceRequestLoading } = useDeviceRequest();
  const { count: unreadMessages, isLoading: unreadLoading } = useUnreadMessageCount("user");
  const { data: myApplication, isLoading: applicationLoading, isError: applicationError } = useMyApplication(session);
  // Accounts are issued after review, so an account without a linked application is treated as approved.
  const applicationStatus = applicationLoading ? "Loading…" : applicationError ? "Unavailable" : myApplication?.status ?? "Approved";
  const applicationTone = applicationStatus === "Approved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : applicationStatus === "Rejected" ? "border-red-200 bg-red-50 text-red-700" : applicationStatus === "Under Review" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-600";
  const applicationDot = applicationStatus === "Approved" ? "bg-emerald-500" : applicationStatus === "Rejected" ? "bg-red-500" : applicationStatus === "Under Review" ? "bg-amber-500" : "bg-slate-400";
  const currentDate = useMemo(
    () => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(today),
    [today],
  );
  const memberSince = useMemo(
    () => session?.user.created_at ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(session.user.created_at)) : "—",
    [session?.user.created_at],
  );

  useEffect(() => {
    let timeoutId: number;
    const scheduleNextDate = () => {
      const now = new Date();
      const nextDate = new Date(now);
      nextDate.setHours(24, 0, 0, 0);
      timeoutId = window.setTimeout(() => {
        setToday(new Date());
        scheduleNextDate();
      }, nextDate.getTime() - now.getTime());
    };

    scheduleNextDate();
    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const selectNavItem = (label: string) => {
    setMobileNavOpen(false);
    setActiveItem(label);
  };

  useEffect(() => {
    if (!deviceNotRecognizedOpen && !trustedVendorOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDeviceNotRecognizedOpen(false);
      setTrustedVendorOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deviceNotRecognizedOpen, trustedVendorOpen]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f9fa] text-ink">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-navy text-white shadow-[0_4px_24px_rgba(9,22,35,0.18)]">
        <div className="flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Open dashboard navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md p-2 text-white/80 transition hover:bg-white/10 hover:text-white lg:hidden"
            >
              <Menu size={22} />
            </button>
            <DashboardLogo />
            <span className="hidden h-6 border-l border-white/20 sm:block" />
            <span className="hidden text-xs font-semibold text-white/60 sm:block">Amazon Contributor Portal</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <NotificationCenter variant="user" />
            <div className="hidden h-7 border-l border-white/15 sm:block" />
            <button
              type="button"
              onClick={() => selectNavItem("Earnings")}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-left transition hover:bg-white/10"
              aria-label={earningsLoading ? "Wallet balance loading" : `Wallet balance: $${availableBalance.toFixed(2)}`}
            >
              <Wallet size={16} className="shrink-0 text-orange" />
              <div className="leading-tight">
                {earningsLoading ? (
                  <span className="block h-4 w-16 animate-pulse rounded bg-white/20" aria-hidden="true" />
                ) : (
                  <p className="text-xs font-extrabold text-white">${availableBalance.toFixed(2)}</p>
                )}
                <p className="text-[9px] text-white/50">
                  {paymentGatewayConfigured ? "Payment configured" : "Setup payment gateway"}
                </p>
              </div>
            </button>
            <div className="hidden h-7 border-l border-white/15 sm:block" />
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange text-xs font-extrabold text-navy">CN</span>
              <div className="hidden leading-tight sm:block">
                <p className="text-xs font-bold text-white">Contributor</p>
                <p className="mt-1 text-[10px] text-white/50">Standard level</p>
              </div>
            </div>
            <div className="hidden h-7 border-l border-white/15 sm:block" />
            <button type="button" onClick={handleLogout} disabled={isSigningOut} aria-busy={isSigningOut} className="flex items-center gap-2 rounded-md p-2 text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60" aria-label="Log out">
              <LogOut size={17} />
              <span className="hidden text-xs font-semibold sm:inline">{isSigningOut ? "Signing out..." : "Log out"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-72px)]">
        <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[250px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <SidebarContent activeItem={activeItem} onSelect={selectNavItem} unreadMessages={unreadMessages} unreadLoading={unreadLoading} />
        </aside>

        {mobileNavOpen && (
          <button type="button" aria-label="Close dashboard navigation" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-40 bg-navy/50 lg:hidden" />
        )}
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-white shadow-2xl transition-transform duration-200 lg:hidden ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-[72px] items-center justify-between border-b border-slate-200 px-5">
            <DashboardLogo dark />
            <button type="button" aria-label="Close dashboard navigation" onClick={() => setMobileNavOpen(false)} className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy">
              <X size={20} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <SidebarContent activeItem={activeItem} onSelect={selectNavItem} unreadMessages={unreadMessages} unreadLoading={unreadLoading} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9 lg:px-10 lg:py-10">
            {deviceRequestLoading ? (
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5" role="status" aria-live="polite">
                <span className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <span className="block h-4 w-40 animate-pulse rounded bg-slate-200" />
                  <span className="block h-3 w-72 max-w-full animate-pulse rounded bg-slate-100" />
                </div>
                <span className="h-7 w-24 shrink-0 animate-pulse rounded-md bg-slate-200" />
              </div>
            ) : deviceRequest?.status === "Approved" ? (
              <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" role="status">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white"><CheckCircle2 size={19} /></span>
                  <div>
                    <h2 className="text-sm font-extrabold text-navy">{deviceRequest.deviceName}</h2>
                    <p className="mt-1 max-w-[760px] text-xs leading-5 text-emerald-700">Your device request has been approved.</p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white"><CheckCircle2 size={14} /> Approved</span>
              </div>
            ) : deviceRequest?.status === "Under Review" ? (
              <div className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" role="status">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white"><Clock3 size={19} /></span>
                  <div>
                    <h2 className="text-sm font-extrabold text-navy">{deviceRequest.deviceName}</h2>
                    <p className="mt-1 max-w-[760px] text-xs leading-5 text-amber-700">Your device request is under review. You'll be notified once a decision is made.</p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-xs font-extrabold text-white"><Clock3 size={14} /> Under Review</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4 rounded-xl border border-orange/30 bg-orange/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" role="status">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange text-navy"><ShieldCheck size={19} /></span>
                  <div><h2 className="text-sm font-extrabold text-navy">Device Not Recognized</h2><p className="mt-1 max-w-[760px] text-xs leading-5 text-slate-600">Your account has been approved, but your device has not yet been recognized. You can browse assignments and navigate freely — device verification is only required to start tasks.</p></div>
                </div>
                <button type="button" onClick={() => setTrustedVendorOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-navy px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[#1d3042]"><LockKeyhole size={15} className="text-orange" /> Contact Trusted Vendor</button>
              </div>
            )}
            {activeItem === "Dashboard" && (
            <>
            <div className="mt-7 flex flex-col justify-between gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Amazon Contributor Dashboard</p>
                <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.04em] text-navy sm:text-[38px]">Welcome back, Contributor</h1>
                <p className="mt-2 max-w-[600px] text-sm leading-6 text-slate-500">{applicationStatus === "Under Review" ? "Your application is under review." : applicationStatus === "Rejected" ? "Your application was not approved." : "Your account is approved."} Complete the setup steps below to prepare for future contributor opportunities.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
                  <span className="text-slate-400">Contributor ID:</span>
                  <span className="ml-2 font-bold text-navy">{contributorId}</span>
                </div>
                <div className={`flex items-center gap-2 rounded-md border px-3 py-2.5 font-bold ${applicationTone}`}>
                  <span className={`h-2 w-2 rounded-full ${applicationDot}`} /> {applicationStatus}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-2"><UserRound size={14} className="text-orange" /> Standard Contributor</span>
              <span className="hidden h-4 border-l border-slate-300 sm:block" />
              <span>Current date: <strong className="font-bold text-navy">{currentDate}</strong></span>
              <span className="hidden h-4 border-l border-slate-300 sm:block" />
              <span>Member since: <strong className="font-bold text-navy">{memberSince}</strong></span>
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
                    <SectionHeading icon={ShieldCheck} eyebrow="Account overview" title="Account Status" action="Profile verified" />
                    <div className="mt-5 flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={22} /></span>
                      <div>
                        <p className="text-lg font-extrabold text-navy">{applicationStatus}</p>
                        <p className="mt-1 text-xs text-slate-500">Your contributor profile is active.</p>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
                      <div><p className="text-[10px] font-semibold text-slate-400">Contributor ID</p><p className="mt-1 text-xs font-bold text-navy">{contributorId}</p></div>
                      <div><p className="text-[10px] font-semibold text-slate-400">Contributor level</p><p className="mt-1 text-xs font-bold text-navy">Standard Contributor</p></div>
                      <div><p className="text-[10px] font-semibold text-slate-400">Member since</p><p className="mt-1 text-xs font-bold text-navy">{memberSince}</p></div>
                    </div>
                  </section>

                  <section className={`rounded-xl border p-5 shadow-card sm:p-6 ${deviceRequestLoading ? "border-slate-200 bg-white" : deviceRequest?.status === "Approved" ? "border-emerald-200 bg-emerald/[0.03]" : deviceRequest?.status === "Rejected" ? "border-red-200 bg-red/[0.03]" : deviceRequest?.status === "Under Review" ? "border-amber-200 bg-amber/[0.03]" : "border-orange/30 bg-orange/[0.045]"}`}>
                    <SectionHeading icon={MonitorCheck} eyebrow="Required setup" title="Device Authorization" action={deviceRequestLoading ? "Loading…" : deviceRequest?.status === "Approved" ? "Approved" : deviceRequest?.status === "Rejected" ? "Rejected" : deviceRequest?.status === "Under Review" ? "Under Review" : "Action needed"} />
                    {deviceRequestLoading ? (
                      <div className="mt-5 space-y-3" role="status" aria-live="polite">
                        <div className="flex items-center gap-3">
                          <span className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-slate-200" />
                          <div className="space-y-2">
                            <span className="block h-4 w-32 animate-pulse rounded bg-slate-200" />
                            <span className="block h-3 w-24 animate-pulse rounded bg-slate-100" />
                          </div>
                        </div>
                        <span className="block h-10 w-full animate-pulse rounded-md bg-slate-100" />
                      </div>
                    ) : deviceRequest?.status === "Approved" ? (
                      <ApprovedDeviceInstructions deviceName={deviceRequest.deviceName} onMessageVendor={() => setChatRequest({ request: deviceRequest, deviceName: deviceRequest.deviceName })} />
                    ) : deviceRequest?.status === "Rejected" ? (
                      <>
                        <div className="mt-5 flex items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white"><X size={21} /></span>
                          <div>
                            <p className="text-sm font-extrabold text-navy">{deviceRequest.deviceName}</p>
                            <span className="mt-2 inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-extrabold text-red-700">Rejected</span>
                            {deviceRequest.rejectionReason && <p className="mt-2 text-xs leading-5 text-red-600">{deviceRequest.rejectionReason}</p>}
                          </div>
                        </div>
                        <Link to="/trusted-vendor" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange px-4 py-3 text-xs font-extrabold text-navy shadow-[0_4px_14px_rgba(255,153,0,0.15)] transition hover:-translate-y-0.5 hover:bg-orange-light">
                          Submit New Request <ArrowRight size={15} />
                        </Link>
                      </>
                    ) : deviceRequest?.status === "Under Review" ? (
                      <>
                        <div className="mt-5 flex items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white"><Clock3 size={21} /></span>
                          <div>
                            <p className="text-sm font-extrabold text-navy">{deviceRequest.deviceName}</p>
                            <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-700">Under Review</span>
                            <p className="mt-2 text-xs leading-5 text-slate-500">Your device request is being reviewed. You'll be notified once a decision is made.</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setTrustedVendorOpen(true)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange px-4 py-3 text-xs font-extrabold text-navy shadow-[0_4px_14px_rgba(255,153,0,0.15)] transition hover:-translate-y-0.5 hover:bg-orange-light">
                          Contact Trusted Vendor <ArrowRight size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="mt-5 flex items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange text-navy"><LockKeyhole size={21} /></span>
                          <div>
                            <p className="text-sm font-extrabold text-navy">Device Not Recognized</p>
                            <span className="mt-2 inline-flex rounded-full border border-orange/30 bg-orange/10 px-2.5 py-1 text-[10px] font-extrabold text-orange">Not Recognized</span>
                            <p className="mt-2 text-xs leading-5 text-slate-500">Authorize your trusted device before participating in assignments.</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setTrustedVendorOpen(true)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange px-4 py-3 text-xs font-extrabold text-navy shadow-[0_4px_14px_rgba(255,153,0,0.15)] transition hover:-translate-y-0.5 hover:bg-orange-light disabled:cursor-not-allowed disabled:opacity-70">
                          <>Contact Trusted Vendor <ArrowRight size={15} /></>
                        </button>
                      </>
                    )}
                  </section>
                </div>

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
                  <SectionHeading icon={BriefcaseBusiness} eyebrow="Work overview" title="Assignments Overview" action="No activity yet" />
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <button type="button" onClick={() => selectNavItem("Assignments")} className="text-left transition hover:scale-[1.02]">
                      <Metric label="Available assignments" value={String(availableAssignments)} accent />
                    </button>
                    <Metric label="Pending assignments" value="0" />
                    <Metric label="Completed assignments" value="0" />
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded-md bg-[#f8f9fa] px-3 py-2.5 text-[11px] text-slate-500"><ClipboardCheck size={14} className="text-orange" /> Assignments will appear here after setup is complete.</div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
                  <SectionHeading icon={WalletCards} eyebrow="Financial overview" title="Earnings Overview" action="No earnings yet" />
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <Metric label="Available balance" value={`$${availableBalance.toFixed(2)}`} accent />
                    <Metric label="Pending earnings" value={`$${pendingEarnings.toFixed(2)}`} />
                    <Metric label="Total withdrawn" value={`$${totalWithdrawn.toFixed(2)}`} />
                  </div>
                  <p className="mt-4 text-[11px] leading-5 text-slate-500">Earnings and balance information will update when eligible assignments are completed.</p>
                </section>
              </div>

              <div className="space-y-5">
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
                  <SectionHeading icon={CreditCard} eyebrow="Account finance" title="Payments Overview" />
                  <div className="mt-6 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><CreditCard size={21} /></span>
                    <p className="mt-4 text-sm font-extrabold text-navy">No payments available yet</p>
                    <p className="mx-auto mt-2 max-w-[250px] text-xs leading-5 text-slate-500">Payment details will be available after you earn from eligible assignments.</p>
                    <button type="button" onClick={() => selectNavItem("Earnings")} className="mt-5 inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-xs font-bold text-navy transition hover:border-orange hover:text-orange">View Payment Information <ArrowRight size={14} /></button>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-navy p-5 text-white shadow-card sm:p-6" aria-labelledby="notifications-title">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-orange text-navy"><Bell size={17} /></span><div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-orange">Notifications</p><h2 id="notifications-title" className="mt-0.5 text-sm font-extrabold">Welcome to the Contributor Program</h2></div></div>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-start gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange" /><p className="text-xs leading-5 text-white/70">Your account is active and ready for setup.</p></div>
                    <div className="flex items-start gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange" /><p className="text-xs leading-5 text-white/70">Complete device authorization before participating in assignments.</p></div>
                  </div>
                  <button type="button" onClick={() => selectNavItem("Support")} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-orange transition hover:text-orange-light">Need assistance? Visit Support <ArrowRight size={14} /></button>
                </section>
              </div>
            </div>
            </>
            )}
            {activeItem === "Assignments" && (
              <AssignmentsSection
                deviceVerified={deviceRequest?.status === "Approved"}
                onStartTask={(a) => { setSelectedAssignment(a); setDeviceNotRecognizedOpen(true); }}
              />
            )}
            {activeItem === "My Tasks" && <MyTasksSection />}
            {activeItem === "Earnings" && <EarningsSection contributorId={contributorId} session={session} deviceVerified={deviceRequest?.status === "Approved"} onContactVendor={() => setTrustedVendorOpen(true)} />}
            {activeItem === "Profile" && <ProfileSection session={session} contributorId={contributorId} />}
            {activeItem === "Messages" && <MessagesSection />}
            {activeItem === "Support" && <SupportSection />}

            <div className="mt-8 flex flex-col justify-between gap-3 border-t border-slate-200 pt-5 text-[10px] text-slate-400 sm:flex-row sm:items-center">
              <p>Amazon Contributor Portal · Secure access for approved contributors</p>
              <div className="flex items-center gap-4"><Link to="/contact" className="transition hover:text-navy">Privacy</Link><Link to="/contact" className="transition hover:text-navy">Terms</Link><span className="flex items-center gap-1"><Headphones size={12} /> Support</span></div>
            </div>
          </div>
        </main>
      </div>
      {deviceNotRecognizedOpen && <DeviceNotRecognizedModal onClose={() => setDeviceNotRecognizedOpen(false)} onVerifyDevice={() => { setDeviceNotRecognizedOpen(false); navigate("/trusted-vendor"); }} />}
      {trustedVendorOpen && <TrustedVendorModal onClose={() => setTrustedVendorOpen(false)} />}
      {chatRequest && (
        <VendorChat
          paymentRequest={chatRequest.request}
          deviceName={chatRequest.deviceName}
          onClose={() => setChatRequest(null)}
        />
      )}
    </div>
  );
}
