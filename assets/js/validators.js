// ==========================================================================
// FUD HEALTH HMS — VALIDATORS
// ==========================================================================

import { REG_NUMBER_REGEX } from "./config.js?v2";

export function isValidRegNumber(value) {
  return REG_NUMBER_REGEX.test(value.trim().toUpperCase());
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isStrongPassword(value) {
  // Min 8 chars, at least one letter and one number — adjust to your policy.
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function passwordsMatch(a, b) {
  return a === b && a.length > 0;
}

/**
 * Attaches live validation to an <input>: toggles .is-valid/.is-invalid
 * and shows/hides a hint element by id.
 */
export function bindFieldValidation(inputEl, hintEl, validatorFn, invalidMessage) {
  const run = () => {
    const value = inputEl.value;
    if (value.length === 0) {
      inputEl.classList.remove("is-valid", "is-invalid");
      if (hintEl) hintEl.textContent = "";
      return false;
    }
    const valid = validatorFn(value);
    inputEl.classList.toggle("is-valid", valid);
    inputEl.classList.toggle("is-invalid", !valid);
    if (hintEl) {
      hintEl.textContent = valid ? "" : invalidMessage;
      hintEl.classList.toggle("error", !valid);
    }
    return valid;
  };
  inputEl.addEventListener("input", run);
  inputEl.addEventListener("blur", run);
  return run;
}
