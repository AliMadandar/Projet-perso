# Rivqo Design Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a reviewable first visual refresh of Rivqo's homepage and workspace on desktop and phone.
**Architecture:** Update existing presentation markup and CSS. Rebuild the standalone demo from the same sources.
**Tech Stack:** HTML, CSS, browser JavaScript, Node 24; no new product dependencies.
**Spec:** docs/superpowers/specs/2026-11-26-design-refresh.md

## Global Constraints
- Preserve financial calculations, role restrictions, API contracts and document printing.
- Preserve French/Persian, dark theme, keyboard focus and reduced motion.
- Existing project checkout is clean on branch work; use a new review branch in place, as the user requested direct changes.
- This is presentation work: use existing tests and browser checks rather than tests that assert CSS implementation details.

## Review Focus
- Phone widths from 320px: no horizontal page overflow or hidden primary actions.
- Dark mode: readable text and form controls; documents remain white.
- Quote editing: amount updates, save, modal and preview tabs still operate.
- Links and Nilo shortcuts use existing handlers and routes.
- Standalone demo and printed output remain usable.

### Task 1: Homepage
- [x] Replace web/vitrine.html and web/vitrine.css with benefit-led responsive design; retain /demo and /atelier routes.
- [x] Check homepage at desktop and phone sizes with headless browser.

### Task 2: Workspace
- [x] Update screen theme tokens and scoped workspace rules in web/style.css and web/mobile.css.
- [x] Update dashboard/login presentation in web/app.js and mobile heading in web/mobile.js.
- [x] Rebuild APERCU.html using node scripts/build-preview.js.
- [x] Run npm test and browser checks for editing, navigation, themes and mobile.

### Task 3: Delivery
- [x] Review complete diff independently, address significant findings.
- [x] Capture desktop/mobile previews, commit and make a reviewable GitHub branch/PR where access permits.

## Execution notes
Baseline: npm test, 47 passed. User authorized direct implementation; proceed without an extra design approval round. Cosmetic changes use visual validation, not new implementation-mirroring tests.

## Verification record
- npm test: 47 passed, 0 failed after the final layout fixes.
- Chromium: homepage, login and demo have no horizontal overflow at 320, 390, 768, 1024 and 1440px. No page errors.
- Quote discount updates the total from 3,696.00 to 3,326.40; saving succeeds.
- Nilo opens from the dashboard; clients, catalogue, activity, settings and Persian entry navigation work.
- Mobile quote tabs switch correctly; dark-mode quote paper stays white; sample print is one A4 page.
- Updated landing-page phone image captured from the new UI.
- Independent review found short-viewport sidebar clipping and joined mobile login sentences. Both reproduced with a failing browser check, fixed, then passed; full suite remains green.
- Local file URLs are blocked by the browser environment; the standalone demo runtime is covered by the existing test and the same generated HTML is exercised through /demo.

Final review: no outstanding critical/important findings. Deferred minor: Nilo and payment demonstration CTAs open the common /demo workspace rather than deep-linking to those screens. Live Gemini responses and physical-device printing were not exercised.

Delivery: draft PR https://github.com/AliMadandar/Projet-perso/pull/1 on codex/rivqo-design-refresh. Main and deployment unchanged.
