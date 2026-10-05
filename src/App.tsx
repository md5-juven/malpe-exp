import { useEffect, useMemo, useState } from "react";
import type { Expense, SubExpense } from "./types";
import { useExpenses } from "./hooks/useExpenses";
import { useFriends } from "./hooks/useFriends";
import { useSplits } from "./hooks/useSplits";
import { useSubExpenses } from "./hooks/useSubExpenses";
import { useAppHistory } from "./hooks/useAppHistory";
import {
  calculateBalances,
  calculatePersonDues,
  mergeSubExpensesIntoExpenses,
} from "./utils/calculations";
import { USER_STORAGE_KEY, AUTH_SESSION_KEY, isSheetsConfigured } from "./config";
import { verifyUserPassword } from "./services/sheets";
import {
  canModifyExpense,
  clearSession,
  createSession,
  resolveSessionUser,
} from "./utils/auth";
import { Header } from "./components/Header";
import { TabNav } from "./components/TabNav";
import { LoadingScreen } from "./components/LoadingScreen";
import { LoginModal } from "./components/LoginModal";
import { AccountSheet } from "./components/AccountSheet";
import { HomeView } from "./components/HomeView";
import { ExpensesView } from "./components/ExpensesView";
import { SettleView } from "./components/SettleView";
import { FriendsView } from "./components/FriendsView";
import { useAlert } from "./components/ui/AlertProvider";

export default function App() {
  const { confirm } = useAlert();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [initialUserResolved, setInitialUserResolved] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [openAddExpense, setOpenAddExpense] = useState(false);

  const {
    expenses,
    loading: expensesLoading,
    error: expensesError,
    isDemo: expensesDemo,
    addExpense,
    updateExpense,
    deleteExpense,
    reload: reloadExpenses,
  } = useExpenses();

  const {
    friends,
    loading: friendsLoading,
    error: friendsError,
    softNotice,
    clearSoftNotice,
    isDemo: friendsDemo,
    addFriend,
    reload: reloadFriends,
  } = useFriends();

  const {
    splits,
    saveSplit,
    removeSplitsForExpense,
    reload: reloadSplits,
  } = useSplits();

  const {
    subExpenses,
    addSubExpense,
    deleteSubExpense,
    renameParent,
    deleteForParent,
    reload: reloadSubExpenses,
  } = useSubExpenses();

  const {
    tab: activeTab,
    focusExpenseId,
    showAccount,
    goToTab,
    openSettle,
    clearSettleFocus,
    openAccount,
    closeAccount,
  } = useAppHistory(Boolean(currentUser));

  const isDemo = expensesDemo || friendsDemo;
  // Don't block the UI on splits/sub-expenses; shared bootstrap fills them in.
  const booting = (expensesLoading || friendsLoading) && friends.length === 0;

  const displayExpenses = useMemo(
    () => mergeSubExpensesIntoExpenses(expenses, subExpenses),
    [expenses, subExpenses]
  );

  const balances = useMemo(
    () => calculateBalances(displayExpenses, friends, splits),
    [displayExpenses, friends, splits]
  );

  const userDues = useMemo(() => {
    if (!currentUser) return null;
    return calculatePersonDues(currentUser, displayExpenses, friends, splits, balances);
  }, [currentUser, displayExpenses, friends, splits, balances]);

  useEffect(() => {
    // Migrate / clear legacy keys from older TabCheck builds
    localStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  }, []);

  useEffect(() => {
    if (booting || initialUserResolved) return;

    setInitialUserResolved(true);
    setDataReady(true);

    const sessionUser = resolveSessionUser(friends);
    if (sessionUser) {
      setCurrentUser(sessionUser);
    } else {
      clearSession();
      setCurrentUser(null);
    }
  }, [booting, friends, initialUserResolved]);

  const handleRetryBoot = () => {
    void reloadFriends({ force: true });
    void reloadExpenses({ force: true });
  };

  const handleUserConfirm = (name: string) => {
    createSession(name);
    setCurrentUser(name);
    goToTab("home", { replace: true });
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Log out?",
      message: "You’ll need to sign in again on this device.",
      confirmLabel: "Log out",
      cancelLabel: "Stay",
      tone: "danger",
    });
    if (!ok) return;
    clearSession();
    setCurrentUser(null);
    closeAccount();
    goToTab("home", { replace: true });
  };

  const handleVerifyPassword = async (name: string, password: string) => {
    return verifyUserPassword(name, password, friends);
  };

  const accountFriend = currentUser
    ? friends.find((f) => f.name === currentUser) ?? {
        id: "self",
        name: currentUser,
        phone: "",
      }
    : null;

  const handleUpdateExpense = async (
    expense: Expense,
    name: string,
    amount: number,
    participants: string[],
    date: string
  ) => {
    if (!canModifyExpense(currentUser, expense)) {
      throw new Error("You can only edit expenses you added");
    }
    const base = expenses.find((e) => e.id === expense.id) ?? expense;
    if (name !== base.name) {
      renameParent(base.name, name);
    }
    await updateExpense(base, name, amount, participants, date);
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!canModifyExpense(currentUser, expense)) {
      throw new Error("You can only delete expenses you added");
    }

    const base = expenses.find((e) => e.id === expense.id) ?? expense;
    await deleteExpense(base);

    if (isSheetsConfigured()) {
      await reloadSubExpenses({ silent: true });
      await reloadSplits({ silent: true });
    } else {
      deleteForParent(base.name);
      removeSplitsForExpense(base.name);
    }
  };

  const handleAddSubExpense = async (
    parentName: string,
    name: string,
    amount: number,
    participants: string[]
  ) => {
    const parent = expenses.find((e) => e.name === parentName);
    if (parent && !canModifyExpense(currentUser, parent)) {
      throw new Error("You can only edit expenses you added");
    }
    await addSubExpense(parentName, name, amount, participants);
    if (isSheetsConfigured()) {
      await reloadExpenses({ silent: true });
    }
  };

  const handleDeleteSubExpense = async (sub: SubExpense) => {
    const parent = expenses.find((e) => e.name === sub.parentExpenseName);
    if (parent && !canModifyExpense(currentUser, parent)) {
      throw new Error("You can only edit expenses you added");
    }
    await deleteSubExpense(sub);
    if (isSheetsConfigured()) {
      await reloadExpenses({ silent: true });
    }
  };

  if (booting || !dataReady) {
    return <LoadingScreen message="Loading your tab…" />;
  }

  if (friends.length === 0) {
    return (
      <LoadingScreen
        error={
          friendsError ||
          expensesError ||
          "No friends found in your Google Sheet. Add Name / Phone / Password rows in the Friends tab."
        }
        onRetry={handleRetryBoot}
      />
    );
  }

  if (!currentUser) {
    return <LoginModal onConfirm={handleUserConfirm} verifyPassword={handleVerifyPassword} />;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-32">
      <Header
        currentUser={currentUser}
        onOpenAccount={openAccount}
        compact={activeTab === "home"}
      />

      <main className="px-4 pt-2">
        {isDemo && !bannerDismissed ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3">
            <p className="text-sm text-pearl/90">
              <span className="font-semibold text-gold">Demo mode</span>. Connect Google Sheets
              via <code className="text-xs text-mint">VITE_GOOGLE_SCRIPT_URL</code> to sync live
              data.
            </p>
            <button
              type="button"
              className="shrink-0 text-xs text-muted hover:text-pearl"
              onClick={() => setBannerDismissed(true)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {softNotice ? (
          <div
            className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-pearl/90"
            role="status"
          >
            <div>
              <p>{softNotice}</p>
              <button
                type="button"
                className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-gold underline-offset-2 hover:underline"
                onClick={() => {
                  clearSoftNotice();
                  void reloadFriends({ force: true, silent: true });
                  void reloadExpenses({ force: true, silent: true });
                }}
              >
                Refresh now
              </button>
            </div>
            <button
              type="button"
              className="shrink-0 text-xs text-muted hover:text-pearl"
              onClick={clearSoftNotice}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {activeTab === "home" ? (
          <HomeView
            currentUser={currentUser}
            dues={userDues}
            expenses={displayExpenses}
            friends={friends}
            onGoSettle={() => openSettle(null)}
            onGoExpenses={() => goToTab("expenses")}
            onOpenExpense={(expense) => openSettle(expense.id)}
            onAddExpense={() => {
              setOpenAddExpense(true);
              goToTab("expenses");
            }}
          />
        ) : null}

        {activeTab === "expenses" ? (
          <ExpensesView
            expenses={displayExpenses}
            friends={friends}
            splits={splits}
            currentUser={currentUser}
            openAdd={openAddExpense}
            onOpenAddConsumed={() => setOpenAddExpense(false)}
            onAdd={addExpense}
            onUpdate={handleUpdateExpense}
            onDelete={handleDeleteExpense}
            onAddSub={handleAddSubExpense}
            onDeleteSub={handleDeleteSubExpense}
            onViewSplit={(expense) => openSettle(expense.id)}
          />
        ) : null}

        {activeTab === "settle" ? (
          <SettleView
            currentUser={currentUser}
            dues={userDues}
            balances={balances}
            expenses={displayExpenses}
            friends={friends}
            splits={splits}
            focusExpenseId={focusExpenseId}
            onClearFocus={clearSettleFocus}
            onSaveSplit={saveSplit}
          />
        ) : null}

        {activeTab === "friends" ? (
          <FriendsView friends={friends} onAdd={addFriend} />
        ) : null}
      </main>

      <TabNav activeTab={activeTab} onTabChange={(tab) => goToTab(tab)} />

      {showAccount && accountFriend ? (
        <AccountSheet
          user={accountFriend}
          onClose={closeAccount}
          onLogout={handleLogout}
        />
      ) : null}
    </div>
  );
}
