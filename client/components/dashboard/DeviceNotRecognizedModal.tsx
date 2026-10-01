import { MonitorCheck, X } from "lucide-react";

interface DeviceNotRecognizedModalProps {
  onClose: () => void;
  onVerifyDevice: () => void;
}

export default function DeviceNotRecognizedModal({
  onClose,
  onVerifyDevice,
}: DeviceNotRecognizedModalProps) {
  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-navy/65 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        className="relative w-full max-w-[480px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-not-recognized-title"
        aria-describedby="device-not-recognized-description"
      >
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-orange/10 blur-3xl" />
        <div className="relative border-b border-slate-100 bg-[#fbfcfd] p-5 sm:p-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close device verification notice"
            className="absolute right-4 top-4 rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy"
          >
            <X size={18} />
          </button>
          <div className="flex items-start gap-4 pr-8">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-navy text-orange shadow-[0_8px_20px_rgba(19,30,41,0.14)]">
              <MonitorCheck size={24} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange">
                Device verification
              </p>
              <h2
                id="device-not-recognized-title"
                className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-navy sm:text-2xl"
              >
                Device Not Recognized
              </h2>
            </div>
          </div>
        </div>
        <div className="relative p-5 sm:p-7">
          <p
            id="device-not-recognized-description"
            className="text-sm leading-6 text-slate-600"
          >
            Your current device has not been verified for this assignment. Verify your device before starting this task.
          </p>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-navy hover:text-navy"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onVerifyDevice}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-orange px-5 py-3 text-sm font-extrabold text-navy shadow-[0_4px_14px_rgba(255,153,0,0.18)] transition hover:-translate-y-0.5 hover:bg-orange-light"
            >
              <MonitorCheck size={16} /> Verify Device
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
