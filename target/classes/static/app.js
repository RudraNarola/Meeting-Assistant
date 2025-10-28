const base = window.location.origin;

function el(id) {
  return document.getElementById(id);
}

el("btn-register").addEventListener("click", async () => {
  const username = el("reg-username").value;
  const password = el("reg-password").value;
  const role = el("reg-role").value;
  const resEl = el("reg-result");
  try {
    const res = await fetch(base + "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    const text = await res.text();
    resEl.textContent = `${res.status}: ${text}`;
  } catch (e) {
    resEl.textContent = "Error: " + e.message;
  }
});

el("btn-login").addEventListener("click", async () => {
  const username = el("login-username").value;
  const password = el("login-password").value;
  const resEl = el("login-result");
  try {
    const res = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      resEl.textContent = `HTTP ${res.status}`;
      return;
    }
    const j = await res.json();
    localStorage.setItem("jwt", j.token);
    resEl.textContent = "Login OK";
    showMeSection();
  } catch (e) {
    resEl.textContent = "Error: " + e.message;
  }
});

el("btn-me").addEventListener("click", async () => {
  const token = localStorage.getItem("jwt");
  const pre = el("me-data");
  if (!token) {
    pre.textContent = "not logged in";
    return;
  }
  try {
    const res = await fetch(base + "/api/users/me", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) {
      pre.textContent = `HTTP ${res.status}`;
      return;
    }
    const j = await res.json();
    pre.textContent = JSON.stringify(j, null, 2);
  } catch (e) {
    pre.textContent = "Error: " + e.message;
  }
});

el("btn-logout").addEventListener("click", () => {
  localStorage.removeItem("jwt");
  hideMeSection();
});

function showMeSection() {
  el("me-section").style.display = "block";
}
function hideMeSection() {
  el("me-section").style.display = "none";
}

// if logged in already, show
if (localStorage.getItem("jwt")) showMeSection();
