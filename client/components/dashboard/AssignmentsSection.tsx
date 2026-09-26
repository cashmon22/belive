import { useState } from "react";
import {
  BriefcaseBusiness,
  Clock,
  DollarSign,
  Filter,
  PlayCircle,
} from "lucide-react";
import {
  assignments,
  assignmentCategories,
  type Assignment,
  type AssignmentCategory,
} from "@/lib/assignments";

interface AssignmentsSectionProps {
  deviceVerified: boolean;
  onStartTask: (assignment: Assignment) => void;
}

const statusStyles: Record<string, string> = {
  Available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Limited: "border-amber-200 bg-amber-50 text-amber-700",
  Full: "border-slate-200 bg-slate-100 text-slate-500",
};

export default function AssignmentsSection({
  deviceVerified,
  onStartTask,
}: AssignmentsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<AssignmentCategory | "All">(
    "All",
  );

  const filtered =
    activeCategory === "All"
      ? assignments
      : assignments.filter((a) => a.category === activeCategory);

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">
            Contributor workspace
          </p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.04em] text-navy sm:text-[32px]">
            Assignments
          </h1>
          <p className="mt-2 max-w-[600px] text-sm leading-6 text-slate-500">
            Browse available contributor assignments. Complete device
            verification to start working on tasks.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-500">
          <BriefcaseBusiness size={15} className="text-orange" />
          {filtered.length} assignment{filtered.length !== 1 ? "s" : ""} available
        </div>
      </div>

      {/* Category filter */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          <Filter size={13} /> Filter
        </span>
        <button
          type="button"
          onClick={() => setActiveCategory("All")}
          className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
            activeCategory === "All"
              ? "border-navy bg-navy text-white"
              : "border-slate-200 bg-white text-slate-500 hover:border-navy hover:text-navy"
          }`}
        >
          All
        </button>
        {assignmentCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
              activeCategory === cat
                ? "border-navy bg-navy text-white"
                : "border-slate-200 bg-white text-slate-500 hover:border-navy hover:text-navy"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Assignment cards */}
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((assignment) => (
          <div
            key={assignment.id}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-orange/40 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-md bg-orange/10 px-2.5 py-1 text-[10px] font-extrabold text-orange">
                {assignment.category}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[assignment.status]}`}
              >
                {assignment.status}
              </span>
            </div>

            <h3 className="mt-4 text-sm font-extrabold leading-snug text-navy">
              {assignment.title}
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {assignment.description}
            </p>

            <div className="mt-4 flex items-center gap-4 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                {assignment.estimatedTime}
              </span>
              <span className="flex items-center gap-1.5">
                <DollarSign size={13} className="text-emerald-500" />
                {assignment.reward.toFixed(2)}
              </span>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={assignment.status === "Full"}
                onClick={() => onStartTask(assignment)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#1d3042] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlayCircle size={15} className="text-orange" />
                {assignment.status === "Full" ? "Slots Full" : "Start Task"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
