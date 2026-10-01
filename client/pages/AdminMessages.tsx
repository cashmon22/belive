import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCheck,
  Clock,
  Headphones,
  LoaderCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import type { VendorConversation, VendorMessage } from "@shared/vendor-messages";
import {
  adminCreateSupportConversation,
  getConversation,
  listConversations,
  listAllUsers,
  markConversationRead,
  sendMessage,
} from "@/lib/vendor-messages";
import { supabase } from "@/lib/supabase";

type TypeFilter = "all" | "support" | "vendor";

const statusFilters = ["All", "Under Review", "Approved", "Rejected", "Completed"] as const;
type StatusFilter = (typeof statusFilters)[number];

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

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function RequestStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "Under Review": "bg-amber-50 text-amber-700 border-amber-200",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Rejected: "bg-red-50 text-red-700 border-red-200",
    Completed: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${styles[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  );
}

function ConversationIcon({ type }: { type: string }) {
  return type === "support" ? <Headphones size={14} className="text-orange" /> : <ShieldCheck size={14} className="text-orange" />;
}

export default function AdminMessages() {
  const [conversations, setConversations] = useState<VendorConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<VendorMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<VendorConversation | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("All");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [newSupportOpen, setNewSupportOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const previousSelectedIdRef = useRef<string | null>(null);
  const draftRef = useRef("");
  const chatLoadIdRef = useRef(0);

  const loadConversations = useCallback(async () => {
    setIsLoadingList(true);
    setError("");
    try {
      setConversations(await listConversations());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load conversations.");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => { void loadConversations(); }, [loadConversations]);

  // Realtime: listen for new messages on all conversations
  useEffect(() => {
    const channel = supabase
      .channel("admin-conversations")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vendor_messages" }, (payload) => {
        const newMessage = payload.new as { conversation_id: string; sender_role: string };
        if (newMessage.sender_role === "user") {
          void loadConversations();
          if (selectedIdRef.current === newMessage.conversation_id) {
            void loadChat(newMessage.conversation_id);
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vendor_messages" }, (payload) => {
        const updatedMessage = payload.new as { conversation_id: string };
        if (selectedIdRef.current === updatedMessage.conversation_id) {
          void loadChat(updatedMessage.conversation_id);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vendor_conversations" }, () => {
        void loadConversations();
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [loadConversations, selectedId]);

  const loadChat = useCallback(async (id: string) => {
    const loadId = ++chatLoadIdRef.current;
    setIsLoadingChat(true);
    try {
      const data = await getConversation(id);
      if (selectedIdRef.current !== id || chatLoadIdRef.current !== loadId) return;
      setSelectedConversation(data);
      setMessages((current) => {
        const byId = new Map(current.map((message) => [message.id, message]));
        for (const message of data.messages) byId.set(message.id, message);
        return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });
      await markConversationRead(id);
      if (selectedIdRef.current === id) void loadConversations();
    } catch (loadError) {
      if (selectedIdRef.current === id && chatLoadIdRef.current === loadId) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load conversation.");
      }
    } finally {
      if (chatLoadIdRef.current === loadId) setIsLoadingChat(false);
    }
  }, [loadConversations]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    chatLoadIdRef.current++;
    if (previousSelectedIdRef.current !== selectedId) {
      setDraft("");
      draftRef.current = "";
      setMessages([]);
      setSelectedConversation(null);
      previousSelectedIdRef.current = selectedId;
    }
    if (selectedId) void loadChat(selectedId);
    else {
      setSelectedConversation(null);
      setMessages([]);
      setDraft("");
      draftRef.current = "";
    }
  }, [selectedId, loadChat]);

  const activeConversation = selectedConversation?.id === selectedId
    ? selectedConversation
    : conversations.find((conversation) => conversation.id === selectedId) ?? null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = useMemo(() => {
    const query = submittedSearch.trim().toLowerCase();
    return conversations.filter((c) => {
      const matchesType = typeFilter === "all" || c.conversationType === typeFilter;
      const matchesSearch = !query ||
        c.userName.toLowerCase().includes(query) ||
        c.userEmail.toLowerCase().includes(query) ||
        (c.deviceName?.toLowerCase().includes(query) ?? false) ||
        (c.referenceNumber?.toLowerCase().includes(query) ?? false);
      const matchesFilter = activeFilter === "All" || c.requestStatus === activeFilter;
      return matchesType && matchesSearch && matchesFilter;
    });
  }, [conversations, submittedSearch, typeFilter, activeFilter]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittedSearch(search.trim());
  };

  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const conversationId = selectedId;
    const body = draft.trim();
    if (!conversationId || !body) return;
    setIsSending(true);
    try {
      const msg = await sendMessage(conversationId, body);
      if (selectedIdRef.current === conversationId) {
        setMessages((current) => current.some((message) => message.id === msg.id) ? current : [...current, msg]);
        if (draftRef.current === body) {
          setDraft("");
          draftRef.current = "";
        }
      }
      void loadConversations();
    } catch (sendError) {
      if (selectedIdRef.current === conversationId) {
        setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
      }
    } finally {
      setIsSending(false);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.adminUnreadCount, 0);
  const showStatusFilters = typeFilter === "all" || typeFilter === "vendor";

  return (
    <section aria-labelledby="messages-heading">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Communications</p>
          <h2 id="messages-heading" className="mt-2 text-[32px] font-extrabold tracking-[-0.04em] text-navy sm:text-[40px]">Messages</h2>
          <p className="mt-3 max-w-[580px] text-sm leading-6 text-slate-500">Communicate with contributors about their device requests and provide support. All conversations are tied to a specific user.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          {totalUnread > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/10 px-3 py-1.5 text-orange"><MessageSquare size={14} /> {totalUnread} unread</span>}
          <ShieldCheck size={16} className="text-orange" /> Admin inbox
        </div>
      </div>

      {error && (
        <div className="mt-5 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <div className="flex items-start gap-2"><span>{error}</span></div>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error" className="rounded p-1 text-red-500 hover:bg-red-100"><X size={15} /></button>
        </div>
      )}

      {/* Main inbox layout */}
      <div className="mt-7 grid gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_16px_rgba(20,36,52,0.04)] lg:grid-cols-[360px_1fr]" style={{ height: "calc(100vh - 320px)", minHeight: "500px" }}>
        {/* Conversation list */}
        <div className={`flex flex-col border-r border-slate-200 ${selectedId ? "hidden lg:flex" : "flex"}`}>
          {/* Type tabs + search */}
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center gap-1.5">
              {(["all", "support", "vendor"] as TypeFilter[]).map((tab) => (
                <button key={tab} type="button" onClick={() => { setTypeFilter(tab); setActiveFilter("All"); }}
                  className={`rounded-md px-3 py-1.5 text-[10px] font-bold capitalize transition ${typeFilter === tab ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-500 hover:border-navy/30 hover:text-navy"}`}>
                  {tab === "all" ? "All" : tab === "support" ? "Support" : "Vendor"}
                </button>
              ))}
              {typeFilter === "support" && (
                <button type="button" onClick={() => setNewSupportOpen(true)}
                  className="ml-auto inline-flex items-center gap-1 rounded-md bg-orange px-2.5 py-1.5 text-[10px] font-extrabold text-navy transition hover:bg-orange-light">
                  <Plus size={12} /> New
                </button>
              )}
            </div>

            <form className="relative mt-3" onSubmit={handleSearch}>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-[#fbfcfd] pl-9 pr-3 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-orange focus:ring-2 focus:ring-orange/10" />
            </form>

            {showStatusFilters && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {statusFilters.map((filter) => (
                  <button key={filter} type="button" onClick={() => setActiveFilter(filter)}
                    className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${activeFilter === filter ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-500 hover:border-navy/30 hover:text-navy"}`}>
                    {filter}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoadingList ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-500" role="status">
                <LoaderCircle size={16} className="animate-spin text-orange" /> Loading...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <MessageSquare size={26} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-bold text-navy">No conversations</p>
                <p className="mt-1 text-xs text-slate-500">Messages from contributors will appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredConversations.map((conv) => (
                  <li key={conv.id}>
                    <button type="button" onClick={() => { selectedIdRef.current = conv.id; setIsLoadingChat(true); setSelectedId(conv.id); }}
                      className={`flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-[#fbfcfd] ${selectedId === conv.id ? "bg-orange/5" : ""}`}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-white">
                        <ConversationIcon type={conv.conversationType} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold text-navy">
                            {conv.conversationType === "support" ? "Support" : conv.deviceName ?? "Vendor"}
                          </p>
                          <span className="shrink-0 text-[10px] font-semibold text-slate-400">{formatTime(conv.lastMessageAt)}</span>
                        </div>
                        <p className="truncate text-xs text-slate-500">{conv.userName}</p>
                        <p className="mt-1 truncate text-xs text-slate-400">{conv.lastMessage ?? "No messages yet"}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          {conv.conversationType === "vendor" && conv.requestStatus && <RequestStatusBadge status={conv.requestStatus} />}
                          {conv.conversationType === "vendor" && conv.referenceNumber && (
                            <span className="text-[10px] font-semibold text-slate-400">{conv.referenceNumber}</span>
                          )}
                          {conv.conversationType === "support" && (
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600">Support</span>
                          )}
                          {conv.adminUnreadCount > 0 && (
                            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange px-1.5 text-[10px] font-extrabold text-navy">{conv.adminUnreadCount}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className={`flex flex-col ${selectedId ? "flex" : "hidden lg:flex"}`}>
          {activeConversation ? (
            <>
              {/* Chat header */}
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button type="button" onClick={() => { selectedIdRef.current = null; setSelectedId(null); }} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy lg:hidden" aria-label="Back to conversations">
                      <ArrowLeft size={18} />
                    </button>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-white">
                      <ConversationIcon type={activeConversation.conversationType} />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-navy">
                        {activeConversation.conversationType === "support" ? "Support" : (activeConversation.deviceName ?? "Vendor")}
                      </p>
                      <p className="text-xs text-slate-500">{activeConversation.userName} · {activeConversation.userEmail}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { void loadConversations(); if (selectedId) void loadChat(selectedId); }} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-orange" aria-label="Refresh">
                    <RefreshCw size={15} />
                  </button>
                </div>
                {/* Device context header (vendor only) */}
                {activeConversation.conversationType === "vendor" && activeConversation.deviceName && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-[#fbfcfd] px-3 py-2.5">
                    <ShieldCheck size={14} className="text-orange" />
                    <span className="text-xs font-bold text-navy">{activeConversation.deviceName}</span>
                    <span className="text-xs text-slate-400">{activeConversation.deviceModel}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[10px] font-extrabold text-slate-500">{activeConversation.referenceNumber}</span>
                    {activeConversation.requestStatus && <RequestStatusBadge status={activeConversation.requestStatus} />}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8f9fa] p-4">
                {isLoadingChat ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-500" role="status">
                    <LoaderCircle size={16} className="animate-spin text-orange" /> Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MessageSquare size={26} className="text-slate-300" />
                    <p className="mt-3 text-sm font-bold text-navy">No messages yet</p>
                    <p className="mt-1 text-xs text-slate-500">Send a message to start the conversation.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.senderRole === "admin" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${msg.senderRole === "admin" ? "bg-navy text-white" : "border border-slate-200 bg-white text-navy"}`}>
                          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                          <p className={`mt-1 text-[10px] ${msg.senderRole === "admin" ? "text-white/40" : "text-slate-400"}`}>
                            {formatFullDate(msg.createdAt)}
                            {msg.senderRole === "admin" && (msg.readAt ? <span className="ml-1 inline-flex items-center gap-0.5"><CheckCheck size={11} /> Read</span> : <span className="ml-1 inline-flex items-center gap-0.5"><Clock size={11} /> Sent</span>)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-slate-100 p-4">
                <form className="flex items-end gap-2" onSubmit={handleSend}>
                  <textarea value={draft} onChange={(e) => { draftRef.current = e.target.value; setDraft(e.target.value); }} rows={1} placeholder="Type your reply..."
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(e as unknown as FormEvent<HTMLFormElement>); } }}
                    className="max-h-32 min-h-[44px] flex-1 resize-none rounded-lg border border-slate-200 bg-[#fbfcfd] px-3 py-3 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-orange focus:ring-2 focus:ring-orange/10" />
                  <button type="submit" disabled={isSending || !draft.trim()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange px-4 text-xs font-extrabold text-navy transition hover:bg-orange-light disabled:cursor-not-allowed disabled:opacity-50">
                    {isSending ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />} Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <MessageSquare size={32} className="text-slate-300" />
              <p className="mt-4 text-sm font-bold text-navy">Select a conversation</p>
              <p className="mt-1 text-xs text-slate-500">Choose a conversation from the list to view and reply to messages.</p>
            </div>
          )}
        </div>
      </div>

      {newSupportOpen && (
        <NewSupportModal
          existingConversations={conversations}
          onClose={() => setNewSupportOpen(false)}
          onCreated={(conv) => {
            setNewSupportOpen(false);
            void loadConversations().then(() => setSelectedId(conv.id));
          }}
        />
      )}
    </section>
  );
}

function NewSupportModal({
  existingConversations,
  onClose,
  onCreated,
}: {
  existingConversations: VendorConversation[];
  onClose: () => void;
  onCreated: (conv: VendorConversation) => void;
}) {
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await listAllUsers();
        if (isMounted) setUsers(data.users ?? []);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const supportUserIds = useMemo(
    () => new Set(existingConversations.filter((c) => c.conversationType === "support").map((c) => c.userId)),
    [existingConversations],
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter(
      (u) => !supportUserIds.has(u.id) && (!query || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)),
    );
  }, [users, supportUserIds, search]);

  const handleCreate = async (userId: string) => {
    setIsCreating(userId);
    setError("");
    try {
      const conv = await adminCreateSupportConversation(userId);
      onCreated(conv);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create conversation.");
    } finally {
      setIsCreating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="New support conversation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[80vh] w-full max-w-[480px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <Headphones size={18} className="text-orange" />
            <h3 className="text-sm font-extrabold text-navy">New Support Conversation</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-100 p-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-[#fbfcfd] pl-9 pr-3 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-orange focus:ring-2 focus:ring-orange/10" />
          </div>
        </div>

        {error && <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-500">
              <LoaderCircle size={16} className="animate-spin text-orange" /> Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <MessageSquare size={24} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-bold text-navy">No users found</p>
              <p className="mt-1 text-xs text-slate-500">All users already have a support conversation, or no users match your search.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-navy">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <button type="button" onClick={() => handleCreate(user.id)} disabled={isCreating === user.id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-orange px-3 py-2 text-[10px] font-extrabold text-navy transition hover:bg-orange-light disabled:opacity-50">
                    {isCreating === user.id ? <LoaderCircle size={12} className="animate-spin" /> : <Plus size={12} />} Start
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
