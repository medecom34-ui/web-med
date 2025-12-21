
window.API_BASE = "https://web-med-production.up.railway.app";

window.apiFetch = function(path, opts = {}) {
  const token =
    localStorage.getItem("auth_token") ||
    (() => {
      try {
        const u = JSON.parse(localStorage.getItem("auth_user") || "null");
        return u && u.token ? u.token : null;
      } catch {
        return null;
      }
    })();

  const url = path.startsWith("http")
    ? path
    : window.API_BASE + path;

  opts.headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  if (token) {
    opts.headers.Authorization = "Bearer " + token;
  }

  return fetch(url, opts).then(async (r) => {
    const txt = await r.text().catch(() => "");
    try {
      return txt ? JSON.parse(txt) : null;
    } catch {
      return { success: false, status: r.status, body: txt };
    }
  });
};
