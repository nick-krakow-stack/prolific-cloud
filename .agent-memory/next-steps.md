# Next Steps

Last updated: 2026-05-17

## Immediate

- Owner should log in at `https://prolific.nickkrakow.de/` and do a full
  browser review across all tabs with real data.
- Collect review notes as a batch before starting the next fix pass.
- Plan the new `Zusatzeinkommen` tab before implementation. Current clarified
  requirements:
  - Separate tab `Zusatzeinkommen` for chat moderator income.
  - Billing period is always Monday through Sunday.
  - Work sessions crossing a billing-week boundary, e.g. Sunday to Monday, are
    split automatically across the affected billing weeks so weekly tiers and
    payouts stay correct.
  - When a work session is split automatically, its paid messages are allocated
    proportionally by time share across the split parts. Owner will try to avoid
    this by manually cutting sessions at week boundaries where possible.
  - Automatic split allocation uses whole message counts only. The split parts
    must always sum back to the original session message count; rounding
    remainders go to the longer time share.
  - User enters work sessions with start datetime, end datetime, and paid
    message count.
  - There should also be a live timer with `Start`/`Stop`; on stop, the system
    asks for the paid message count and creates the work session.
  - Timer state is persisted server-side. Browser reloads or closing/reopening
    the dashboard must not lose a running timer.
  - Only one active additional-income work session may exist at a time.
  - Normal message pay tier is based on the total paid normal messages in the
    billing week and applies retroactively to all normal messages that week:
    1-1000 => 0.12 EUR/message; 1001-1250 => 0.13; 1251-1500 => 0.14;
    1501-2000 => 0.15; 2001+ => 0.17.
  - Standard night bonus applies only to normal sent/paid messages, not to
    unpayable special message types. Night window is 00:00-07:00.
  - Standard night bonus is enabled by default for each work session, but can be
    disabled per session with a `Nachtbonus anwenden` checkbox.
  - If a session crosses night/non-night windows, estimate night messages
    proportionally by time share. Owner will try to cut sessions at midnight for
    cleaner data.
  - Special message categories such as favorites, likes, flirts, matches, etc.
    should not be tracked individually. Only the paid message count from the
    provider backend matters.
  - Each work session can have one optional special bonus. Bonus applies only to
    messages inside that same work session.
  - Bonus supports two modes:
    - one-time fixed bonus (`einmalig`): e.g. 5 EUR once when at least 200 messages are
      reached; below threshold 0, above threshold still exactly 5 EUR.
    - cumulative per-message bonus (`fortlaufend`/per message): e.g. +0.02 EUR/message when at least 55 messages are
      reached; below threshold 0, above threshold all tracked messages in the
      session get the extra rate.
  - Per-message bonuses are retroactive within the session once the threshold
    is reached: if threshold is 55 and the session has 231 paid messages, all
    231 messages receive the extra per-message amount.
  - Bonus parameters vary by session and must be editable when entering or
    finishing a session.
  - The stop dialog should ask for paid message count, night-bonus checkbox,
    optional bonus type (`keiner`, `einmalig`, `fortlaufend`), bonus threshold
    in messages, and bonus amount. No notes field is needed.
  - Manual backfill form uses the same fields as the stop dialog, with manually
    selectable start and end datetime.
  - Saved work sessions must be editable and deletable. Deleting requires a
    confirmation prompt because edits/deletes recalculate weekly tiers and
    payout status.
  - Tab top should use a dashboard-like four-tile layout. One tile is
    `Aktueller Verdienst`: gross amount, with payout amount after transfer fees
    underneath in the same tile.
  - Top four tiles in the `Zusatzeinkommen` tab:
    1. `Aktueller Verdienst`: gross amount plus payout amount after fees.
    2. `Diese Woche`: messages, gross amount, hourly rate.
    3. `Offen zur Auszahlung`: cumulative gross/net amount and payout status.
    4. `Heute`: tracked time, paid messages, income.
  - Hourly-rate calculations in `Zusatzeinkommen` are based on gross income
    before transfer fees. Fees are shown separately only in payout/net displays.
  - Money values for `Zusatzeinkommen` are stored and calculated as integer
    cents, not floating-point amounts. UI formatting converts cents to Euro
    display values.
  - Transfer fee table for payout net calculation:
    50-250 EUR => 5 EUR; 251-500 => 7.50 EUR; 501-600 => 10 EUR;
    601-1000 => 12.50 EUR; 1001+ => 15 EUR.
  - Payouts only happen once at least 50 EUR gross is reached at the end of a
    billing period. Amounts below 50 EUR remain saved/open and carry forward
    until the payout threshold is reached.
  - Transfer fee is calculated on the cumulative payout amount, not on each
    individual week's gross income. Example: 30 EUR carried forward + 40 EUR in
    the next week => 70 EUR payout amount, 5 EUR fee, 65 EUR net.
  - Dashboard overview gets a new `Zusatzverdienste` tile in the second row.
    It shows open net payout amount for all additional-income billing weeks not
    marked as paid out.
  - In overview goal cards `Heute` and `Aktueller Monat`, show additional
    income as separate rows near the bottom/under effective hourly, but do not
    include it in Prolific goal rings, Prolific hourly rates, or Prolific totals.
  - Payout handling: each billing week can be marked `Als ausgezahlt markieren`.
    Paid weeks are excluded from the open net payout dashboard tile.
  - Payout status model:
    - `offen`: running week or accumulated amount below payout threshold.
    - `auszahlungsbereit`: completed week group reaches at least 50 EUR gross.
    - `ausgezahlt`: manually marked as paid out.
  - Marking as paid out must never include the current running billing week.
    It only applies to completed billing weeks up to the previous Sunday.

## Phase 1 + Phase 2 Work Split

Potential parallel Sub-Agent ownership:

- Backend Agent: `api/data.php`, `config.example.php` if goals config is added.
- Frontend Rendering Agent: `dashboard/assets/app.js` render helpers and dashboard HTML.
- CSS Agent: `dashboard/assets/style.css` cards, progress bars, status pills, responsive layout.
- QA/Review Agent: read-only review of data contracts, root routing, auth, and verification gaps.

The Orchestrator should integrate cross-file contracts and keep shared-file edits sequenced.

## Deployment Routine

- Use SSH alias `prolific-cloud`.
- Use webroot `/www/htdocs/w021974e/prolific.nickkrakow.de`.
- Dry-run deploy command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-webspace.ps1 -DryRun
```

- Real deploy command:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-webspace.ps1
```

- The helper uploads only runtime files by default.
- If a task explicitly changes real config, use `-IncludeConfig` to upload `config.php` deliberately.

## Backlog

- Review fixes from owner feedback.
- Optional hardening: stronger CSRF token, if the private dashboard later gets
  broader exposure.
- Optional polish: split large `dashboard/assets/app.js` after the review pass.
- Optional future features beyond the current roadmap.
