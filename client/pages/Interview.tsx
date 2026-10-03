import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, CircleAlert, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getInterviewQuestions, getMyInterview, submitInterview, type InterviewQuestion } from "@/lib/interviews";

export default function Interview() {
  const { session, signOut } = useAuth();
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadInterview = () => Promise.all([getInterviewQuestions(), getMyInterview()]).then(([questionResult, interviewResult]) => {
      if (!active) return;
      setQuestions(questionResult.questions);
      if (interviewResult.submission) setStatus(interviewResult.submission.status);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load your interview.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    void loadInterview();
    const interval = window.setInterval(() => {
      void getMyInterview().then(({ submission }) => {
        if (active && submission) setStatus(submission.status);
      }).catch(() => undefined);
    }, 15_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const result = await submitInterview(questions.map(({ id, prompt }) => ({ questionId: id, prompt, answer: answers[id] ?? "" })));
      setStatus(result.submission.status);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your interview.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return <main className="min-h-screen bg-[#f8f9fa] px-5 py-10 text-ink sm:px-8 sm:py-16">
    <div className="mx-auto max-w-[780px]">
      <header className="mb-8 flex items-center justify-between"><Link to="/" className="text-sm font-extrabold text-navy">Contributor Portal</Link><button type="button" onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:text-navy"><LogOut size={14} /> Sign out</button></header>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(20,36,52,0.07)] sm:p-9">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-6"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange/10 text-orange"><ShieldCheck size={21} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Contributor onboarding</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">Interview &amp; application</h1><p className="mt-3 text-sm leading-6 text-slate-500">Complete the interview below to request contributor access. An administrator will review your answers before your workspace is enabled.</p></div></div>
        {isLoading ? <div className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-slate-500"><LoaderCircle size={17} className="animate-spin text-orange" /> Loading your interview…</div> : status ? <div className="mt-7 rounded-lg border border-slate-200 bg-[#fbfcfd] p-6" role="status"><div className="flex items-center gap-3"><CheckCircle2 className="text-orange" size={20} /><h2 className="text-base font-extrabold text-navy">Interview {status === "Under Review" ? "submitted" : status.toLowerCase()}</h2></div><p className="mt-3 text-sm leading-6 text-slate-500">{status === "Under Review" ? "Your answers have been received and are awaiting administrator review." : status === "Approved" ? "Your interview is approved. You can now access your contributor dashboard." : "Your interview was not approved. Please contact support if you need assistance."}</p>{status === "Approved" && <Link to="/dashboard" className="mt-5 inline-flex items-center gap-2 rounded-md bg-orange px-5 py-3 text-sm font-extrabold text-navy">Open dashboard <ArrowRight size={15} /></Link>}</div> : <form className="mt-7 space-y-6" onSubmit={handleSubmit}>
          {questions.length === 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Interview questions are not available yet. Please check back later.</div>}
          {questions.map((question, index) => <label key={question.id} className="block"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Question {index + 1}</span><span className="mt-2 block text-sm font-bold leading-6 text-navy">{question.prompt}</span><textarea required maxLength={5000} rows={4} value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className="mt-3 w-full resize-y rounded-md border border-slate-200 bg-[#fbfcfd] p-3 text-sm leading-6 text-navy outline-none focus:border-orange focus:ring-2 focus:ring-orange/10" placeholder="Write your answer" /></label>)}
          {error && <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800" role="alert"><CircleAlert size={15} className="mt-0.5 shrink-0" />{error}</div>}
          <div className="border-t border-slate-100 pt-5"><button type="submit" disabled={isSubmitting || questions.length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange px-6 py-3.5 text-sm font-extrabold text-navy transition hover:bg-orange-light disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{isSubmitting ? <><LoaderCircle size={15} className="animate-spin" /> Submitting…</> : "Submit interview"}</button><p className="mt-3 text-xs text-slate-400">Signed in as {session?.user.email}</p></div>
        </form>}
      </section>
    </div>
  </main>;
}
