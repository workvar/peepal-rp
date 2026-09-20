"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Can from "@/components/access/Can";
import ConfirmDialog, { type ConfirmState } from "@/components/ui/ConfirmDialog";
import { Plus, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import { useAccounts } from "./useAccounts";
import AccountsTable from "./AccountsTable";
import AccountModal, { type AccountForm } from "./AccountModal";
import ManualJournalModal from "./ManualJournalModal";
import type { GqlAccount } from "../types";

export default function ChartOfAccountsPage() {
  const { accounts, loading, createAccountMut, updateAccountMut, deleteAccountMut, createJournalMut } =
    useAccounts();

  const [showAccount, setShowAccount] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [editing, setEditing] = useState<GqlAccount | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const openNew = () => {
    setEditing(null);
    setShowAccount(true);
  };
  const openEdit = (a: GqlAccount) => {
    setEditing(a);
    setShowAccount(true);
  };

  const saveAccount = async (edit: GqlAccount | null, form: AccountForm) => {
    try {
      if (edit) {
        await updateAccountMut({
          variables: {
            id: edit.id,
            input: { code: form.code.trim(), name: form.name.trim(), parentId: form.parentId || null, active: form.active },
          },
        });
        toast.success("Account updated");
      } else {
        await createAccountMut({
          variables: {
            input: { code: form.code.trim(), name: form.name.trim(), type: form.type, parentId: form.parentId || null },
          },
        });
        toast.success("Account created");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save account");
      throw err;
    }
  };

  const deleteAccount = (a: GqlAccount) => {
    setConfirmState({
      title: "Delete Account",
      message: `“${a.name}” will be removed. Accounts with ledger history cannot be deleted.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await deleteAccountMut({ variables: { id: a.id } });
          toast.success("Deleted");
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Failed to delete");
        }
      },
    });
  };

  const postJournal = async (input: {
    date: string;
    memo: string | null;
    lines: { accountId: string; debit: number; credit: number; memo: string | null }[];
  }) => {
    try {
      await createJournalMut({ variables: { input } });
      toast.success("Journal entry posted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post entry");
      throw err;
    }
  };

  return (
    <div>
      <Header
        title="Chart of Accounts"
        subtitle="Your ledger accounts. System accounts are seeded and locked; add your own beneath them."
        action={
          <div className="flex gap-2">
            <Can module="chart-of-accounts" action="create">
              <button className="btn-secondary flex items-center gap-2" onClick={() => setShowJournal(true)}>
                <BookOpen size={16} /> Manual Journal
              </button>
            </Can>
            <Can module="chart-of-accounts" action="create">
              <button className="btn-primary flex items-center gap-2" onClick={openNew}>
                <Plus size={16} /> New Account
              </button>
            </Can>
          </div>
        }
      />

      {loading ? <LoadingSpinner /> : <AccountsTable accounts={accounts} onEdit={openEdit} onDelete={deleteAccount} />}

      <AccountModal
        isOpen={showAccount}
        onClose={() => setShowAccount(false)}
        editing={editing}
        accounts={accounts}
        onSave={saveAccount}
      />
      <ManualJournalModal
        isOpen={showJournal}
        onClose={() => setShowJournal(false)}
        accounts={accounts}
        onSave={postJournal}
      />
      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
