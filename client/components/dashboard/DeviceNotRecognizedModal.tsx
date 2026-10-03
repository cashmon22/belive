import { LockKeyhole, MonitorCheck, X } from "lucide-react";

interface DeviceNotRecognizedModalProps {
  onClose: () => void;
  onVerifyDevice: () => void;
}

export default function DeviceNotRecognizedModal({ onClose, onVerifyDevice }: DeviceNotRecognizedModalProps) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-navy/65 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-verification-title"
        aria-describedby="device-verification-description"
      >
        <header className="flex items-center gap-3 border-b border-slate-100 bg-[#fbfcfd] px-5 py-4 sm:px-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-navy">
            <MonitorCheck size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Security check</p>
            <h2 id="device-verification-title" className="mt-0.5 text-lg font-extrabold tracking-tight text-navy">Device verification required</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close device verification" className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy">
            <X size={18} />
          </button>
        </header>
        <div className="p-5 sm:p-6">
          <p id="device-verification-description" className="text-sm leading-6 text-slate-600">
            For your security, this action can only be completed from a verified device. This device hasn&apos;t been verified yet.
          </p>
          <div className="mt-4 rounded-lg border border-slate-200 bg-[#fbfcfd] p-4">
            <p className="flex items-center gap-2 text-xs font-extrabold text-navy"><LockKeyhole size={15} className="text-slate-500" />Why is verification required?</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">Device verification helps protect your account, earnings, and submitted work from unauthorized access.</p>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-slate-500">Your account information remains protected during verification.</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-navy">
              Cancel
            </button>
            <button type="button" onClick={onVerifyDevice} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-navy px-4 text-sm font-bold text-white transition hover:bg-[#1d3042] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2">
              <MonitorCheck size={16} /> Verify this device
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
