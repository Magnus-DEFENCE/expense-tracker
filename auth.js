// ===================== AUTH LOGIC =====================

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");

const loginTabBtn = document.getElementById("loginTabBtn");
const signupTabBtn = document.getElementById("signupTabBtn");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const authMsg = document.getElementById("authMsg");
const userEmailEl = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");

function showAuthMsg(msg, type = "") {
  authMsg.textContent = msg;
  authMsg.className = "auth-msg" + (type ? " " + type : "");
}

loginTabBtn.addEventListener("click", () => {
  loginTabBtn.classList.add("active");
  signupTabBtn.classList.remove("active");
  loginForm.classList.remove("hidden");
  signupForm.classList.add("hidden");
  showAuthMsg("");
});

signupTabBtn.addEventListener("click", () => {
  signupTabBtn.classList.add("active");
  loginTabBtn.classList.remove("active");
  signupForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  showAuthMsg("");
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  showAuthMsg("Logging in...");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    showAuthMsg(error.message, "error");
    return;
  }

  showAuthMsg("");
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  showAuthMsg("Creating account...");

  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  const { error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    showAuthMsg(error.message, "error");
    return;
  }

  showAuthMsg("Account created! Check your email to confirm, then log in.", "success");
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

function showApp(user) {
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  userEmailEl.textContent = user.email;
  // Reset to loading state each time the app is shown (e.g. fresh login)
  document.getElementById("appLoading").classList.remove("hidden");
  document.getElementById("appContent").classList.add("hidden");
}

function showAuth() {
  appView.classList.add("hidden");
  authView.classList.remove("hidden");
  loginForm.reset();
  signupForm.reset();
  showAuthMsg("");
}

// React to login/logout/session changes
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (session && session.user) {
    showApp(session.user);
    if (typeof loadTransactions === "function") {
      loadTransactions();
    }
  } else {
    showAuth();
  }
});

// Check current session on page load
supabaseClient.auth.getSession().then(({ data: { session } }) => {
  if (session && session.user) {
    showApp(session.user);
  } else {
    showAuth();
  }
});