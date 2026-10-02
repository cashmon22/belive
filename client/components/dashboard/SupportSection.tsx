import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronDown,
  Headphones,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageSquare,
  MonitorCheck,
} from "lucide-react";
import type { VendorConversation } from "@shared/vendor-messages";
import { listConversations } from "@/lib/vendor-messages";

const supportItems = [
  {
    icon: HelpCircle,
    title: "Help Center",
    description: "Browse contributor guidance and answers to common questions.",
    link: "/faq",
    linkText: "Visit FAQ",
  },
  {
    icon: Mail,
    title: "Contact Support",
    description: "Reach the support team about your account or program questions.",
    link: "/contact",
    linkText: "Contact us",
  },
  {
    icon: MonitorCheck,
    title: "Device assistance",
    description: "Get help with an authorized work device or a device request.",
    link: "/trusted-vendor",
    linkText: "View device options",
  },
];

const helpItems = [
  ["Where can I check my application status?", "Your application status appears on the contributor dashboard. If you need help with a review, contact Support from your Messages inbox."],
  ["How do I resolve a device request issue?", "Review your device request status in the dashboard, then contact Support or your trusted vendor for help with authorization."],
  ["Where can I track tasks and earnings?", "Use My Tasks to review assignments you have started and Earnings to view your balance and payment activity."],
];

function formatDate(value: string | null) {
  if (!value) return "No messages yet";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SupportSection({ onOpenMessages }: { onOpenMessages?: () => void }) {
  const [conversations, setConversations] = useState<VendorConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [openHelp, setOpenHelp] = useState<number | null>(0);

  const loadConversations = async () => {
    setError("");
    try {
      const all = await listConversations();
      setConversations(all.filter((conversation) => conversation.conversationType === "support"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your support conversations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  const openInbox = () => {
    toast.success("Opening your Messages inbox.");
    onOpenMessages?.();
  };

  return (
    <div>
      <div className="border-b border-slate-200 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Contributor workspace</p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.04em] text-navy dark:text-slate-100 sm:text-[32px]">Support</h1>
        <p className="mt-2 max-w-[600px] text-sm leading-6 text-slate-500 dark:text-slate-400 dark:text-slate-500">Find quick answers, contact the right team, or continue an existing support conversation.</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {supportItems.map((item) => (
          <div key={item.title} className="flex flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-5 shadow-card transition hover:border-orange/40">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange/10 text-orange"><item.icon size={22} /></span>
            <h2 className="mt-4 text-sm font-extrabold text-navy dark:text-slate-100">{item.title}</h2>
            <p className="mt-2 flex-1 text-xs leading-5 text-slate-500 dark:text-slate-400 dark:text-slate-500">{item.description}</p>
            <Link to={item.link} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-orange transition hover:text-orange-light">{item.linkText} <ArrowRight size={14} /></Link>
          </div>
        ))}
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-card" aria-labelledby="support-conversations-heading">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange/10 text-orange"><MessageSquare size={19} /></span><div><h2 id="support-conversations-heading" className="text-sm font-extrabold text-navy dark:text-slate-100">Your support conversations</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Private conversations with the contributor support team.</p></div></div>
          <button type="button" onClick={openInbox} className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-xs font-extrabold text-navy dark:text-slate-100 transition hover:bg-orange-light"><MessageSquare size={14} /> Open Messages</button>
        </div>
        {error ? <div className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-red-700" role="alert">{error}</p><button type="button" onClick={() => { setIsLoading(true); void loadConversations(); }} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-navy dark:text-slate-100 hover:border-orange">Try again</button></div> : isLoading ? <div className="p-5 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500" role="status">Loading your support conversations…</div> : conversations.length === 0 ? <div className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">No support conversation yet. Start one from Messages and the team will reply there.</p><button type="button" onClick={openInbox} className="text-xs font-bold text-orange hover:text-orange-light">Start a conversation <ArrowRight size={13} className="ml-1 inline" /></button></div> : <ul className="divide-y divide-slate-100 dark:divide-slate-700">{conversations.map((conversation) => <li key={conversation.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-orange"><Headphones size={16} /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-navy dark:text-slate-100">Support team <span className="font-normal text-slate-400 dark:text-slate-500">· {formatDate(conversation.lastMessageAt)}</span></p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{conversation.lastMessage ?? "Your support conversation is ready."}</p></div>{conversation.userUnreadCount > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange px-1.5 text-[10px] font-extrabold text-navy dark:text-slate-100">{conversation.userUnreadCount}</span>}<button type="button" onClick={openInbox} className="shrink-0 rounded-md px-2 py-1 text-xs font-bold text-orange hover:bg-orange/10">View</button></li>)}</ul>}
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-5 shadow-card sm:p-6" aria-labelledby="support-help-heading">
        <div className="mb-3 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-orange/10 text-orange"><LifeBuoy size={17} /></span><div><h2 id="support-help-heading" className="text-sm font-extrabold text-navy dark:text-slate-100">Quick help</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Answers for common contributor questions.</p></div></div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">{helpItems.map(([question, answer], index) => <div key={question}><button type="button" aria-expanded={openHelp === index} onClick={() => setOpenHelp(openHelp === index ? null : index)} className="flex w-full items-center justify-between gap-4 py-4 text-left text-xs font-bold text-navy dark:text-slate-100">{question}<ChevronDown size={16} className={`shrink-0 text-slate-400 dark:text-slate-500 transition ${openHelp === index ? "rotate-180 text-orange" : ""}`} /></button>{openHelp === index && <p className="pb-4 pr-8 text-xs leading-5 text-slate-500 dark:text-slate-400 dark:text-slate-500">{answer} <Link to="/faq" className="font-bold text-orange hover:text-orange-light">More help</Link></p>}</div>)}</div>
      </section>

      <div className="mt-6 rounded-xl border border-navy bg-navy p-5 text-white shadow-card sm:p-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-orange text-navy dark:text-slate-100"><Headphones size={17} /></span><h2 className="text-sm font-extrabold">Need personal help?</h2></div>
        <p className="mt-4 text-xs leading-5 text-white/70">Contact support for account issues, device authorization, or assignment questions. Replies to in-app conversations appear in your Messages inbox.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row"><Link to="/contact" className="inline-flex items-center justify-center gap-2 rounded-md bg-orange px-4 py-3 text-xs font-extrabold text-navy dark:text-slate-100 transition hover:bg-orange-light"><Mail size={15} /> Contact Support Team</Link><button type="button" onClick={openInbox} className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 px-4 py-3 text-xs font-bold text-white transition hover:bg-white/10"><MessageSquare size={15} /> Message Support</button></div>
      </div>
    </div>
  );
}
