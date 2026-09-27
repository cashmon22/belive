import { ClipboardList } from "lucide-react";

export default function MyTasksSection() {
  return (
    <div>
      <div className="border-b border-slate-200 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">
          Contributor workspace
        </p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.04em] text-navy sm:text-[32px]">
          My Tasks
        </h1>
        <p className="mt-2 max-w-[600px] text-sm leading-6 text-slate-500">
          Track assignments you've started and their current progress.
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <ClipboardList size={26} />
        </span>
        <p className="mt-5 text-sm font-extrabold text-navy">No active tasks</p>
        <p className="mx-auto mt-2 max-w-[320px] text-xs leading-5 text-slate-500">
          You haven't started any assignments yet. Browse the Assignments section
          to find available tasks.
        </p>
      </div>
    </div>
  );
}
