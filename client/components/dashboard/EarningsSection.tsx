import { CircleDollarSign, TrendingUp, Wallet, WalletCards } from "lucide-react";

interface EarningsSectionProps {
  contributorId: string;
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#fbfcfd] p-4">
      <p className="text-[10px] font-semibold leading-4 text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-extrabold tracking-[-0.04em] ${accent ? "text-orange" : "text-navy"}`}
      >
        {value}
      </p>
    </div>
  );
}

export default function EarningsSection({ contributorId }: EarningsSectionProps) {
  return (
    <div>
      <div className="border-b border-slate-200 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">
          Contributor workspace
        </p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.04em] text-navy sm:text-[32px]">
          Earnings
        </h1>
        <p className="mt-2 max-w-[600px] text-sm leading-6 text-slate-500">
          View your earnings summary and payment history.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange/10 text-orange">
              <Wallet size={20} />
            </span>
            <p className="text-xs font-bold text-slate-500">Available balance</p>
          </div>
          <p className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-orange">
            $0.00
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <TrendingUp size={20} />
            </span>
            <p className="text-xs font-bold text-slate-500">Pending earnings</p>
          </div>
          <p className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-navy">
            $0.00
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <WalletCards size={20} />
            </span>
            <p className="text-xs font-bold text-slate-500">Total withdrawn</p>
          </div>
          <p className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-navy">
            $0.00
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-orange/10 text-orange">
            <CircleDollarSign size={17} />
          </span>
          <h2 className="text-sm font-extrabold text-navy">Earnings History</h2>
        </div>
        <div className="mt-6 text-center">
          <p className="text-sm font-bold text-slate-400">No earnings yet</p>
          <p className="mx-auto mt-2 max-w-[300px] text-xs leading-5 text-slate-500">
            Earnings will appear here once you complete eligible assignments.
            Contributor ID: {contributorId}
          </p>
        </div>
      </div>
    </div>
  );
}
