import { LoaderCircle, Trash2 } from "lucide-react";

export default function AdminDeleteDialog({
  title,
  message,
  confirmLabel,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/55 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="admin-delete-title">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600"><Trash2 size={19} /></div>
        <h3 id="admin-delete-title" className="mt-5 text-lg font-extrabold text-navy">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={isDeleting} className="rounded-lg border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 transition hover:border-slate-300 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={isDeleting} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
            {isDeleting && <LoaderCircle size={14} className="animate-spin" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
