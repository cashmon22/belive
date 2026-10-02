import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCheck,
  Clock,
  LoaderCircle,
  MessageSquare,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import type { PaymentRequest } from "@shared/payment-requests";
import type { VendorConversation, VendorMessage } from "@shared/vendor-messages";
import {
  createOrGetConversation,
  getConversation,
  markConversationRead,
  sendMessage,
} from "@/lib/vendor-messages";
import { supabase } from "@/lib/supabase";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function buildIntroMessage(deviceName: string) {
  return `Hello, I'm about to make a purchase for the ${deviceName} that was approved through my device request. I'd like to confirm the purchase details before proceeding.`;
}

export default function VendorChat({
  paymentRequest,
  deviceName,
  onClose,
}: {
  paymentRequest: PaymentRequest;
  deviceName: string;
  onClose: () => void;
}) {
  const [conversation, setConversation] = useState<VendorConversation | null>(null);
  const [messages, setMessages] = useState<VendorMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChat = useCallback(async (conversationId: string) => {
    try {
      const data = await getConversation(conversationId);
      setConversation(data);
      setMessages((current) => {
        const byId = new Map(current.map((message) => [message.id, message]));
        for (const message of data.messages) byId.set(message.id, message);
        return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });
      await markConversationRead(conversationId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load conversation.");
    }
  }, []);

  // Initialize: create or get conversation, then pre-fill intro message if empty
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      setError("");
      try {
        const conv = await createOrGetConversation({ paymentRequestId: paymentRequest.id });
        if (!isMounted) return;
        setConversation(conv);
        await loadChat(conv.id);
        // Pre-fill intro message if no messages exist yet
        setMessages((prev) => {
          if (prev.length === 0) {
            setDraft(buildIntroMessage(deviceName));
          }
          return prev;
        });
      } catch (initError) {
        if (!isMounted) return;
        setError(initError instanceof Error ? initError.message : "Unable to start conversation.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setHasInitialized(true);
        }
      }
    })();
    return () => { isMounted = false; };
  }, [paymentRequest.id, deviceName, loadChat]);

  // Realtime: listen for new messages in this conversation
  useEffect(() => {
    if (!conversation) return;
    const channel = supabase
      .channel(`vendor-chat-${conversation.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vendor_messages", filter: `conversation_id=eq.${conversation.id}` }, (payload) => {
        const row = payload.new as { id: string; conversation_id: string; sender_id: string; sender_role: "user" | "admin"; body: string; read_at: string | null; created_at: string };
        const newMessage: VendorMessage = {
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          senderRole: row.sender_role,
          body: row.body,
          readAt: row.read_at,
          createdAt: row.created_at,
        };
        setMessages((prev) => prev.some((message) => message.id === newMessage.id)
          ? prev
          : [...prev, newMessage].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
        // If admin sent it, mark as read since user is viewing
        if (newMessage.senderRole === "admin") {
          void markConversationRead(conversation.id);
        }
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!conversation || !draft.trim()) return;
    setIsSending(true);
    try {
      const msg = await sendMessage(conversation.id, draft.trim());
      setMessages((prev) => prev.some((message) => message.id === msg.id)
        ? prev
        : [...prev, msg].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/70 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Trusted Vendor conversation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex h-[100vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl bg-white shadow-2xl sm:h-[85vh] sm:rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy lg:hidden" aria-label="Back">
              <ArrowLeft size={18} />
            </button>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-white">
              <ShieldCheck size={18} className="text-orange" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-extrabold text-navy">Trusted Vendor</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">{deviceName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy" aria-label="Close conversation">
            <X size={18} />
          </button>
        </div>

        {/* Device context bar */}
        {conversation && (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-[#fbfcfd] px-4 py-2.5 sm:px-5">
            <ShieldCheck size={14} className="text-orange" />
            <span className="text-xs font-bold text-navy">{conversation.deviceName}</span>
            <span className="text-xs text-slate-400">{conversation.deviceModel}</span>
            <span className="text-slate-300">·</span>
            <span className="text-[10px] font-extrabold text-slate-500">{conversation.referenceNumber}</span>
          </div>
        )}

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8f9fa] p-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-500" role="status">
              <LoaderCircle size={16} className="animate-spin text-orange" /> Loading conversation...
            </div>
          ) : error && !conversation ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare size={26} className="text-slate-300" />
              <p className="mt-3 text-sm font-bold text-navy">Unable to load conversation</p>
              <p className="mt-1 text-xs text-slate-500">{error}</p>
            </div>
          ) : messages.length === 0 && hasInitialized ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare size={26} className="text-slate-300" />
              <p className="mt-3 text-sm font-bold text-navy">Start the conversation</p>
              <p className="mt-1 text-xs text-slate-500">Send a message to the Trusted Vendor below.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderRole === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${msg.senderRole === "user" ? "bg-orange text-navy" : "border border-slate-200 bg-white text-navy"}`}>
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    <p className={`mt-1 text-[10px] ${msg.senderRole === "user" ? "text-navy/50" : "text-slate-400"}`}>
                      {formatTime(msg.createdAt)}
                      {msg.senderRole === "user" && (msg.readAt ? <span className="ml-1 inline-flex items-center gap-0.5"><CheckCheck size={11} /> Read</span> : <span className="ml-1 inline-flex items-center gap-0.5"><Clock size={11} /> Sent</span>)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && conversation && (
          <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>
        )}

        {/* Composer */}
        <div className="border-t border-slate-200 p-3 sm:p-4">
          {messages.length === 0 && draft && (
            <p className="mb-2 px-1 text-[10px] font-semibold text-slate-400">Review and send the pre-filled message, or edit it:</p>
          )}
          <form className="flex items-end gap-2" onSubmit={handleSend}>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder="Type your message..."
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(e as unknown as FormEvent<HTMLFormElement>); } }}
              className="max-h-32 min-h-[48px] flex-1 resize-none rounded-lg border border-slate-200 bg-[#fbfcfd] px-3 py-3 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-orange focus:ring-2 focus:ring-orange/10" />
            <button type="submit" disabled={isSending || !draft.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-orange px-5 text-xs font-extrabold text-navy transition hover:bg-orange-light disabled:cursor-not-allowed disabled:opacity-50">
              {isSending ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />} Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
