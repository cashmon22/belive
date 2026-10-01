import { useEffect, useState } from "react";
import { ClipboardList, Clock3, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { listContributorTasks, type ContributorTask } from "@/lib/contributor-tasks";

export default function MyTasksSection() {
  const [tasks, setTasks] = useState<ContributorTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    void listContributorTasks().then(({ tasks: loadedTasks }) => {
      if (isMounted) setTasks(loadedTasks);
    }).catch((loadError) => {
      if (isMounted) setError(loadError instanceof Error ? loadError.message : "Unable to load your tasks.");
    }).finally(() => {
      if (isMounted) setIsLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  return (
    <div>
      <div className="border-b border-slate-200 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Contributor workspace</p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.04em] text-navy sm:text-[32px]">My Tasks</h1>
        <p className="mt-2 max-w-[600px] text-sm leading-6 text-slate-500">Track assignments you&apos;ve started and their current progress.</p>
      </div>

      {isLoading ? <div className="mt-8 grid gap-4 md:grid-cols-2" role="status" aria-label="Loading tasks">
        {[0, 1].map((item) => <div key={item} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card"><Skeleton className="h-3 w-28" /><Skeleton className="mt-4 h-5 w-3/4" /><Skeleton className="mt-3 h-3 w-full" /><Skeleton className="mt-2 h-3 w-2/3" /></div>)}
      </div> : error ? <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</div> : tasks.length === 0 ? <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400"><ClipboardList size={26} /></span>
        <p className="mt-5 text-sm font-extrabold text-navy">No active tasks</p>
        <p className="mx-auto mt-2 max-w-[320px] text-xs leading-5 text-slate-500">You haven&apos;t started any assignments yet. Browse Assignments to find available tasks.</p>
      </div> : <div className="mt-8 grid gap-4 md:grid-cols-2">{tasks.map((task) => <article key={task.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-start justify-between gap-3"><span className="rounded-md bg-orange/10 px-2.5 py-1 text-[10px] font-extrabold text-orange">{task.assignment.category}</span><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{task.status}</span></div>
        <h2 className="mt-4 text-sm font-extrabold text-navy">{task.assignment.title}</h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">{task.assignment.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-[11px] font-semibold text-slate-500"><span className="flex items-center gap-1.5"><Clock3 size={13} className="text-slate-400" />{task.assignment.estimatedTime}</span><span className="flex items-center gap-1.5"><DollarSign size={13} className="text-emerald-500" />${task.assignment.reward.toFixed(2)}</span><span>Started {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(task.createdAt))}</span></div>
      </article>)}</div>}
    </div>
  );
}
