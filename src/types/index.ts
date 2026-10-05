export interface Expense {
  id: string;
  rowIndex: number;
  sheetRow: number;
  name: string;
  amount: number;
  paidBy: string;
  date?: string;
  participants?: string[];
  subExpenses?: SubExpense[];
  hasSubExpenses?: boolean;
}

export interface SubExpense {
  id: string;
  sheetRow: number;
  parentExpenseName: string;
  name: string;
  amount: number;
  participants?: string[];
}

export interface Friend {
  id: string;
  name: string;
  phone: string;
  requiresPassword?: boolean;
  password?: string;
}

export interface PersonBalance {
  name: string;
  phone: string;
  paid: number;
  share: number;
  balance: number;
}

export interface ExpenseSplit {
  id: string;
  expenseName: string;
  personName: string;
  amount: number;
}

export interface PayeeSettlement {
  name: string;
  phone: string;
  amount: number;
}

export interface ExpenseOwed {
  expenseName: string;
  owes: number;
  paidTo: string;
}

export interface ExpenseCollection {
  expenseName: string;
  debtorName: string;
  amount: number;
}

export interface PersonDues {
  name: string;
  totalOwes: number;
  totalGetsBack: number;
  balance: number;
  payees: PayeeSettlement[];
  owedBy: PayeeSettlement[];
  expenseOwes: ExpenseOwed[];
  expenseCollections: ExpenseCollection[];
}

export interface ExpensePersonOwes {
  name: string;
  share: number;
  paid: number;
  owes: number;
}

export type TabId = "home" | "expenses" | "settle" | "friends";
