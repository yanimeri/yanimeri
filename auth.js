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

function friendlyAuthError(error, mode) {
  const message = String(error?.message || error || "").toLowerCase();
  if (/failed to fetch|network|load failed|offline|fetch error/.test(message)) {
    return "Connection problem! Please try again.";
  }
  if (/password.*(at least|minimum|too short)|weak password|password should be/.test(message)) {
    return "Your password needs to be at least 6 characters.";
  }
  if (/username.*(already|taken|exist)|duplicate key|unique constraint/.test(message)) {
    return "That username is already taken. Try another one!";
  }
  if (/user not found|no user|account.*not found|email.*not found/.test(message)) {
    return "We couldn't find an account with those details.";
  }
  if (/invalid login credentials|invalid.*(password|credentials)|incorrect password/.test(message)) {
    return mode === "signin"
      ? "Oops! Those login details don't seem right. Check your email/username and password. ♡"
      : "We couldn't create your account. Please check your details and try again.";
  }
  if (/already registered|already exists|user already/.test(message)) {
    return "An account with that email already exists. Try logging in instead.";
  }
  if (/rate limit|too many requests/.test(message)) {
    return "Too many attempts. Please wait a little and try again.";
  }
  return mode === "signin"
    ? "Something went wrong while logging you in. Please try again."
    : "Something went wrong while creating your account. Please try again.";
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
  if (error) { showAuth(); authMessage("Connection problem! Please try again.", true); return false; }
  if (!session) { showAuth(); return false; }
  window.yanimeriUser = session.user;
  try { await loadCloudData(session.user); }
  catch (e) { console.error("Could not load Yanimeri cloud data:", e); }
  showApp();
  return true;
})();

function initYanimeriAuthForm() {
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
  // Ensure sign-in starts with signup-only fields hidden.
  nameWrap.hidden = true;
  usernameWrap.hidden = true;
  nameWrap.style.display = "none";
  usernameWrap.style.display = "none";
  document.getElementById("authName").required = false;
  usernameInput.required = false;
  if (toggle) toggle.addEventListener("click", () => {
    mode = mode === "signin" ? "signup" : "signin";
    title.textContent = mode === "signin" ? "Welcome back ♡" : "Create your account ♡";
    submit.textContent = mode === "signin" ? "Log in" : "Create account";
    toggle.textContent = mode === "signin" ? "New here? Create an account" : "Already have an account? Log in";
    nameWrap.hidden = mode === "signin";
    usernameWrap.hidden = mode === "signin";
    nameWrap.style.display = mode === "signup" ? "block" : "none";
    usernameWrap.style.display = mode === "signup" ? "block" : "none";
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
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address.");
        if (password.length < 6) throw new Error("Your password needs to be at least 6 characters.");
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
          if (error) {
            const status = error.context?.status;
            if (status === 400 || status === 401) throw new Error("Invalid login credentials");
            throw error;
          }
          if (!data?.access_token || !data?.refresh_token) throw new Error("Invalid login credentials");
          const { error: sessionError } = await yanimeriSupabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
          if (sessionError) throw sessionError;
        }
      }
      window.location.reload();
    } catch (e) {
      const raw = String(e?.message || e || "").toLowerCase();
      if (raw.includes("please enter a valid email")) authMessage("Please enter a valid email address.", true);
      else if (raw.includes("display name")) authMessage("Please enter a display name.", true);
      else if (raw.includes("username must")) authMessage("Your username must be 3–20 characters: letters, numbers or underscores.", true);
      else authMessage(friendlyAuthError(e, mode), true);
    }
    finally { submit.disabled = false; }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initYanimeriAuthForm, { once: true });
} else {
  initYanimeriAuthForm();
}
