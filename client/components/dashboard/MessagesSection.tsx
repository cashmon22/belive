import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Headphones,
  LoaderCircle,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import type { VendorConversation } from "@shared/vendor-messages";
import {
  getOrCreateSupportConversation,
  listConversations,
} from "@/lib/vendor-messages";
import { supabase } from "@/lib/supabase";
import { SkeletonConversationList } from "@/components/skeletons";
import ConversationChat from "./ConversationChat";

function formatTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diff < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MessagesSection() {
  const [conversations, setConversations] = useState<VendorConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [supportInitialized, setSupportInitialized] = useState(false);

  const loadConversations = useCallback(async () => {
    setError("");
    try {
      setConversations(await listConversations());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load conversations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize: ensure support conversation exists, then load all conversations
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await getOrCreateSupportConversation();
        if (!isMounted) return;
        setSupportInitialized(true);
        await loadConversations();
      } catch (initError) {
        if (!isMounted) return;
        setError(initError instanceof Error ? initError.message : "Unable to initialize messages.");
        setIsLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [loadConversations]);

  // Realtime: refresh conversation list when conversations or messages change
  useEffect(() => {
    if (!supportInitialized) return;
    const channel = supabase
      .channel("user-messages-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vendor_messages" }, () => {
        void loadConversations();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vendor_conversations" }, () => {
        void loadConversations();
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [loadConversations, supportInitialized]);

  const supportConversations = useMemo(
    () => conversations.filter((c) => c.conversationType === "support"),
    [conversations],
  );
  const vendorConversations = useMemo(
    () => conversations.filter((c) => c.conversationType === "vendor"),
    [conversations],
  );

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  const totalUnread = conversations.reduce((sum, c) => sum + c.userUnreadCount, 0);

  const renderConversationItem = (conv: VendorConversation, icon: "support" | "vendor") => {
    const Icon = icon === "support" ? Headphones : ShieldCheck;
    const subtitle = icon === "support"
      ? "Your support team is available to help."
      : conv.deviceName ?? "Device conversation";

    return (
      <li key={conv.id}>
        <button
          type="button"
          onClick={() => setSelectedId(conv.id)}
          className={`flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-[#fbfcfd] dark:bg-slate-800 ${selectedId === conv.id ? "bg-orange/5" : ""}`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-white">
            <Icon size={16} className="text-orange" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold text-navy dark:text-slate-100">
                {icon === "support" ? "Support" : conv.deviceName ?? "Vendor"}
              </p>
              <span className="shrink-0 text-[10px] font-semibold text-slate-400 dark:text-slate-500">{formatTime(conv.lastMessageAt)}</span>
            </div>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{subtitle}</p>
            {conv.lastMessage && (
              <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">{conv.lastMessage}</p>
            )}
            <div className="mt-1.5 flex items-center gap-2">
              {icon === "vendor" && conv.referenceNumber && (
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{conv.referenceNumber}</span>
              )}
              {icon === "vendor" && conv.requestStatus && (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                  {conv.requestStatus}
                </span>
              )}
              {conv.userUnreadCount > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange px-1.5 text-[10px] font-extrabold text-navy dark:text-slate-100">
                  {conv.userUnreadCount}
                </span>
              )}
            </div>
          </div>
        </button>
      </li>
    );
  };

  return (
    <div>
      {/* Heading */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Contributor workspace</p>
            <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.04em] text-navy dark:text-slate-100 sm:text-[32px]">Messages</h1>
            <p className="mt-2 max-w-[600px] text-sm leading-6 text-slate-500 dark:text-slate-400 dark:text-slate-500">
              View and continue your conversations with Support and your Trusted Vendor.
            </p>
          </div>
          {totalUnread > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/10 px-3 py-1.5 text-xs font-bold text-orange">
              <MessageSquare size={14} /> {totalUnread} unread
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      {/* Inbox layout */}
      <div className="mt-7 grid gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-[0_3px_16px_rgba(20,36,52,0.04)] lg:grid-cols-[360px_1fr]" style={{ height: "calc(100vh - 320px)", minHeight: "500px" }}>
        {/* Conversation list */}
        <div className={`flex flex-col border-r border-slate-200 ${selectedId ? "hidden lg:flex" : "flex"}`}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div role="status" aria-label="Loading conversations"><SkeletonConversationList /></div>
            ) : conversations.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <MessageSquare size={26} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-bold text-navy dark:text-slate-100">No conversations</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Your conversations will appear here.</p>
              </div>
            ) : (
              <div>
                {/* Support section */}
                {supportConversations.length > 0 && (
                  <div>
                    <p className="border-b border-slate-100 dark:border-slate-700 bg-[#fbfcfd] dark:bg-slate-800 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Support</p>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                      {supportConversations.map((c) => renderConversationItem(c, "support"))}
                    </ul>
                  </div>
                )}
                {/* Vendor section */}
                {vendorConversations.length > 0 && (
                  <div>
                    <p className="border-b border-slate-100 dark:border-slate-700 bg-[#fbfcfd] dark:bg-slate-800 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Trusted Vendor</p>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                      {vendorConversations.map((c) => renderConversationItem(c, "vendor"))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className={`flex flex-col ${selectedId ? "flex" : "hidden lg:flex"}`}>
          {selectedConversation ? (
            <ConversationChat
              key={selectedConversation.id}
              conversationId={selectedConversation.id}
              title={selectedConversation.conversationType === "support" ? "Support" : (selectedConversation.deviceName ?? "Trusted Vendor")}
              subtitle={selectedConversation.conversationType === "support" ? "Your support team is available to help." : selectedConversation.deviceModel ?? undefined}
              icon={selectedConversation.conversationType === "support" ? "support" : "vendor"}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <MessageSquare size={32} className="text-slate-300" />
              <p className="mt-4 text-sm font-bold text-navy dark:text-slate-100">Select a conversation</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Choose a conversation from the list to view and send messages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
