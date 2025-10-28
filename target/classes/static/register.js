function el(id) {
  return document.getElementById(id);
}
el("btn-register").addEventListener("click", async () => {
  const username = el("reg-username").value;
  const password = el("reg-password").value;
  const role = el("reg-role").value;
  const resEl = el("reg-result");
  try {
    const res = await fetch("/api/auth/register", {
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
