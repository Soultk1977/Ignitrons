// auth.js (updated)
// Waits for DOM, logs helpful messages, and safely wires auth modal handlers.
// Requires: ./supabase.js that exports `supabase`.

import { supabase } from "./supabase.js";

console.log("auth.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  console.log("auth.js DOMContentLoaded — initializing auth UI");

  // --- small helpers ---
  const $ = (sel) => document.querySelector(sel);
  const $all = (sel) => Array.from(document.querySelectorAll(sel));

  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`openModal: element #${id} not found`);
      return;
    }
    el.classList.remove("hidden");
    el.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`closeModal: element #${id} not found`);
      return;
    }
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  // --- wire up close buttons and backdrop clicks ---
  $all(".auth-close").forEach((btn) => {
    btn.addEventListener("click", () => {
      // prefer explicit data-modal attr, otherwise close nearest modal
      const target = btn.getAttribute("data-modal") || btn.dataset.modal;
      if (target) {
        closeModal(target);
      } else {
        const modal = btn.closest(".auth-modal");
        if (modal && modal.id) closeModal(modal.id);
      }
    });
  });

  $all(".auth-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", () => {
      const modal = backdrop.closest(".auth-modal");
      if (modal && modal.id) closeModal(modal.id);
    });
  });

  // --- open buttons from Community section ---
  const openSignupBtn = document.getElementById("open-signup");
  const openLoginBtn = document.getElementById("open-login");
  const openForgotLink = document.getElementById("open-forgot");

  if (openSignupBtn) {
    openSignupBtn.addEventListener("click", () => openModal("auth-signup-modal"));
    console.log("found openSignupBtn");
  } else {
    console.warn("openSignupBtn (#open-signup) not found in DOM");
  }

  if (openLoginBtn) {
    openLoginBtn.addEventListener("click", () => openModal("auth-login-modal"));
    console.log("found openLoginBtn");
  } else {
    console.warn("openLoginBtn (#open-login) not found in DOM");
  }

  if (openForgotLink) {
    openForgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal("auth-login-modal");
      openModal("auth-forgot-modal");
    });
    console.log("found openForgotLink (#open-forgot)");
  } else {
    console.warn("openForgotLink (#open-forgot) not found in DOM");
  }

  // --- state: pending OTP action ---
  let pendingAuth = { email: null, purpose: null }; // purpose: 'signup' | 'recovery'

  // --- SIGNUP ---
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = (document.getElementById("signup-fullname") || {}).value?.trim() || "";
      const email = (document.getElementById("signup-email") || {}).value?.trim() || "";
      const password = (document.getElementById("signup-password") || {}).value || "";
      const msgEl = document.getElementById("signup-msg");
      if (msgEl) msgEl.textContent = "";

      if (!name || !email || !password) {
        if (msgEl) msgEl.textContent = "Please fill all fields.";
        return;
      }

      const btn = signupForm.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Creating account..."; }

      try {
        console.log("auth.js: signing up", email);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });

        if (error) {
          console.error("signUp error:", error);
          if (msgEl) msgEl.textContent = "Error: " + error.message;
        } else {
          // show OTP modal
          pendingAuth.email = email;
          pendingAuth.purpose = "signup";
          const otpText = document.getElementById("otp-purpose-text");
          if (otpText) otpText.textContent = `A verification code was sent to ${email}. Enter it here to complete signup.`;
          closeModal("auth-signup-modal");
          openModal("auth-otp-modal");
          console.log("signUp accepted; waiting for OTP from email");
        }
      } catch (err) {
        console.error("signUp unexpected error", err);
        if (msgEl) msgEl.textContent = "Unexpected error";
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Create account"; }
      }
    });
    console.log("signupForm wired");
  } else {
    console.warn("signupForm (#signup-form) not found");
  }

  // --- LOGIN ---
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (document.getElementById("login-email") || {}).value?.trim() || "";
      const password = (document.getElementById("login-password") || {}).value || "";
      const msgEl = document.getElementById("login-msg");
      if (msgEl) msgEl.textContent = "";

      const btn = loginForm.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Signing in..."; }

      try {
        console.log("auth.js: signing in", email);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("signIn error:", error);
          if (msgEl) msgEl.textContent = "Invalid credentials or error: " + error.message;
        } else {
          if (msgEl) msgEl.textContent = "Signed in successfully!";
          closeModal("auth-login-modal");
          console.log("Signed in session:", data);
          // Optionally: update UI here for signed-in state
        }
      } catch (err) {
        console.error("signIn unexpected error", err);
        if (msgEl) msgEl.textContent = "Unexpected error";
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Sign in"; }
      }
    });
    console.log("loginForm wired");
  } else {
    console.warn("loginForm (#login-form) not found");
  }

  // --- FORGOT (request reset) ---
  const forgotForm = document.getElementById("forgot-form");
  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (document.getElementById("forgot-email") || {}).value?.trim() || "";
      const msgEl = document.getElementById("forgot-msg");
      if (msgEl) msgEl.textContent = "";

      const btn = forgotForm.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }

      try {
        console.log("auth.js: request password reset for", email);
        const { data, error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) {
          console.error("resetPasswordForEmail error:", error);
          if (msgEl) msgEl.textContent = "Error: " + error.message;
        } else {
          pendingAuth.email = email;
          pendingAuth.purpose = "recovery";
          const otpText = document.getElementById("otp-purpose-text");
          if (otpText) otpText.textContent = `A password recovery code was sent to ${email}. Enter it here and set a new password.`;
          const newPassCont = document.getElementById("otp-newpass-container");
          if (newPassCont) newPassCont.style.display = "block";
          closeModal("auth-forgot-modal");
          openModal("auth-otp-modal");
          console.log("Password reset email requested; waiting for OTP");
        }
      } catch (err) {
        console.error("resetPasswordForEmail unexpected error", err);
        if (msgEl) msgEl.textContent = "Unexpected error";
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Send reset code"; }
      }
    });
    console.log("forgotForm wired");
  } else {
    console.warn("forgotForm (#forgot-form) not found");
  }

  // --- OTP verify (signup or recovery) ---
  const otpForm = document.getElementById("otp-form");
  if (otpForm) {
    otpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = (document.getElementById("otp-code") || {}).value?.trim() || "";
      const msgEl = document.getElementById("otp-msg");
      if (msgEl) msgEl.textContent = "";

      if (!pendingAuth.email || !pendingAuth.purpose) {
        if (msgEl) msgEl.textContent = "No pending action. Start over.";
        return;
      }
      if (!token) {
        if (msgEl) msgEl.textContent = "Enter the 6-digit code you received via email.";
        return;
      }

      const btn = otpForm.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Verifying..."; }

      try {
        const type = pendingAuth.purpose === "signup" ? "email" : "recovery";
        console.log("auth.js: verifying otp for", pendingAuth.email, "type:", type);
        const { data, error } = await supabase.auth.verifyOtp({
          email: pendingAuth.email,
          token,
          type
        });

        if (error) {
          console.error("verifyOtp error:", error);
          if (msgEl) msgEl.textContent = "Verification failed: " + error.message;
        } else {
          // If recovery, update the password now
          if (pendingAuth.purpose === "recovery") {
            const newPass = (document.getElementById("otp-new-password") || {}).value || "";
            if (!newPass || newPass.length < 8) {
              if (msgEl) msgEl.textContent = "Enter a new password (min 8 chars) to complete recovery.";
              if (btn) { btn.disabled = false; btn.textContent = "Verify"; }
              return;
            }
            const { data: upd, error: updErr } = await supabase.auth.updateUser({ password: newPass });
            if (updErr) {
              console.error("updateUser error:", updErr);
              if (msgEl) msgEl.textContent = "Could not set new password: " + updErr.message;
              if (btn) { btn.disabled = false; btn.textContent = "Verify"; }
              return;
            }
            console.log("Password updated for", pendingAuth.email);
          }

          if (msgEl) msgEl.textContent = "Success — your account is confirmed.";
          closeModal("auth-otp-modal");
          pendingAuth = { email: null, purpose: null };
          console.log("OTP verified successfully");
        }
      } catch (err) {
        console.error("verifyOtp unexpected error", err);
        if (msgEl) msgEl.textContent = "Unexpected error";
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Verify"; }
      }
    });
    console.log("otpForm wired");
  } else {
    console.warn("otpForm (#otp-form) not found");
  }

  // --- auth state listener (optional, helpful) ---
  try {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log("auth event:", event, "session:", session);
      // You can update UI here in future (show username, logout, etc.)
    });
    console.log("supabase auth listener attached");
  } catch (err) {
    console.warn("Could not attach auth listener:", err);
  }

}); // end DOMContentLoaded
