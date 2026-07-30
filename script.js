/**
 * MindScore — script.js
 * Communicates with the FastAPI backend at API_BASE_URL.
 * Change only this one constant to point to your server.
 */

// ─── Configuration ─────────────────────────────────────────────────────────
const API_BASE_URL = "https://mental-health-score-9ium.onrender.com";

// ─── DOM References ─────────────────────────────────────────────────────────
const navbar       = document.getElementById("navbar");
const hamburger    = document.getElementById("hamburger");
const navLinks     = document.querySelector(".nav-links");
const navLinkItems = document.querySelectorAll(".nav-link");

const predictForm  = document.getElementById("predict-form");
const predictBtn   = document.getElementById("predict-btn");
const btnLabel     = predictBtn.querySelector(".btn-label");
const btnSpinner   = document.getElementById("btn-spinner");
const resetBtn     = document.getElementById("reset-btn");
const retakeBtn    = document.getElementById("retake-btn");

const resultSection = document.getElementById("result-section");
const resultCard    = document.getElementById("result-card");
const ringFill      = document.getElementById("ring-fill");

const resultScore       = document.getElementById("result-score");
const resultScoreDisplay = document.getElementById("result-score-display");
const resultRisk        = document.getElementById("result-risk");
const resultBadge       = document.getElementById("result-badge");
const resultAssessment  = document.getElementById("result-assessment");
const resultMessage     = document.getElementById("result-message");

const errorBanner = document.getElementById("error-banner");
const errorText   = document.getElementById("error-text");
const errorClose  = document.getElementById("error-close");

// ─── State ──────────────────────────────────────────────────────────────────
let isSubmitting = false;   // Prevent duplicate submissions

// ─── Navbar: scroll shadow ───────────────────────────────────────────────────
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 10);
});

// ─── Navbar: hamburger toggle (mobile) ──────────────────────────────────────
hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("open");
  navLinks.classList.toggle("open");
});

// ─── Navbar: active link on scroll ──────────────────────────────────────────
const sections = document.querySelectorAll("section.page");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinkItems.forEach((link) => {
          link.classList.toggle("active", link.dataset.section === id);
        });
      }
    });
  },
  { threshold: 0.4 }
);
sections.forEach((s) => observer.observe(s));

// ─── Smooth close hamburger when nav link clicked ───────────────────────────
navLinkItems.forEach((link) => {
  link.addEventListener("click", () => {
    hamburger.classList.remove("open");
    navLinks.classList.remove("open");
  });
});

// ─── Hero CTA button → scroll to predict ────────────────────────────────────
document.getElementById("hero-cta").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("predict").scrollIntoView({ behavior: "smooth" });
});

// ═══════════════════ VALIDATION ═══════════════════════════════════════════

/**
 * Field-level validation rules.
 * Each entry maps a field id → validator function that returns an error string
 * (or empty string if valid).
 */
const validators = {
  age: (v) => {
    const n = Number(v);
    if (!v) return "Age is required.";
    if (!Number.isInteger(n) || n < 10 || n > 100) return "Age must be a whole number between 10 and 100.";
    return "";
  },
  gender: (v) => v ? "" : "Please select a gender.",
  country: (v) => v.trim() ? "" : "Country is required.",
  academic_level: (v) => v ? "" : "Please select an academic level.",
  most_used_platform: (v) => v ? "" : "Please select a platform.",
  purpose_of_use: (v) => v ? "" : "Please select a purpose.",
  avg_daily_usage_hours: (v) => {
    const n = parseFloat(v);
    if (v === "" || v === null) return "This field is required.";
    if (isNaN(n) || n < 0 || n > 24) return "Must be between 0 and 24 hours.";
    return "";
  },
  daily_unlocks: (v) => {
    const n = Number(v);
    if (v === "" || v === null) return "This field is required.";
    if (!Number.isInteger(n) || n < 0) return "Must be a non-negative whole number.";
    return "";
  },
  study_hours: (v) => {
    const n = parseFloat(v);
    if (v === "" || v === null) return "This field is required.";
    if (isNaN(n) || n < 0 || n > 24) return "Must be between 0 and 24 hours.";
    return "";
  },
  physical_activity_hours: (v) => {
    const n = parseFloat(v);
    if (v === "" || v === null) return "This field is required.";
    if (isNaN(n) || n < 0 || n > 24) return "Must be between 0 and 24 hours.";
    return "";
  },
  sleep_hours_per_night: (v) => {
    const n = parseFloat(v);
    if (v === "" || v === null) return "This field is required.";
    if (isNaN(n) || n < 0 || n > 24) return "Must be between 0 and 24 hours.";
    return "";
  },
  stress_level: (v) => v ? "" : "Please select a stress level.",
};

/**
 * Validate a single field.
 * @param {string} fieldId  - The input element's id (matches validators key)
 * @returns {boolean}       - true if valid
 */
function validateField(fieldId) {
  const input = document.getElementById(fieldId);
  const errEl = document.getElementById(`err-${fieldId}`);
  if (!input || !errEl || !validators[fieldId]) return true;

  const error = validators[fieldId](input.value);

  if (error) {
    errEl.textContent = error;
    input.classList.add("invalid");
    input.classList.remove("valid");
    return false;
  } else {
    errEl.textContent = "";
    input.classList.remove("invalid");
    input.classList.add("valid");
    return true;
  }
}

/**
 * Validate the entire form.
 * @returns {boolean} true if all fields pass
 */
function validateForm() {
  return Object.keys(validators).map(validateField).every(Boolean);
}

// Live validation on blur / change
Object.keys(validators).forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("blur",   () => validateField(id));
  el.addEventListener("change", () => validateField(id));
  el.addEventListener("input",  () => {
    // Only re-validate if already marked invalid (avoids premature red state)
    if (el.classList.contains("invalid")) validateField(id);
  });
});

// ═══════════════════ BUILD REQUEST BODY ═══════════════════════════════════

/**
 * Read the form and construct the JSON body that matches StudentData (Pydantic).
 * Note: backend field name is `sleepL_hours_per_night` (capital L) — intentional.
 * @returns {Object}
 */
function buildRequestBody() {
  return {
    age:                     parseInt(document.getElementById("age").value, 10),
    gender:                  document.getElementById("gender").value,
    country:                 document.getElementById("country").value.trim(),
    academic_level:          document.getElementById("academic_level").value,
    most_used_platform:      document.getElementById("most_used_platform").value,
    purpose_of_use:          document.getElementById("purpose_of_use").value,
    avg_daily_usage_hours:   parseFloat(document.getElementById("avg_daily_usage_hours").value),
    daily_unlocks:           parseInt(document.getElementById("daily_unlocks").value, 10),
    study_hours:             parseFloat(document.getElementById("study_hours").value),
    physical_activity_hours: parseFloat(document.getElementById("physical_activity_hours").value),
    sleep_hours_per_night:  parseFloat(document.getElementById("sleep_hours_per_night").value),
    stress_level:            document.getElementById("stress_level").value,
  };
}

// ═══════════════════ RESULT RENDERING ════════════════════════════════════

/**
 * Determine risk tier and UI metadata from the raw score.
 * Score range is open-ended (regression model), but we map it to tiers:
 *   ≥ 7  → Low Risk   (green)
 *   5–7  → Moderate   (amber)
 *   < 5  → High Risk  (red)
 * Adjust these thresholds to match your model's actual output range.
 */
function getRiskInfo(score) {
  if (score >= 7) {
    return {
      tier: "low",
      label: "Low Risk",
      assessment: "Healthy",
      color: "#3aab7b",
      message:
        "Your lifestyle factors suggest good mental wellbeing. Keep maintaining healthy habits — adequate sleep, physical activity, and balanced screen time all contribute positively.",
    };
  } else if (score >= 5) {
    return {
      tier: "medium",
      label: "Moderate Risk",
      assessment: "At Risk",
      color: "#e8a838",
      message:
        "Some areas of your lifestyle may be affecting your mental health. Consider reviewing your sleep schedule, study-life balance, or social media usage. Talking to a counsellor can also help.",
    };
  } else {
    return {
      tier: "high",
      label: "High Risk",
      assessment: "At Risk",
      color: "#d95b5b",
      message:
        "Your current lifestyle profile indicates elevated mental health risk. Please consider reaching out to a mental health professional or counsellor at your institution as soon as possible.",
    };
  }
}

/**
 * Animate the SVG ring to reflect the given score.
 * The ring circumference is 2π×50 ≈ 314.
 * We map score 0–10 to 0–100% of the ring.
 * @param {number} score
 * @param {string} color
 */
function animateRing(score, color) {
  const circumference = 314;
  const clampedScore  = Math.min(Math.max(score, 0), 10);
  const fillRatio     = clampedScore / 10;
  const offset        = circumference - fillRatio * circumference;

  ringFill.style.stroke            = color;
  ringFill.style.strokeDashoffset  = offset;
}

/**
 * Animate the numeric score counter from 0 → target.
 * @param {number} target
 */
function animateCounter(target) {
  const duration = 1200;   // ms
  const startTime = performance.now();

  function step(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased    = 1 - Math.pow(1 - progress, 3);
    const current  = (target * eased).toFixed(2);

    resultScore.textContent        = current;
    resultScoreDisplay.textContent = current;

    if (progress < 1) requestAnimationFrame(step);
    else {
      resultScore.textContent        = target.toFixed(2);
      resultScoreDisplay.textContent = target.toFixed(2);
    }
  }
  requestAnimationFrame(step);
}

/**
 * Render the result card with data from the API response.
 * @param {number} score  - predicted_mental_health_score from backend
 */
function renderResult(score) {
  const risk = getRiskInfo(score);

  // Badge classes
  resultBadge.className = `result-badge ${risk.tier}`;
  resultRisk.textContent = risk.label;
  document.getElementById("result-risk-display").textContent = risk.label;

  // Row values
  resultAssessment.textContent = risk.assessment;
  resultMessage.textContent    = risk.message;

  // Animate ring + counter
  animateRing(score, risk.color);
  animateCounter(score);

  // Show result section
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ═══════════════════ API CALL ════════════════════════════════════════════

/**
 * POST to /predict with the form data.
 * Shows loading state, handles errors, renders result.
 */
async function submitPrediction() {
  if (isSubmitting) return;

  // 1. Validate
  if (!validateForm()) {
    // Scroll to first invalid field
    const firstInvalid = predictForm.querySelector(".invalid");
    if (firstInvalid) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  // 2. Set loading state
  isSubmitting = true;
  predictBtn.disabled    = true;
  btnLabel.textContent   = "Predicting…";
  btnSpinner.hidden      = false;
  hideError();
  resultSection.hidden   = true;

  // 3. Build body
  const body = buildRequestBody();

  try {
    // 4. Fetch
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // 5. Parse response
    const data = await response.json();

    if (!response.ok) {
      // FastAPI validation errors have `detail` array
      const detail = data.detail;
      if (Array.isArray(detail)) {
        // Map Pydantic errors back to field-level messages
        detail.forEach((err) => {
          const loc   = err.loc;                    // e.g. ["body","age"]
          const field = loc[loc.length - 1];        // last segment = field name
          const errEl = document.getElementById(`err-${field}`);
          const input = document.getElementById(field);
          if (errEl) errEl.textContent = err.msg;
          if (input) {
            input.classList.add("invalid");
            input.classList.remove("valid");
          }
        });
        showError("Please fix the highlighted fields and try again.");
      } else {
        const msg = typeof detail === "string" ? detail : JSON.stringify(detail);
        showError(`Server error (${response.status}): ${msg}`);
      }
      return;
    }

    // 6. Render result
    const score = data.predicted_mental_health_score;
    renderResult(score);

  } catch (err) {
    // Network / CORS / JSON parse errors.
    // err.message can be empty string in Firefox/Safari for blocked CORS requests,
    // so we always provide a meaningful fallback.
    const isNetworkError =
      err instanceof TypeError &&
      (err.message === "" ||
        err.message.toLowerCase().includes("fetch") ||
        err.message.toLowerCase().includes("network") ||
        err.message.toLowerCase().includes("failed"));

    if (isNetworkError || err.message === "") {
      showError(
        `Cannot reach the server at ${API_BASE_URL}. ` +
        `Make sure your FastAPI backend is running (uvicorn main:app --reload) ` +
        `and that CORS is enabled for all origins.`
      );
    } else if (err instanceof SyntaxError) {
      showError(
        "The server returned an unexpected response (not valid JSON). " +
        "Check that the backend is running correctly."
      );
    } else {
      showError(
        `Unexpected error: ${err.message || "Unknown error — check the browser console for details."}`
      );
    }
  } finally {
    // 7. Reset loading state
    isSubmitting          = false;
    predictBtn.disabled   = false;
    btnLabel.textContent  = "Predict My Score";
    btnSpinner.hidden     = true;
  }
}

// ═══════════════════ ERROR HELPERS ═══════════════════════════════════════

/** Show the error banner with a given message. */
function showError(message) {
  // Guard: never show a blank banner — substitute a clear fallback.
  errorText.textContent =
    message && message.trim()
      ? message
      : `Could not connect to the server at ${API_BASE_URL}. ` +
        "Please make sure the FastAPI backend is running and try again.";
  errorBanner.style.display = "flex"; errorBanner.removeAttribute("hidden");
  errorBanner.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** Hide the error banner. */
function hideError() {
  errorBanner.style.display = "none"; errorBanner.setAttribute("hidden", "");
  errorText.textContent = "";
}

// ═══════════════════ FORM RESET ══════════════════════════════════════════

/** Reset the form and all UI state. */
function resetForm() {
  predictForm.reset();

  // Clear all validation classes and error messages
  Object.keys(validators).forEach((id) => {
    const input = document.getElementById(id);
    const errEl = document.getElementById(`err-${id}`);
    if (input) { input.classList.remove("invalid", "valid"); }
    if (errEl) { errEl.textContent = ""; }
  });

  // Hide results and errors
  resultSection.hidden = true;
  hideError();

  // Reset ring
  ringFill.style.strokeDashoffset = 314;
  resultScore.textContent = "--";
}

// ═══════════════════ EVENT LISTENERS ════════════════════════════════════

// Form submit (keyboard Enter or button click)
predictForm.addEventListener("submit", (e) => {
  e.preventDefault();
  submitPrediction();
});

// Explicit Predict button click (in case button is type="submit")
predictBtn.addEventListener("click", (e) => {
  e.preventDefault();
  submitPrediction();
});

// Reset button
resetBtn.addEventListener("click", () => {
  resetForm();
  predictForm.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Retake button (inside result card)
retakeBtn.addEventListener("click", () => {
  resetForm();
  predictForm.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Dismiss error banner
errorClose.addEventListener("click", hideError);
