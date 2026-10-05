import { useEffect, useMemo, useState } from "react";
import type { Expense, SubExpense, TabId } from "./types";
import { useExpenses } from "./hooks/useExpenses";
import { useFriends } from "./hooks/useFriends";
import { useSplits } from "./hooks/useSplits";
import { useSubExpenses } from "./hooks/useSubExpenses";
import {
  calculateBalances,
  calculatePersonDues,
  mergeSubExpensesIntoExpenses,
} from "./utils/calculations";
import { USER_STORAGE_KEY, AUTH_SESSION_KEY, isSheetsConfigured } from "./config";
import { verifyUserPassword } from "./services/sheets";
import {
  canDeleteExpenses,
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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [initialUserResolved, setInitialUserResolved] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [focusExpenseId, setFocusExpenseId] = useState<string | null>(null);
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
    isDemo: friendsDemo,
    addFriend,
  } = useFriends();

  const {
    splits,
    loading: splitsLoading,
    error: splitsError,
    saveSplit,
    removeSplitsForExpense,
    reload: reloadSplits,
  } = useSplits();

  const {
    subExpenses,
    loading: subLoading,
    error: subError,
    addSubExpense,
    deleteSubExpense,
    renameParent,
    deleteForParent,
    reload: reloadSubExpenses,
  } = useSubExpenses();

  const isDemo = expensesDemo || friendsDemo;
  const loading = expensesLoading || friendsLoading || splitsLoading || subLoading;

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
    if (loading || friends.length === 0 || initialUserResolved) return;

    setInitialUserResolved(true);
    setDataReady(true);

    const sessionUser = resolveSessionUser(friends);
    if (sessionUser) {
      setCurrentUser(sessionUser);
    } else {
      clearSession();
      setCurrentUser(null);
    }
  }, [loading, friends, initialUserResolved]);

  const handleUserConfirm = (name: string) => {
    createSession(name);
    setCurrentUser(name);
    setShowAccount(false);
    setActiveTab("home");
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setShowAccount(false);
    setActiveTab("home");
  };

  const handleVerifyPassword = async (name: string, password: string) => {
    return verifyUserPassword(name, password, friends);
  };

  const userCanDelete = currentUser ? canDeleteExpenses(currentUser, friends) : false;
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
    participants: string[]
  ) => {
    const base = expenses.find((e) => e.id === expense.id) ?? expense;
    if (name !== base.name) {
      renameParent(base.name, name);
    }
    await updateExpense(base, name, amount, participants);
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!userCanDelete) throw new Error("You don't have permission to delete");

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
    await addSubExpense(parentName, name, amount, participants);
    if (isSheetsConfigured()) {
      await reloadExpenses({ silent: true });
    }
  };

  const handleDeleteSubExpense = async (sub: SubExpense) => {
    await deleteSubExpense(sub);
    if (isSheetsConfigured()) {
      await reloadExpenses({ silent: true });
    }
  };

  if (loading || !dataReady) return <LoadingScreen />;

  if (!currentUser) {
    return <LoginModal onConfirm={handleUserConfirm} verifyPassword={handleVerifyPassword} />;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-32">
      <Header
        currentUser={currentUser}
        onOpenAccount={() => setShowAccount(true)}
        compact={activeTab === "home"}
      />

      <main className="px-4 pt-2">
        {isDemo && !bannerDismissed ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3">
            <p className="text-sm text-pearl/90">
              <span className="font-semibold text-gold">Demo mode</span> — connect Google Sheets
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

        {(expensesError || friendsError || splitsError || subError) && (
          <div className="mb-4 rounded-2xl bg-rose/10 px-4 py-3 text-sm text-rose" role="alert">
            {expensesError || friendsError || splitsError || subError}
          </div>
        )}

        {activeTab === "home" ? (
          <HomeView
            currentUser={currentUser}
            dues={userDues}
            expenses={displayExpenses}
            friends={friends}
            onGoSettle={() => {
              setFocusExpenseId(null);
              setActiveTab("settle");
            }}
            onGoExpenses={() => setActiveTab("expenses")}
            onOpenExpense={(expense) => {
              setFocusExpenseId(expense.id);
              setActiveTab("settle");
            }}
            onAddExpense={() => {
              setOpenAddExpense(true);
              setActiveTab("expenses");
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
            canDelete={userCanDelete}
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
            onClearFocus={() => {
              setFocusExpenseId(null);
              setActiveTab("home");
            }}
            onSaveSplit={saveSplit}
          />
        ) : null}

        {activeTab === "friends" ? (
          <FriendsView friends={friends} onAdd={addFriend} />
        ) : null}
      </main>

      <TabNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab !== "settle") setFocusExpenseId(null);
          setActiveTab(tab);
        }}
      />

      {showAccount && accountFriend ? (
        <AccountSheet
          user={accountFriend}
          onClose={() => setShowAccount(false)}
          onLogout={handleLogout}
        />
      ) : null}
    </div>
  );
}
