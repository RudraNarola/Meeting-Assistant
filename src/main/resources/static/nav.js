// nav.js -- simple navigation bar that changes based on authentication state
(function () {
  function mk(link, text, id) {
    return `<a href="${link}"${id ? ` id="${id}"` : ""}>${text}</a>`;
  }

  const nav = document.getElementById("nav");
  if (!nav) return;
  nav.className = "main-nav";
  const token = localStorage.getItem("jwt");
  const left = document.createElement("div");
  left.className = "nav-left";
  left.innerHTML = `<a class="brand" href="/">Meeting Assistant</a>`;
  const right = document.createElement("div");
  right.className = "nav-right";

  // helper to render the basic auth links (without username yet)
  function renderBasicLinks(authenticated) {
    if (authenticated) {
      right.innerHTML = mk("/", "Home") + mk("/profile.html", "Profile") + mk("#", "Logout", "nav-logout");
    } else {
      right.innerHTML = mk("/", "Home") + mk("/register.html", "Register") + mk("/login.html", "Login");
    }
  }

  renderBasicLinks(!!token);
  nav.appendChild(left);
  nav.appendChild(right);

  // hide the home page register/login card when authenticated
  try {
    const homeAuth = document.getElementById('home-auth');
    if (homeAuth) {
      if (token) homeAuth.style.display = 'none';
      else homeAuth.style.display = '';
    }
  } catch (e) { /* ignore */ }

  // if authenticated, try to fetch /api/users/me to get the username and display it
  if (token) {
    fetch('/api/users/me', { headers: { Authorization: 'Bearer ' + token } })
      .then(async (res) => {
        if (!res.ok) {
          // token may be invalid/expired — clear and re-render as logged out
          localStorage.removeItem('jwt');
          renderBasicLinks(false);
          attachLogout();
          return;
        }
        const j = await res.json();
        // prepend username display before the Profile link
        const usernameEl = document.createElement('span');
        usernameEl.className = 'nav-username';
        usernameEl.textContent = j.username || '';
        // insert username element into right side at the beginning
        right.insertBefore(usernameEl, right.firstChild);
        attachLogout();
      })
      .catch((err) => {
        // network error — leave basic links; ensure logout handler present
        console.warn('nav: could not fetch /api/users/me', err);
        attachLogout();
      });
  } else {
    attachLogout();
  }

  function attachLogout() {
    const logout = document.getElementById('nav-logout');
    if (logout) {
      logout.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('jwt');
        window.location.href = '/';
      });
    }
  }
})();
