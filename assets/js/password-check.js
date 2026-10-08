/* ============================================================
   HEROES — PASSWORD CHECK
   Shared rules for every place a password is set:
     • minimum length
     • not found in a known data breach (HaveIBeenPwned Pwned Passwords)

   The breach lookup uses k-anonymity: only the first 5 characters of the
   password's SHA-1 hash are sent; the password itself never leaves the browser.
   If the lookup fails (offline, API down) the password is allowed — this
   check should never lock people out.

   Usage:  const err = await HeroesPassword.check(pw);
           if (err) { errEl.textContent = err; return; }
   ============================================================ */
window.HeroesPassword = (function () {
  'use strict';

  const MIN_LENGTH = 8;

  async function sha1Hex(text) {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  async function isPwned(pw) {
    const hash   = await sha1Hex(pw);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' },
        signal: ctrl.signal,
      });
      if (!res.ok) return false;
      const body = await res.text();
      // Each line is "SUFFIX:COUNT"; padding entries have a count of 0.
      return body.split('\n').some(line => {
        const [s, count] = line.trim().split(':');
        return s === suffix && parseInt(count, 10) > 0;
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async function check(pw) {
    if (!pw || pw.length < MIN_LENGTH) {
      return `Password must be at least ${MIN_LENGTH} characters.`;
    }
    try {
      if (await isPwned(pw)) {
        return 'That password has appeared in a known data breach. Please choose a different one.';
      }
    } catch (e) {
      console.warn('[HeroesPassword] breach check skipped:', e);
    }
    return null;
  }

  return { MIN_LENGTH, check };
})();
