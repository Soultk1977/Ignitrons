// auth.js
import { supabase } from "./supabase.js";

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

/* Modal helpers */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.setAttribute('aria-hidden','false');
  document.documentElement.style.overflow = 'hidden';
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  el.setAttribute('aria-hidden','true');
  document.documentElement.style.overflow = '';
}

/* Wire modal close buttons (common) */
$all('.auth-close').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.modal || btn.getAttribute('data-modal')));
});
$all('.auth-backdrop').forEach(b => {
  b.addEventListener('click', () => {
    const modal = b.closest('.auth-modal');
    if (modal) closeModal(modal.id);
  });
});

/* Open buttons */
const openSignupBtn = document.getElementById('open-signup');
const openLoginBtn = document.getElementById('open-login');
const openForgotLink = document.getElementById('open-forgot');

if (openSignupBtn) openSignupBtn.addEventListener('click', () => openModal('auth-signup-modal'));
if (openLoginBtn) openLoginBtn.addEventListener('click', () => openModal('auth-login-modal'));
if (openForgotLink) openForgotLink.addEventListener('click', (e) => { e.preventDefault(); closeModal('auth-login-modal'); openModal('auth-forgot-modal'); });

/* State while waiting for OTP */
let pendingAuth = { email: null, purpose: null }; // purpose: 'signup' | 'recovery'

/* SIGNUP */
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-fullname').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    const msgEl = document.getElementById('signup-msg');
    msgEl.textContent = '';

    if (!name || !email || !password) {
      msgEl.textContent = 'Please fill all fields.';
      return;
    }

    // Disable submit
    const btn = signupForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Creating account...';

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } } // store name in user metadata
      });

      if (error) {
        msgEl.textContent = 'Error: ' + error.message;
      } else {
        // Supabase will send a verification message (by default link; if you use token in template,
        // it will contain a token the user can enter). We ask user to check email for code.
        pendingAuth.email = email;
        pendingAuth.purpose = 'signup';
        document.getElementById('otp-purpose-text').textContent = `A verification code was sent to ${email}. Enter it here to complete signup.`;
        closeModal('auth-signup-modal');
        openModal('auth-otp-modal');
      }
    } catch (err) {
      msgEl.textContent = 'Unexpected error';
      console.error(err);
    } finally {
      btn.disabled = false; btn.textContent = 'Create account';
    }
  });
}

/* LOGIN */
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const msgEl = document.getElementById('login-msg');
    msgEl.textContent = '';

    const btn = loginForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Signing in...';

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        msgEl.textContent = 'Invalid credentials or error: ' + error.message;
      } else {
        // logged in
        msgEl.textContent = 'Signed in successfully!';
        closeModal('auth-login-modal');
        // TODO: update UI to show logged-in state (you can show user menu, etc.)
        console.log('session', data);
      }
    } catch (err) {
      console.error(err);
      msgEl.textContent = 'Unexpected error';
    } finally {
      btn.disabled = false; btn.textContent = 'Sign in';
    }
  });
}

/* FORGOT - request recovery email (OTP) */
const forgotForm = document.getElementById('forgot-form');
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const msgEl = document.getElementById('forgot-msg');
    msgEl.textContent = '';

    const btn = forgotForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending...';

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        msgEl.textContent = 'Error: ' + error.message;
      } else {
        pendingAuth.email = email;
        pendingAuth.purpose = 'recovery';
        document.getElementById('otp-purpose-text').textContent = `A password recovery code was sent to ${email}. Enter it here and set a new password.`;
        // show new password input in OTP modal
        document.getElementById('otp-newpass-container').style.display = 'block';
        closeModal('auth-forgot-modal');
        openModal('auth-otp-modal');
      }
    } catch (err) {
      console.error(err);
      msgEl.textContent = 'Unexpected error';
    } finally {
      btn.disabled = false; btn.textContent = 'Send reset code';
    }
  });
}

/* OTP verification handler (used for signup or recovery) */
const otpForm = document.getElementById('otp-form');
if (otpForm) {
  otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = document.getElementById('otp-code').value.trim();
    const msgEl = document.getElementById('otp-msg');
    msgEl.textContent = '';
    if (!pendingAuth.email || !pendingAuth.purpose) {
      msgEl.textContent = 'No pending action. Start over.';
      return;
    }
    if (!token) {
      msgEl.textContent = 'Enter the 6-digit code you received via email.';
      return;
    }

    const btn = otpForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Verifying...';

    try {
      const type = pendingAuth.purpose === 'signup' ? 'email' : 'recovery';
      const { data, error } = await supabase.auth.verifyOtp({
        email: pendingAuth.email,
        token,
        type
      });

      if (error) {
        msgEl.textContent = 'Verification failed: ' + error.message;
      } else {
        // For recovery flow, if the user provided new password input, set it
        if (pendingAuth.purpose === 'recovery') {
          const newPass = document.getElementById('otp-new-password').value;
          if (!newPass || newPass.length < 8) {
            msgEl.textContent = 'Enter a new password (min 8 chars) to complete recovery.';
            btn.disabled = false; btn.textContent = 'Verify';
            return;
          }
          const { data: upd, error: updErr } = await supabase.auth.updateUser({ password: newPass });
          if (updErr) {
            msgEl.textContent = 'Could not set new password: ' + updErr.message;
            btn.disabled = false; btn.textContent = 'Verify';
            return;
          }
        }

        // Success: user verified and (for signup) signed in automatically
        msgEl.textContent = 'Success — your account is confirmed.';
        closeModal('auth-otp-modal');
        pendingAuth = { email: null, purpose: null };
        // TODO: update UI / show user account
      }
    } catch (err) {
      console.error(err);
      msgEl.textContent = 'Unexpected error';
    } finally {
      btn.disabled = false; btn.textContent = 'Verify';
    }
  });
}

/* Optional: listen to auth state change to update UI */
supabase.auth.onAuthStateChange((event, session) => {
  console.log('auth event', event, session);
  // You can update navbar, show user info, etc.
});
