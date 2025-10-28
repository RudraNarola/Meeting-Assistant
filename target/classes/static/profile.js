function el(id){ return document.getElementById(id); }
async function loadMe(){
  const token = localStorage.getItem('jwt');
  const pre = el('me-data');
  if (!token) { pre.textContent = 'not logged in'; return }
  try{
    const res = await fetch('/api/users/me', {headers: { Authorization: 'Bearer '+token }});
    if (!res.ok) { pre.textContent = `HTTP ${res.status}: ${await res.text()}`; return }
    const j = await res.json();
    pre.textContent = JSON.stringify(j, null, 2);
  }catch(e){ pre.textContent = 'Error: '+e.message }
}

el('btn-me').addEventListener('click', loadMe);
el('btn-logout').addEventListener('click', ()=>{ localStorage.removeItem('jwt'); window.location.href = '/'; });
loadMe();
