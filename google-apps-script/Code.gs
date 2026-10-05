/**
 * TabCheck - Google Apps Script backend
 *
 * Setup:
 * 1. Create a Google Sheet with tabs:
 *    - Friends: Name | Phone | Password
 *    - Expenses: Name | Amount | Paid By | Date | Participants
 *    - Splits: Expense | Person | Amount
 *    - SubExpenses: Parent Expense | Name | Amount | Participants
 * 2. Extensions → Apps Script → paste this file
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the URL into VITE_GOOGLE_SCRIPT_URL in .env
 */

const FRIENDS_SHEET = "Friends";
const FRIENDS_FALLBACK = "Travellers";
const EXPENSES_SHEET = "Expenses";
const SPLITS_SHEET = "Splits";
const SUB_EXPENSES_SHEET = "SubExpenses";

function getFriendsSheet(ss) {
  return ss.getSheetByName(FRIENDS_SHEET) || ss.getSheetByName(FRIENDS_FALLBACK);
}

/** Turn Date cells into yyyy-MM-dd so JSON doesn't shift the calendar day via UTC. */
function serializeRows(values) {
  const tz = Session.getScriptTimeZone() || "Asia/Kolkata";
  return values.map(function (row) {
    return row.map(function (cell) {
      if (Object.prototype.toString.call(cell) === "[object Date]" && !isNaN(cell.getTime())) {
        return Utilities.formatDate(cell, tz, "yyyy-MM-dd");
      }
      return cell;
    });
  });
}

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "expenses") {
    const sheet = ss.getSheetByName(EXPENSES_SHEET);
    const rows = sheet ? serializeRows(sheet.getDataRange().getValues()) : [];
    return jsonResponse({ rows: rows });
  }

  if (action === "bootstrap") {
    const friendsSheet = getFriendsSheet(ss);
    const expensesSheet = ss.getSheetByName(EXPENSES_SHEET);
    const splitsSheet = ss.getSheetByName(SPLITS_SHEET);
    const subSheet = ss.getSheetByName(SUB_EXPENSES_SHEET);
    return jsonResponse({
      friends: friendsSheet ? serializeRows(friendsSheet.getDataRange().getValues()) : [],
      expenses: expensesSheet ? serializeRows(expensesSheet.getDataRange().getValues()) : [],
      splits: splitsSheet ? serializeRows(splitsSheet.getDataRange().getValues()) : [],
      subExpenses: subSheet ? serializeRows(subSheet.getDataRange().getValues()) : [],
    });
  }

  if (action === "friends" || action === "travellers") {
    const sheet = getFriendsSheet(ss);
    const rows = sheet ? serializeRows(sheet.getDataRange().getValues()) : [];
    return jsonResponse({ rows: rows });
  }

  if (action === "splits") {
    const sheet = ss.getSheetByName(SPLITS_SHEET);
    const rows = sheet ? serializeRows(sheet.getDataRange().getValues()) : [];
    return jsonResponse({ rows: rows });
  }

  if (action === "subExpenses") {
    const sheet = ss.getSheetByName(SUB_EXPENSES_SHEET);
    const rows = sheet ? serializeRows(sheet.getDataRange().getValues()) : [];
    return jsonResponse({ rows: rows });
  }

  if (action === "verifyUser") {
    const name = String(e.parameter.name || "").trim();
    const password = String(e.parameter.password || "");
    if (!name) return jsonResponse({ error: "Name is required" });
    const result = verifyUserCredentials(ss, name, password);
    if (result.error) return jsonResponse({ error: result.error });
    return jsonResponse({ success: true });
  }

  if (action === "updateExpense") {
    const sheet = ss.getSheetByName(EXPENSES_SHEET);
    if (!sheet) return jsonResponse({ error: "Expenses sheet not found" });

    const sheetRow = Number(e.parameter.sheetRow);
    if (!sheetRow || sheetRow < 2) return jsonResponse({ error: "Invalid sheet row" });

    const newName = String(e.parameter.name).trim();
    const oldName = String(e.parameter.oldName || "").trim();

    sheet.getRange(sheetRow, 1).setValue(newName);
    sheet.getRange(sheetRow, 2).setValue(Number(e.parameter.amount));
    if (e.parameter.date) {
      sheet.getRange(sheetRow, 4).setValue(String(e.parameter.date).trim());
    }
    sheet.getRange(sheetRow, 5).setValue(String(e.parameter.participants || "").trim());

    if (oldName && oldName.toLowerCase() !== newName.toLowerCase()) {
      renameExpenseInRelatedSheets(ss, oldName, newName);
    }
    return jsonResponse({ success: true });
  }

  if (action === "deleteExpense") {
    const sheet = ss.getSheetByName(EXPENSES_SHEET);
    if (!sheet) return jsonResponse({ error: "Expenses sheet not found" });

    const sheetRow = Number(e.parameter.sheetRow);
    if (!sheetRow || sheetRow < 2) return jsonResponse({ error: "Invalid sheet row" });

    const expenseName = String(sheet.getRange(sheetRow, 1).getValue()).trim();
    sheet.deleteRow(sheetRow);
    if (expenseName) deleteRelatedExpenseData(ss, expenseName);
    return jsonResponse({ success: true });
  }

  if (action === "addSubExpense") {
    const parentExpenseName = String(e.parameter.parentExpenseName || "").trim();
    const name = String(e.parameter.name || "").trim();
    const amount = Number(e.parameter.amount);
    const participants = String(e.parameter.participants || "").trim();

    if (!parentExpenseName || !name) {
      return jsonResponse({ error: "Parent expense and item name are required" });
    }
    if (!amount || amount <= 0) return jsonResponse({ error: "Invalid amount" });

    let sheet = ss.getSheetByName(SUB_EXPENSES_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(SUB_EXPENSES_SHEET);
      sheet.appendRow(["Parent Expense", "Name", "Amount", "Participants"]);
    }

    sheet.appendRow([parentExpenseName, name, amount, participants]);
    syncParentExpenseTotal(ss, parentExpenseName);
    return jsonResponse({ success: true });
  }

  if (action === "deleteSubExpense") {
    const sheet = ss.getSheetByName(SUB_EXPENSES_SHEET);
    if (!sheet) return jsonResponse({ error: "SubExpenses sheet not found" });

    const sheetRow = Number(e.parameter.sheetRow);
    if (!sheetRow || sheetRow < 2) return jsonResponse({ error: "Invalid sheet row" });

    const parentExpenseName = String(sheet.getRange(sheetRow, 1).getValue()).trim();
    sheet.deleteRow(sheetRow);
    if (parentExpenseName) syncParentExpenseTotal(ss, parentExpenseName);
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: "Invalid action" });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (data.action === "addExpense") {
    let sheet = ss.getSheetByName(EXPENSES_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(EXPENSES_SHEET);
      sheet.appendRow(["Name", "Amount", "Paid By", "Date", "Participants"]);
    }
    sheet.appendRow([
      data.name,
      data.amount,
      data.paidBy,
      data.date || new Date().toISOString().split("T")[0],
      String(data.participants || "").trim(),
    ]);
    return jsonResponse({ success: true });
  }

  if (data.action === "addFriend") {
    let sheet = getFriendsSheet(ss);
    if (!sheet) {
      sheet = ss.insertSheet(FRIENDS_SHEET);
      sheet.appendRow(["Name", "Phone", "Password"]);
    }
    sheet.appendRow([
      String(data.name || "").trim(),
      String(data.phone || "").trim(),
      String(data.password || "").trim(),
    ]);
    return jsonResponse({ success: true });
  }

  if (data.action === "saveSplit") {
    let sheet = ss.getSheetByName(SPLITS_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(SPLITS_SHEET);
      sheet.appendRow(["Expense", "Person", "Amount"]);
    }

    const rows = sheet.getDataRange().getValues();
    const expenseName = String(data.expenseName).trim();
    const personName = String(data.personName).trim();
    const amount = Number(data.amount);
    let found = false;

    for (let i = 1; i < rows.length; i++) {
      const rowExpense = String(rows[i][0]).trim().toLowerCase();
      const rowPerson = String(rows[i][1]).trim().toLowerCase();
      if (rowExpense === expenseName.toLowerCase() && rowPerson === personName.toLowerCase()) {
        if (amount <= 0) sheet.deleteRow(i + 1);
        else sheet.getRange(i + 1, 3).setValue(amount);
        found = true;
        break;
      }
    }

    if (!found && amount > 0) sheet.appendRow([expenseName, personName, amount]);
    return jsonResponse({ success: true });
  }

  if (data.action === "verifyUser") {
    const name = String(data.name || "").trim();
    const password = String(data.password || "");
    if (!name) return jsonResponse({ error: "Name is required" });
    const result = verifyUserCredentials(ss, name, password);
    if (result.error) return jsonResponse({ error: result.error });
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: "Invalid action" });
}

function cellPassword(value) {
  if (value == null || value === "") return "";
  return String(value).trim();
}

function verifyUserCredentials(ss, name, password) {
  const sheet = getFriendsSheet(ss);
  if (!sheet) return { error: "Friends sheet not found" };

  const rows = sheet.getDataRange().getValues();
  const nameKey = name.trim().toLowerCase();
  const entered = cellPassword(password);

  if (!entered) return { error: "Password is required" };

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === nameKey) {
      const storedPassword = cellPassword(rows[i][2]);
      if (!storedPassword) {
        return { error: "No password set for this user. Ask your admin" };
      }
      if (storedPassword === entered) return { success: true };
      return { error: "Incorrect password" };
    }
  }
  return { error: "User not found" };
}

function deleteRelatedExpenseData(ss, expenseName) {
  const expenseKey = String(expenseName).trim().toLowerCase();

  const splitsSheet = ss.getSheetByName(SPLITS_SHEET);
  if (splitsSheet) {
    const splitRows = splitsSheet.getDataRange().getValues();
    for (let i = splitRows.length - 1; i >= 1; i--) {
      if (String(splitRows[i][0]).trim().toLowerCase() === expenseKey) {
        splitsSheet.deleteRow(i + 1);
      }
    }
  }

  const subSheet = ss.getSheetByName(SUB_EXPENSES_SHEET);
  if (subSheet) {
    const subRows = subSheet.getDataRange().getValues();
    for (let i = subRows.length - 1; i >= 1; i--) {
      if (String(subRows[i][0]).trim().toLowerCase() === expenseKey) {
        subSheet.deleteRow(i + 1);
      }
    }
  }
}

function renameExpenseInRelatedSheets(ss, oldName, newName) {
  const splitsSheet = ss.getSheetByName(SPLITS_SHEET);
  if (splitsSheet) {
    const splitRows = splitsSheet.getDataRange().getValues();
    for (let i = 1; i < splitRows.length; i++) {
      if (String(splitRows[i][0]).trim().toLowerCase() === oldName.toLowerCase()) {
        splitsSheet.getRange(i + 1, 1).setValue(newName);
      }
    }
  }

  const subSheet = ss.getSheetByName(SUB_EXPENSES_SHEET);
  if (subSheet) {
    const subRows = subSheet.getDataRange().getValues();
    for (let i = 1; i < subRows.length; i++) {
      if (String(subRows[i][0]).trim().toLowerCase() === oldName.toLowerCase()) {
        subSheet.getRange(i + 1, 1).setValue(newName);
      }
    }
  }
}

function syncParentExpenseTotal(ss, parentExpenseName) {
  const subSheet = ss.getSheetByName(SUB_EXPENSES_SHEET);
  const expenseSheet = ss.getSheetByName(EXPENSES_SHEET);
  if (!subSheet || !expenseSheet) return;

  const parentKey = String(parentExpenseName).trim().toLowerCase();
  const subRows = subSheet.getDataRange().getValues();
  let total = 0;

  for (let i = 1; i < subRows.length; i++) {
    if (String(subRows[i][0]).trim().toLowerCase() === parentKey) {
      total += Number(subRows[i][2]) || 0;
    }
  }

  const expenseRows = expenseSheet.getDataRange().getValues();
  for (let i = 1; i < expenseRows.length; i++) {
    if (String(expenseRows[i][0]).trim().toLowerCase() === parentKey) {
      expenseSheet.getRange(i + 1, 2).setValue(total);
      break;
    }
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
