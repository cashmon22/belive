import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCheck,
  Clock,
  LoaderCircle,
  MessageSquare,
  Send,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import type { VendorMessage } from "@shared/vendor-messages";
import {
  getConversation,
  markConversationRead,
  sendMessage,
} from "@/lib/vendor-messages";
import { supabase } from "@/lib/supabase";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function ConversationChat({
  conversationId,
  title,
  subtitle,
  icon = "vendor",
  onBack,
}: {
  conversationId: string;
  title: string;
  subtitle?: string;
  icon?: "vendor" | "support";
  onBack?: () => void;
}) {
  const [messages, setMessages] = useState<VendorMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChat = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getConversation(conversationId);
      setMessages(data.messages);
      await markConversationRead(conversationId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load conversation.");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  // Realtime: listen for new messages in this conversation
  useEffect(() => {
    const channel = supabase
      .channel(`conv-chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vendor_messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const newMessage = payload.new as VendorMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        // If admin sent it, mark as read since user is viewing
        if (newMessage.senderRole === "admin") {
          void markConversationRead(conversationId);
        }
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setIsSending(true);
    try {
      const msg = await sendMessage(conversationId, draft.trim());
      setMessages((prev) => [...prev, msg]);
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const HeaderIcon = icon === "support" ? Headphones : ShieldCheck;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy lg:hidden" aria-label="Back to conversations">
              <ArrowLeft size={18} />
            </button>
          )}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-white">
            <HeaderIcon size={18} className={icon === "support" ? "text-orange" : "text-orange"} />
          </span>
          <div>
            <p className="text-sm font-extrabold text-navy">{title}</p>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8f9fa] p-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-500" role="status">
            <LoaderCircle size={16} className="animate-spin text-orange" /> Loading conversation...
          </div>
        ) : error && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare size={26} className="text-slate-300" />
            <p className="mt-3 text-sm font-bold text-navy">Unable to load conversation</p>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
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
      {error && messages.length > 0 && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>
      )}

      {/* Composer */}
      <div className="border-t border-slate-200 p-3 sm:p-4">
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
  );
}
