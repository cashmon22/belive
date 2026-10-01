import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Plus, Minus, Search, ShieldCheck, Trash2, UserRound, Wallet, X } from "lucide-react";
import AdminDeleteDialog from "@/components/AdminDeleteDialog";
import type { AdminUser, AdminUserStatus } from "@shared/admin-users";
import type { BalanceTransaction } from "@shared/admin-balance";
import { createAdminUser, deleteAdminUser, getAdminUserDetails, listAdminUsers, updateAdminUserStatus, type CreatedAdminUser } from "@/lib/admin-users";
import { addUserBalance, getUserBalance, listBalanceTransactions, removeUserBalance } from "@/lib/admin-balance";

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedAdminUser | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceAction, setBalanceAction] = useState<"add" | "remove" | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [balanceSubmitting, setBalanceSubmitting] = useState(false);
  const [balanceError, setBalanceError] = useState("");

  const loadUsers = async (query: string) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await listAdminUsers(query);
      setUsers(response.users);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers("");
  }, []);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreating) return;
    if (createPassword !== confirmPassword) {
      setCreateError("Passwords do not match.");
      return;
    }

    setIsCreating(true);
    setCreateError("");
    try {
      const user = await createAdminUser({
        email: createEmail.trim(),
        password: createPassword,
        fullName: createFullName.trim() || undefined,
      });
      setCreatedUser(user);
      setCreatePassword("");
      setConfirmPassword("");
      await loadUsers(submittedSearch);
    } catch (createFailure) {
      setCreateError(createFailure instanceof Error ? createFailure.message : "Unable to create user.");
    } finally {
      setIsCreating(false);
    }
  };

  const closeCreateDialog = () => {
    setIsCreateOpen(false);
    setCreatedUser(null);
    setCreateEmail("");
    setCreateFullName("");
    setCreatePassword("");
    setConfirmPassword("");
    setCreateError("");
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedSearch(search.trim());
    void loadUsers(search.trim());
  };

  const handleSelectUser = async (user: AdminUser) => {
    setSelectedUser(user);
    setBalance(null);
    setTransactions([]);
    setBalanceAction(null);
    setAmountInput("");
    setNoteInput("");
    setBalanceError("");
    try {
      const details = await getAdminUserDetails(user.id);
      setSelectedUser(details);
    } catch {
      setSelectedUser(user);
    }
    void loadBalanceData(user.id);
  };

  const loadBalanceData = async (userId: string) => {
    setBalanceLoading(true);
    setBalanceError("");
    try {
      const [balanceData, transactionsData] = await Promise.all([
        getUserBalance(userId),
        listBalanceTransactions(userId),
      ]);
      setBalance(balanceData.availableBalance);
      setTransactions(transactionsData);
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : "Unable to load balance data.");
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleBalanceSubmit = async () => {
    if (!selectedUser || balanceSubmitting) return;
    const amount = parseFloat(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setBalanceError("Enter a valid positive amount.");
      return;
    }
    setBalanceSubmitting(true);
    setBalanceError("");
    try {
      if (balanceAction === "add") {
        await addUserBalance(selectedUser.id, { amount, note: noteInput.trim() || undefined });
        toast.success(`$${amount.toFixed(2)} added to balance`);
      } else {
        await removeUserBalance(selectedUser.id, { amount, note: noteInput.trim() || undefined });
        toast.success(`$${amount.toFixed(2)} removed from balance`);
      }
      setBalanceAction(null);
      setAmountInput("");
      setNoteInput("");
      await loadBalanceData(selectedUser.id);
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : "Unable to update balance.");
      toast.error("Unable to update balance.");
    } finally {
      setBalanceSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget || deleteTarget.isAdmin || isDeleting) return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteAdminUser(deleteTarget.id);
      setUsers((current) => current.filter((user) => user.id !== deleteTarget.id));
      setSelectedUser(null);
      setDeleteTarget(null);
      toast.success("User and linked records deleted.");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unable to delete user.";
      setError(message);
      toast.error("Unable to delete user.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (status: AdminUserStatus) => {
    if (!selectedUser || isUpdating || status === selectedUser.status) return;
    setIsUpdating(true);
    setError("");
    try {
      const updatedUser = await updateAdminUserStatus(selectedUser.id, status);
      setSelectedUser(updatedUser);
      setUsers((current) => current.map((user) => user.id === updatedUser.id ? updatedUser : user));
      toast.success(`Account ${status === "Suspended" ? "suspended" : "reactivated"}`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update account status.");
      toast.error("Unable to update account status.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">People</p>
          <h2 className="mt-2 text-[32px] font-extrabold tracking-[-0.04em] text-navy sm:text-[40px]">Users</h2>
          <p className="mt-3 max-w-[580px] text-sm leading-6 text-slate-500">View contributor accounts and manage basic account status from the administrator workspace.</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><ShieldCheck size={16} className="text-orange" /> Protected administrator data</div>
          <button type="button" onClick={() => { setCreatedUser(null); setCreateError(""); setIsCreateOpen(true); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange px-5 text-xs font-extrabold text-navy shadow-sm transition hover:bg-orange/90"><Plus size={16} /> Create User</button>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_16px_rgba(20,36,52,0.04)] sm:p-5">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
          <label className="relative flex-1"><span className="sr-only">Search users</span><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email" className="h-11 w-full rounded-lg border border-slate-200 bg-[#fbfcfd] pl-10 pr-3 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-orange focus:ring-2 focus:ring-orange/10" /></label>
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-navy px-5 text-xs font-extrabold text-white transition hover:bg-navy/90"><Search size={15} /> Search users</button>
        </form>
      </div>

      {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</div>}

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_16px_rgba(20,36,52,0.04)]">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6"><div><h3 className="text-sm font-extrabold text-navy">User directory</h3><p className="mt-1 text-xs text-slate-500">{isLoading ? "Loading users..." : `${users.length} user${users.length === 1 ? "" : "s"}${submittedSearch ? ` matching “${submittedSearch}”` : ""}`}</p></div><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Credentials never shown</span></div>
        {isLoading ? <div className="px-5 py-14 text-center text-sm text-slate-500">Loading user accounts...</div> : users.length === 0 ? <div className="px-5 py-14 text-center"><UserRound size={23} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-bold text-navy">No users found</p><p className="mt-1 text-xs text-slate-500">Try a different name or email search.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#fbfcfd] text-[10px] font-bold uppercase tracking-wide text-slate-400"><tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Created</th><th className="px-6 py-3">Status</th><th className="px-6 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id} className="transition hover:bg-[#fbfcfd]"><td className="px-6 py-4"><button type="button" onClick={() => void handleSelectUser(user)} className="flex items-center gap-3 text-left"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange/10 text-xs font-extrabold text-orange">{user.name.slice(0, 1).toUpperCase()}</span><span className="text-sm font-bold text-navy hover:text-orange">{user.name}</span></button></td><td className="px-6 py-4 text-sm text-slate-600">{user.email}</td><td className="px-6 py-4 text-xs text-slate-500">{formatDate(user.createdAt)}</td><td className="px-6 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${user.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{user.status}</span></td><td className="px-6 py-4 text-right"><button type="button" onClick={() => void handleSelectUser(user)} className="text-xs font-bold text-navy transition hover:text-orange">View details</button></td></tr>)}</tbody></table></div>}
      </div>

      {isCreateOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Create user" onMouseDown={(event) => { if (event.target === event.currentTarget && !isCreating) closeCreateDialog(); }}><section className="w-full max-w-lg rounded-t-xl bg-white p-6 shadow-2xl sm:rounded-xl sm:p-7">
        {createdUser ? <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={25} /></div>
          <h3 className="mt-4 text-xl font-extrabold text-navy">User Created Successfully</h3>
          <p className="mt-2 text-sm text-slate-500">The account is ready to sign in with the credentials you provided.</p>
          <dl className="mt-6 divide-y divide-slate-100 rounded-lg border border-slate-200 text-left">
            <div className="flex justify-between gap-4 px-4 py-3 text-sm"><dt className="text-slate-500">Name</dt><dd className="text-right font-semibold text-navy">{createdUser.name}</dd></div>
            <div className="flex justify-between gap-4 px-4 py-3 text-sm"><dt className="text-slate-500">Email</dt><dd className="text-right font-semibold text-navy">{createdUser.email}</dd></div>
            <div className="flex justify-between gap-4 px-4 py-3 text-sm"><dt className="text-slate-500">Created</dt><dd className="text-right font-semibold text-navy">{formatDate(createdUser.createdAt)}</dd></div>
          </dl>
          <button type="button" onClick={closeCreateDialog} className="mt-6 h-11 w-full rounded-lg bg-navy px-5 text-sm font-extrabold text-white transition hover:bg-navy/90">Done</button>
        </div> : <>
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Administrator workspace</p><h3 className="mt-2 text-xl font-extrabold text-navy">Create User</h3><p className="mt-2 text-sm text-slate-500">Create a sign-in account for a new contributor.</p></div><button type="button" onClick={closeCreateDialog} disabled={isCreating} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy disabled:opacity-50" aria-label="Close create user dialog"><X size={18} /></button></div>
          <form className="mt-6 space-y-4" onSubmit={handleCreateUser}>
            {createError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{createError}</div>}
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-navy">Email</span><input type="email" autoComplete="email" required value={createEmail} onChange={(event) => setCreateEmail(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-[#fbfcfd] px-3 text-sm text-navy outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/10" placeholder="name@example.com" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-navy">Full name <span className="font-normal text-slate-400">(optional)</span></span><input type="text" autoComplete="name" maxLength={120} value={createFullName} onChange={(event) => setCreateFullName(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-[#fbfcfd] px-3 text-sm text-navy outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/10" placeholder="Contributor name" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-navy">Password</span><input type="password" autoComplete="new-password" minLength={12} required value={createPassword} onChange={(event) => setCreatePassword(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-[#fbfcfd] px-3 text-sm text-navy outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/10" placeholder="At least 12 characters" /><span className="mt-1 block text-xs text-slate-400">Use at least 12 characters.</span></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-navy">Confirm password</span><input type="password" autoComplete="new-password" minLength={12} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-[#fbfcfd] px-3 text-sm text-navy outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/10" placeholder="Re-enter password" /></label>
            <div className="flex gap-3 pt-1"><button type="button" onClick={closeCreateDialog} disabled={isCreating} className="h-11 flex-1 rounded-lg border border-slate-200 px-5 text-sm font-bold text-slate-600 transition hover:border-navy hover:text-navy disabled:opacity-50">Cancel</button><button type="submit" disabled={isCreating} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-orange px-5 text-sm font-extrabold text-navy transition hover:bg-orange/90 disabled:cursor-not-allowed disabled:opacity-60">{isCreating ? "Creating…" : "Create User"}</button></div>
          </form>
        </>}
      </section></div>}

      {selectedUser && <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="User details" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedUser(null); }}><section className="w-full max-w-lg rounded-t-xl bg-white p-6 shadow-2xl sm:rounded-xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Account details</p><h3 className="mt-2 text-xl font-extrabold text-navy">{selectedUser.name}</h3></div><div className="flex items-center gap-2">{!selectedUser.isAdmin && <button type="button" onClick={() => setDeleteTarget(selectedUser)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"><Trash2 size={14} /> Delete User</button>}<button type="button" onClick={() => setSelectedUser(null)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-navy" aria-label="Close user details"><X size={18} /></button></div></div><dl className="mt-6 divide-y divide-slate-100 rounded-lg border border-slate-200"><div className="flex justify-between gap-5 px-4 py-3 text-sm"><dt className="text-slate-500">Email</dt><dd className="text-right font-semibold text-navy">{selectedUser.email}</dd></div><div className="flex justify-between gap-5 px-4 py-3 text-sm"><dt className="text-slate-500">Account created</dt><dd className="font-semibold text-navy">{formatDate(selectedUser.createdAt)}</dd></div><div className="flex justify-between gap-5 px-4 py-3 text-sm"><dt className="text-slate-500">Last sign in</dt><dd className="font-semibold text-navy">{formatDate(selectedUser.lastSignInAt)}</dd></div><div className="flex items-center justify-between gap-5 px-4 py-3 text-sm"><dt className="text-slate-500">Account status</dt><dd><select value={selectedUser.status} disabled={isUpdating} onChange={(event) => void handleStatusChange(event.target.value as AdminUserStatus)} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-navy outline-none focus:border-orange"><option>Active</option><option>Suspended</option></select></dd></div></dl>

                {/* Balance Management */}
                <div className="mt-6 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Wallet size={16} className="text-orange" />
                      <h4 className="text-xs font-extrabold text-navy">Balance Management</h4>
                    </div>
                    <div className="text-right">
                      {balanceLoading ? (
                        <span className="text-xs text-slate-400">Loading…</span>
                      ) : (
                        <span className="text-lg font-extrabold text-orange">${(balance ?? 0).toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-3">
                    {balanceError && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{balanceError}</div>}

                    {!balanceAction && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setBalanceAction("add"); setAmountInput(""); setNoteInput(""); setBalanceError(""); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"><Plus size={14} /> Add Balance</button>
                        <button type="button" onClick={() => { setBalanceAction("remove"); setAmountInput(""); setNoteInput(""); setBalanceError(""); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"><Minus size={14} /> Remove Balance</button>
                      </div>
                    )}

                    {balanceAction && (
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Amount (USD)</label>
                          <input type="number" step="0.01" min="0.01" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} placeholder="0.00" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-orange focus:ring-2 focus:ring-orange/10" autoFocus />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Admin note (optional)</label>
                          <input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Reason for adjustment" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-orange focus:ring-2 focus:ring-orange/10" />
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => { setBalanceAction(null); setAmountInput(""); setNoteInput(""); setBalanceError(""); }} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-navy hover:text-navy">Cancel</button>
                          <button type="button" onClick={() => void handleBalanceSubmit()} disabled={balanceSubmitting} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${balanceAction === "add" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                            {balanceSubmitting ? "Processing…" : balanceAction === "add" ? `Confirm Add${amountInput ? ` $${parseFloat(amountInput).toFixed(2)}` : ""}` : `Confirm Remove${amountInput ? ` $${parseFloat(amountInput).toFixed(2)}` : ""}`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Balance History */}
                  <div className="border-t border-slate-100 px-4 py-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Balance History</p>
                    {transactions.length === 0 ? (
                      <p className="text-xs text-slate-400">No balance changes recorded.</p>
                    ) : (
                      <div className="max-h-40 space-y-2 overflow-y-auto">
                        {transactions.map((tx) => (
                          <div key={tx.id} className="flex items-start gap-2 rounded-md bg-[#fbfcfd] px-3 py-2">
                            <span className={`mt-0.5 shrink-0 ${tx.type === "Added" ? "text-emerald-600" : "text-red-600"}`}>
                              {tx.type === "Added" ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-navy">{tx.type === "Added" ? "+" : "−"}${tx.amount.toFixed(2)}</span>
                                <span className="text-[10px] text-slate-400">{new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short" }).format(new Date(tx.createdAt))}</span>
                              </div>
                              <p className="text-[10px] text-slate-400">Balance: ${tx.previousBalance.toFixed(2)} → ${tx.newBalance.toFixed(2)}{tx.adminNote ? ` · ${tx.adminNote}` : ""}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">Only account status and balance can be changed here. Passwords, tokens, and secret credentials are never displayed.</p></section></div>}
      {deleteTarget && <AdminDeleteDialog title="Permanently delete this user?" message={`Delete ${deleteTarget.name} and their linked applications, device requests, conversations, messages, notifications, and balance records? This cannot be undone.`} confirmLabel="Delete User" isDeleting={isDeleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void handleDeleteUser()} />}
    </>
  );
}
