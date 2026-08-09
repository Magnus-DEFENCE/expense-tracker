// ===================== TRANSACTIONS LOGIC =====================

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
    document.getElementById("appLoading").classList.add("hidden");
    document.getElementById("appContent").classList.remove("hidden");
    return;
  }

  renderTransactions(data);
  renderTotals(data);
  renderCategoryCards(data);
  setStatus(`${data.length} transaction(s) loaded.`);

  // Reveal the app content and hide the loading spinner now that data is ready
  document.getElementById("appLoading").classList.add("hidden");
  document.getElementById("appContent").classList.remove("hidden");
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

// Simple icon lookup based on common category names.
// Falls back to a generic tag icon if the category isn't recognized.
const CATEGORY_ICONS = {
  food: "🛒",
  grocery: "🛒",
  groceries: "🛒",
  rent: "🏠",
  housing: "🏠",
  restaurant: "🍽️",
  dining: "🍽️",
  transport: "🚗",
  transportation: "🚗",
  shopping: "🛍️",
  bills: "💡",
  utilities: "💡",
  subscriptions: "🔁",
  subscription: "🔁",
  activities: "🎉",
  entertainment: "🎉",
  health: "🩺",
  medical: "🩺",
  education: "📚",
  salary: "💰",
  income: "💰",
  savings: "🏦",
  load: "📱",
  other: "🏷️",
};

function getCategoryIcon(category) {
  const key = (category || "").trim().toLowerCase();
  return CATEGORY_ICONS[key] || "🏷️";
}

function renderCategoryCards(transactions) {
  const categoryTotals = {};

  transactions.forEach((tx) => {
    if (tx.type !== "expense") return; // category breakdown focuses on spending
    const cat = tx.category || "Other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(tx.amount);
  });

  const container = document.getElementById("categoryCards");
  const categories = Object.keys(categoryTotals);

  if (categories.length === 0) {
    container.innerHTML = `<p style="color:#8a8473; font-size:13px;">No expenses yet — add one below to see your breakdown.</p>`;
    return;
  }

  container.innerHTML = categories
    .map((cat) => `
      <div class="category-card">
        <div class="cat-top">
          <span class="cat-icon">${getCategoryIcon(cat)}</span>
          <span>${escapeHtml(cat)}</span>
        </div>
        <div class="cat-amount">${formatCurrency(categoryTotals[cat])}</div>
      </div>
    `)
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    setStatus("You must be logged in to add a transaction.", true);
    return;
  }

  const newTx = {
    type: document.getElementById("type").value,
    amount: parseFloat(document.getElementById("amount").value),
    description: document.getElementById("description").value.trim(),
    category: document.getElementById("category").value.trim(),
    date: document.getElementById("date").value,
    user_id: user.id,
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