# Current Task

Last updated: 2026-06-05 01:05:00 +02:00

## Task

Move the generic `Zusatzeinkommen` portal logo out of the form flow and place it
unobtrusively in the top-right corner of the portal card.

## Scope

- `dashboard/assets/app.js`
- `dashboard/assets/style.css`
- `tests/misc-income-render.test.js`
- memory files

## Checklist

- [x] Read required startup files and git status.
- [x] Add a failing render contract for the portal/corner classes.
- [x] Add a portal-specific form class.
- [x] Add a corner-specific logo container class.
- [x] Position the logo absolutely in the top-right of the portal card.
- [x] Keep mobile layout protected with right padding and smaller max-width.
- [x] Deploy runtime files to production.
- [x] Verify focused render test, full JS test suite, JS syntax, server PHP 8.4
  lint, live asset delivery, and browser login-state limitation.

## Notes

- The logos remain available, but no longer sit in the normal field layout.
- Browser DOM verification could not inspect the authenticated dashboard because
  the in-app browser was on the login page. Live JS/CSS asset checks confirmed
  the deployed corner classes are present.
