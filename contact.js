// contact.js
// This file connects your Contact form to Supabase.
// Place this file in the SAME folder as index.html and supabase.js

import { supabase } from "./supabase.js";

const form = document.querySelector("#contact-form");

if (!form) {
  alert("Contact form not found on the page. Please add id=\"contact-form\" to your <form>.");
} else {
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.querySelector("#name").value.trim();
    const email = form.querySelector("#email").value.trim();
    const message = form.querySelector("#message").value.trim();

    if (!name || !email || !message) {
      alert("Please fill all fields.");
      return;
    }

    // Disable button while sending
    const oldText = submitBtn ? submitBtn.textContent : "Sending...";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
    }

    const { error } = await supabase.from("contacts").insert([{ name, email, message }]);

    if (error) {
      alert("❌ Failed to send: " + error.message);
    } else {
      alert("✅ Message saved to database!");
      form.reset();
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = oldText;
    }
  });
}
