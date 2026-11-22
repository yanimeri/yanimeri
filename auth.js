// Yanimeri authentication and per-user cloud data.
const SUPABASE_URL = "https://bopigakyjtzjxyhblkyu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_a1EkQIECCJPQFMKYTTWaxw_--2kidED";
const yanimeriSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
window.yanimeriSupabase = yanimeriSupabase;
window.yanimeriUser = null;

function authMessage(message, isError = false) {
  const el = document.getElementById("authMessage");
  if (el) { el.textContent = message; el.dataset.error = isError ? "true" : "false"; }
}
function showAuth() {
  document.getElementById("authOverlay").hidden = false;
  document.querySelector(".app-shell").hidden = true;
}
function showApp() {
  document.getElementById("authOverlay").hidden = true;
  document.querySelector(".app-shell").hidden = false;
}
async function loadCloudData(user) {
  const { data, error } = await yanimeriSupabase.from("user_data").select("data").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!data?.data) {
    for (const key of ["yanimeri_anime","yanimeri_diary","yanimeri_profile","yanimeri_ideas","yanimeri_companion","yanimeri_demo_account"]) localStorage.removeItem(key);
    return;
  }
  const values = data.data;
  const map = {
    yanimeri_anime: values.anime,
    yanimeri_diary: values.diary,
    yanimeri_profile: values.profile,
    yanimeri_ideas: values.ideas,
    yanimeri_companion: values.companion,
    yanimeri_demo_account: values.account
  };
  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined && value !== null) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  }
}
window.yanimeriAuthReady = (async () => {
  const { data: { session }, error } = await yanimeriSupabase.auth.getSession();
  if (error) { showAuth(); authMessage(error.message, true); return false; }
  if (!session) { showAuth(); return false; }
  window.yanimeriUser = session.user;
  try { await loadCloudData(session.user); }
  catch (e) { console.error("Could not load Yanimeri cloud data:", e); }
  showApp();
  return true;
})();

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("authForm");
  if (!form) return;
  let mode = "signin";
  const title = document.getElementById("authTitle");
  const submit = document.getElementById("authSubmit");
  const toggle = document.getElementById("authToggle");
  const nameWrap = document.getElementById("authNameWrap");
  const usernameWrap = document.getElementById("authUsernameWrap");
  const usernameInput = document.getElementById("authUsername");
  const identifierLabel = document.getElementById("authIdentifierLabel");
  const identifierInput = document.getElementById("authEmail");
  if (toggle) toggle.addEventListener("click", () => {
    mode = mode === "signin" ? "signup" : "signin";
    title.textContent = mode === "signin" ? "Welcome back ♡" : "Create your account ♡";
    submit.textContent = mode === "signin" ? "Log in" : "Create account";
    toggle.textContent = mode === "signin" ? "New here? Create an account" : "Already have an account? Log in";
    nameWrap.hidden = mode === "signin";
    usernameWrap.hidden = mode === "signin";
    identifierLabel.firstChild.textContent = mode === "signin" ? "Email or username" : "Email address";
    identifierInput.placeholder = mode === "signin" ? "you@example.com or your_username" : "you@example.com";
    identifierInput.autocomplete = mode === "signin" ? "username" : "email";
    document.getElementById("authName").required = mode === "signup";
    usernameInput.required = mode === "signup";
    document.getElementById("authPassword").autocomplete = mode === "signin" ? "current-password" : "new-password";
    authMessage("");
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const identifier = document.getElementById("authEmail").value.trim();
    const email = identifier;
    const password = document.getElementById("authPassword").value;
    const name = document.getElementById("authName").value.trim();
    const username = usernameInput.value.trim().replace(/^@/,"").toLowerCase();
    submit.disabled = true;
    authMessage(mode === "signin" ? "Logging you in…" : "Creating your account…");
    try {
      if (mode === "signup") {
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) throw new Error("Please enter a valid email address.");
        if (!name) throw new Error("Please enter a display name.");
        if (!/^[a-z0-9_]{3,20}$/.test(username)) throw new Error("Username must be 3–20 characters: letters, numbers or underscores.");
        const { data, error } = await yanimeriSupabase.auth.signUp({
          email, password, options: { data: { display_name: name, username } }
        });
        if (error) throw error;
        if (!data.session) {
          authMessage("Account created! Check your email to confirm it, then log in. Your username is reserved for your account.");
          return;
        }
      } else {
        if (identifier.includes("@")) {
          const { error } = await yanimeriSupabase.auth.signInWithPassword({ email: identifier, password });
          if (error) throw error;
        } else {
          const { data, error } = await yanimeriSupabase.functions.invoke("login-with-username", { body: { username: identifier.replace(/^@/, "").toLowerCase(), password } });
          if (error) throw error;
          if (!data?.access_token || !data?.refresh_token) throw new Error("Could not log in. Check your username and password.");
          const { error: sessionError } = await yanimeriSupabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
          if (sessionError) throw sessionError;
        }
      }
      window.location.reload();
    } catch (e) { authMessage(e.message || "Something went wrong. Please try again.", true); }
    finally { submit.disabled = false; }
  });
});
