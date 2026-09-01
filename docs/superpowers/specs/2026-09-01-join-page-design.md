# Join Page Design Spec

**Date:** 2026-09-01  
**Feature:** `join.html` — shareable team registration landing page

---

## Goal

A single shareable URL (`heroesseniorsoftball.com/join.html`) that coaches and admins can post in team group chats. The page smart-detects auth state and shows the right experience to each visitor without them having to navigate the main site.

---

## Auth States

The page renders one of three states based on Supabase session + profile data:

### State 1: New visitor (no session)
**Who:** Anyone without a Supabase session (never signed up, or signed out).

**Content:**
- Heading: "Join Heroes Senior Softball ⚾"
- Subtext: "Fill out the form below — a team admin will review and approve your account."
- Inline registration form: Full Name, Email, "I Am A…" role dropdown (Player/Coach/Manager), Password
- Submit button: "Request Access"
- After submit: card swaps to "Request Submitted!" confirmation with player name and pending-approval message (same copy as existing modal flow); admin notification fires automatically via `notify-new-registration` edge function

### State 2: Pending approval (session exists, `approved: false`)
**Who:** Players who registered but haven't been approved yet.

**Content:**
- Heading: "You're on the list, [First Name]! ⚾"
- Subtext: "Your account is pending approval. A team admin will review it shortly — hang tight!"
- Button: "Back to Heroes" → `index.html`

### State 3: Active member (session exists, `approved: true`)
**Who:** Fully approved players and admins who follow the link.

**Content:**
- Heading: "Welcome back, [First Name]! ⚾"
- Subtext: "You're all set — head to the player portal."
- Button: "Go to My Portal →" → `index.html`
- Small "Not you? Sign out" link → calls `auth.signOut()` then reloads page (returns to State 1)

---

## Architecture

**File:** `join.html` (prod repo root, same level as `index.html`)

**Dependencies (already exist, no new files):**
- `assets/js/data.js` — provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `_getClient()`
- `assets/js/auth.js` — provides `HeroesAuth` object with `submitRegister()`, `_renderRegisterForm()`

**Layout:** Full-viewport dark background (`#1a1a1a`), single centered card (max-width 480px), Heroes logo at top of card, content in body, `heroesseniorsoftball.com` footer link at bottom. No site nav, no mobile menu, no stats.

**Auth detection flow:**
```
DOMContentLoaded
  → _getClient().auth.getSession()
  → no session? → render State 1 (registration form)
  → session exists?
      → fetch profiles WHERE id = user.id
      → approved: false → render State 2 (pending)
      → approved: true  → render State 3 (welcome back)
```

**Registration submission:**
- Inline form fields feed into `HeroesAuth.submitRegister()` — no new form handling code
- `HeroesAuth` already handles: validation, Supabase signUp, notify-new-registration fetch, "Request Submitted!" confirmation
- The `#auth-modal-inner` div used by `auth.js` is replaced by `#join-content` — auth.js targets `document.getElementById('auth-modal-inner')`, so `join.html` must include a hidden `#auth-modal-inner` div that auth.js can write into; the page renders it visibly instead of as a modal overlay

**Styling:** Inline `<style>` block using Heroes palette:
- Background: `#111`
- Card: `#fff` with `border-radius: 16px`
- Primary color: `#C8102E`
- Font: system-ui / Arial stack (matches rest of site)
- Fully responsive, works at 375px mobile

---

## Out of Scope

- No nav bar or mobile hamburger menu
- No stats, schedule, or other site content
- No new Edge Functions or database changes
- No changes to `index.html` or `auth.js`
- No redirect after registration (confirmation shown inline)

---

## Files Touched

| File | Action |
|------|--------|
| `join.html` | **Create** (prod repo root) |
| `Heroes-staging/join.html` | **Copy** (staging repo) |

No other files modified.
