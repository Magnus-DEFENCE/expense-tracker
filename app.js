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
  cachedTransactions = data;
  renderChart(data, currentChartType);
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
}// ===================== CHARTS =====================

const CHART_COLORS = ["#7c9070", "#b5533d", "#c9a227", "#5b7fa6", "#9370b5", "#c97b4a", "#4a9691", "#a35d7a"];

let currentChart = null;
let currentChartType = "pie";
let cachedTransactions = [];

function renderChart(transactions, type) {
  const canvas = document.getElementById("expenseChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (currentChart) {
    currentChart.destroy();
  }

  if (type === "pie") {
    const categoryTotals = {};
    transactions.forEach((tx) => {
      if (tx.type !== "expense") return;
      const cat = tx.category || "Other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(tx.amount);
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    currentChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: CHART_COLORS.slice(0, labels.length),
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { font: { family: "Inter", size: 12 }, color: "#2f2b22" } },
        },
      },
    });
  }

  if (type === "bar") {
    let income = 0, expense = 0;
    transactions.forEach((tx) => {
      if (tx.type === "income") income += Number(tx.amount);
      else expense += Number(tx.amount);
    });

    currentChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Income", "Expense"],
        datasets: [{
          data: [income, expense],
          backgroundColor: ["#5f8654", "#b5533d"],
          borderRadius: 6,
          maxBarThickness: 80,
        }],
      },
      options: {
        responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
      },
    });
  }

  if (type === "line") {
    const dailyTotals = {};
    transactions.forEach((tx) => {
      if (!dailyTotals[tx.date]) dailyTotals[tx.date] = { income: 0, expense: 0 };
      if (tx.type === "income") dailyTotals[tx.date].income += Number(tx.amount);
      else dailyTotals[tx.date].expense += Number(tx.amount);
    });

    const sortedDates = Object.keys(dailyTotals).sort();

    currentChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: sortedDates,
        datasets: [
          {
            label: "Income",
            data: sortedDates.map((d) => dailyTotals[d].income),
            borderColor: "#5f8654",
            backgroundColor: "transparent",
            tension: 0.3,
          },
          {
            label: "Expense",
            data: sortedDates.map((d) => dailyTotals[d].expense),
            borderColor: "#b5533d",
            backgroundColor: "transparent",
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } },
      },
    });
  }
}

document.querySelectorAll(".chart-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".chart-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentChartType = btn.dataset.chart;
    renderChart(cachedTransactions, currentChartType);
  });
});
