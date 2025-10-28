function el(id){ return document.getElementById(id); }
el('btn-login').addEventListener('click', async ()=>{
  const username = el('login-username').value;
  const password = el('login-password').value;
  const resEl = el('login-result');
  try{
    const res = await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
    if (!res.ok) { resEl.textContent = `HTTP ${res.status}: ${await res.text()}`; return }
    const j = await res.json();
    localStorage.setItem('jwt', j.token);
    resEl.textContent = 'Login OK';
    window.location.href = '/profile.html';
  }catch(e){ resEl.textContent = 'Error: '+e.message }
});
