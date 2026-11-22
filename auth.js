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
  toggle.addEventListener("click", () => {
    mode = mode === "signin" ? "signup" : "signin";
    title.textContent = mode === "signin" ? "Welcome back ♡" : "Create your account ♡";
    submit.textContent = mode === "signin" ? "Log in" : "Create account";
    toggle.textContent = mode === "signin" ? "New here? Create an account" : "Already have an account? Log in";
    nameWrap.hidden = mode === "signin";
    authMessage("");
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const name = document.getElementById("authName").value.trim();
    submit.disabled = true;
    authMessage(mode === "signin" ? "Logging you in…" : "Creating your account…");
    try {
      if (mode === "signup") {
        const { data, error } = await yanimeriSupabase.auth.signUp({
          email, password, options: { data: { display_name: name || email.split("@")[0] } }
        });
        if (error) throw error;
        if (!data.session) {
          authMessage("Account created! Check your email to confirm it, then log in.");
          return;
        }
      } else {
        const { error } = await yanimeriSupabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      window.location.reload();
    } catch (e) { authMessage(e.message || "Something went wrong. Please try again.", true); }
    finally { submit.disabled = false; }
  });
});
