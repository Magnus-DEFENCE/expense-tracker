const form = document.getElementById("transactionForm");
const tableBody = document.getElementById("transactionBody");
const statusMsg = document.getElementById("statusMsg");

const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const totalBalanceEl = document.getElementById("totalBalance");

// Default date field to today
document.getElementById("date").valueAsDate = new Date();

function formatCurrency(num) {
  return "₱" + Number(num).toLocaleString("en-PH", { minimumFractionDigits: 2 });
}

function setStatus(msg, isError = false) {
  statusMsg.textContent = msg;
  statusMsg.style.color = isError ? "#dc2626" : "#6b7280";
}

async function loadTransactions() {
  setStatus("Loading transactions...");

  const { data, error } = await supabaseClient
    .from("transactions")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    setStatus("Error loading transactions: " + error.message, true);
    return;
  }

  renderTransactions(data);
  renderTotals(data);
  setStatus(`${data.length} transaction(s) loaded.`);
}

function renderTransactions(transactions) {
  tableBody.innerHTML = "";

  if (transactions.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#9ca3af;">No transactions yet</td></tr>`;
    return;
  }

  transactions.forEach((tx) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${tx.date}</td>
      <td><span class="badge ${tx.type}">${tx.type}</span></td>
      <td>${escapeHtml(tx.description || "")}</td>
      <td>${escapeHtml(tx.category || "")}</td>
      <td>${formatCurrency(tx.amount)}</td>
      <td><button class="delete-btn" data-id="${tx.id}" title="Delete">🗑</button></td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteTransaction(btn.dataset.id));
  });
}

function renderTotals(transactions) {
  let income = 0;
  let expense = 0;

  transactions.forEach((tx) => {
    if (tx.type === "income") income += Number(tx.amount);
    else expense += Number(tx.amount);
  });

  totalIncomeEl.textContent = formatCurrency(income);
  totalExpenseEl.textContent = formatCurrency(expense);
  totalBalanceEl.textContent = formatCurrency(income - expense);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newTx = {
    type: document.getElementById("type").value,
    amount: parseFloat(document.getElementById("amount").value),
    description: document.getElementById("description").value.trim(),
    category: document.getElementById("category").value.trim(),
    date: document.getElementById("date").value,
  };

  setStatus("Saving transaction...");

  const { error } = await supabaseClient.from("transactions").insert([newTx]);

  if (error) {
    console.error(error);
    setStatus("Error saving transaction: " + error.message, true);
    return;
  }

  form.reset();
  document.getElementById("date").valueAsDate = new Date();
  await loadTransactions();
});

async function deleteTransaction(id) {
  const confirmed = confirm("Delete this transaction?");
  if (!confirmed) return;

  const { error } = await supabaseClient.from("transactions").delete().eq("id", id);

  if (error) {
    console.error(error);
    setStatus("Error deleting transaction: " + error.message, true);
    return;
  }

  await loadTransactions();
}

loadTransactions();
