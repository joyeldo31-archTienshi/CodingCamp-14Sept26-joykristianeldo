# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a single-page, client-side expense tracker using plain HTML, CSS, and Vanilla JavaScript. Implementation follows the event-driven MVC design: one `index.html`, one `css/styles.css`, and one `js/app.js` containing all five logical modules (State, Storage, Validator, UI, Chart). Data persists via `localStorage`. The app must work via `file://` protocol and be responsive down to 320 px.

---

## Tasks

- [x] 1. Scaffold project structure and HTML shell
  - Create `index.html` with semantic markup: header (Balance_Display), main (Input_Form, Transaction_List, Chart canvas), and `<script>` tags for Chart.js CDN followed by `js/app.js`
  - Create empty `css/styles.css` and `js/app.js` files to satisfy the single-file constraint
  - Add placeholder `<div id="info-banner">` and `<div id="error-banner">` elements for runtime messages
  - Add `<canvas id="expense-chart">` inside a dedicated chart section
  - _Requirements: 6.1, 6.2, 6.3, 6.5, 7.4_

- [x] 2. Implement State module and Transaction data model
  - [x] 2.1 Define the `state` object and transaction helper functions
    - Declare `const state = { transactions: [], storageError: null }` at module scope
    - Implement `addTransaction({ name, amount, category })` that appends a new Transaction with `crypto.randomUUID()` (or `Date.now().toString()` fallback), trimmed name, parsed float amount, and `new Date().toISOString()` timestamp
    - Implement `deleteTransaction(id)` that splices the matching transaction by `id`
    - _Requirements: 1.2, 2.3_

  - [ ]* 2.2 Write property test for valid transaction addition (Property 1)
    - **Property 1: Valid transaction addition grows the list**
    - Use `fc.array(transactionArb)` and a valid input record to assert list length increases by exactly 1 and the new item is present
    - **Validates: Requirements 1.2**

- [x] 3. Implement Storage module
  - [x] 3.1 Implement `Storage.save()` and `Storage.load()`
    - `Storage.save(transactions)` — serializes to JSON, writes to `localStorage` key `"ebv_transactions"`, catches errors and calls `UI.showStorageError()`
    - `Storage.load()` — reads and JSON-parses `"ebv_transactions"`, returns `[]` and sets `state.storageError` on any failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 3.2 Write property test for serialization round-trip (Property 9)
    - **Property 9: Serialization round-trip preserves the transaction collection**
    - Use `fc.array(transactionArb)` to assert `Storage.load()` after `Storage.save()` produces a deeply equal array
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 4. Implement Validator module
  - [x] 4.1 Implement `Validator.validate({ name, amount, category })`
    - Return `{ valid: boolean, errors: { name?, amount?, category? } }`
    - `name`: required, 1–100 non-whitespace characters
    - `amount`: required, numeric, in range `[0.01, 999999999.99]`
    - `category`: required, one of `["Food", "Transport", "Fun"]`
    - _Requirements: 1.1, 1.4, 1.5, 1.6_

  - [ ]* 4.2 Write property test for invalid field rejection (Property 2)
    - **Property 2: Invalid field combinations are rejected with per-field errors**
    - Generate inputs with at least one invalid field; assert `valid === false` and an error message exists for each offending field
    - **Validates: Requirements 1.4, 1.5, 1.6**

- [x] 5. Checkpoint — core logic verified
  - Ensure State, Storage, and Validator modules are complete and all property tests pass. Ask the user if questions arise.

- [x] 6. Implement UI module
  - [x] 6.1 Implement `UI.renderList(transactions)`
    - Clear `#transaction-list` and re-render rows: item name, `amount.toFixed(2)`, category, and a delete button with `data-id` attribute
    - Show `"No expenses added yet."` when the array is empty
    - _Requirements: 2.1, 2.5_

  - [ ]* 6.2 Write property test for transaction list rendering (Property 4)
    - **Property 4: Transaction list renders all transactions with correct formatting**
    - Use `fc.array(transactionArb)` to assert every transaction's name, formatted amount, and category appear in the rendered DOM
    - **Validates: Requirements 2.1**

  - [x] 6.3 Implement `UI.renderBalance(transactions)`
    - Compute the sum of all `amount` values, format to 2 decimal places, write to `#balance-display`
    - Display `"0.00"` when the array is empty
    - _Requirements: 3.1, 3.4_

  - [ ]* 6.4 Write property test for balance calculation (Property 6)
    - **Property 6: Balance equals the sum of all transaction amounts**
    - Use `fc.array(fc.record({ amount: fc.float({ min: 0.01, max: 999999.99 }) }))` to assert the displayed value equals the sum formatted to 2 dp
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 6.5 Implement `UI.renderErrors()`, `UI.clearForm()`, `UI.showInfoMessage()`, and `UI.showStorageError()`
    - `renderErrors(errors)` — clears all `.error-msg` spans, then writes per-field messages adjacent to each field
    - `clearForm()` — resets all form fields to empty/default
    - `showInfoMessage(message)` — displays a transient info banner that auto-dismisses after 5 seconds
    - `showStorageError(message)` — displays a persistent error banner until dismissed
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 3.5, 5.4, 5.5_

  - [ ]* 6.6 Write property test for form reset after submission (Property 3)
    - **Property 3: Submission always resets the form**
    - Use `fc.record(validInputArb)` to assert all form fields are empty/default after a valid submission
    - **Validates: Requirements 1.3**

- [x] 7. Implement Chart module
  - [x] 7.1 Implement `Chart.computeData(transactions)`
    - Pure function returning `{ labels, data, percentages }` for Chart.js
    - Compute per-category totals, calculate percentage = `(categoryTotal / grandTotal) * 100` rounded to 1 dp
    - Filter out categories where percentage rounds to `0.0%`
    - Format labels as `"Food (45.3%)"` etc.
    - _Requirements: 4.1, 4.6_

  - [ ]* 7.2 Write property test for chart percentage proportionality (Property 7)
    - **Property 7: Chart percentages are proportional and sum to 100%**
    - Use `fc.array(transactionArb, { minLength: 1 })` to assert each percentage equals `(categoryTotal / grandTotal) * 100` rounded to 1 dp, and sum is within ±0.2% of 100
    - **Validates: Requirements 4.1**

  - [ ]* 7.3 Write property test for zero-share category exclusion (Property 8)
    - **Property 8: Zero-share categories are excluded from chart data**
    - Craft an arbitrary ensuring at least one category has a negligibly small amount; assert it is absent from `labels`, `data`, and `percentages`
    - **Validates: Requirements 4.6**

  - [x] 7.4 Implement `Chart.init(canvasId)` and `Chart.update(transactions)`
    - `Chart.init` — creates a Chart.js pie/doughnut instance on the given canvas element (called once on load)
    - `Chart.update` — calls `computeData()`, updates `chart.data`, calls `chart.update()`; shows placeholder message when transactions is empty or all percentages round to 0%
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Checkpoint — UI and Chart modules verified
  - Ensure rendering, balance, and chart update correctly with sample data. Ask the user if questions arise.

- [x] 9. Wire event listeners and integrate all modules
  - [x] 9.1 Implement the `init()` function wired to `DOMContentLoaded`
    - On load: call `Storage.load()` → populate `state.transactions` → call `UI.renderList()`, `UI.renderBalance()`, `Chart.init()`, `Chart.update()`
    - If `state.storageError` is set after load, call `UI.showInfoMessage()`
    - _Requirements: 5.3, 5.4, 3.1, 3.4, 4.4, 7.1_

  - [x] 9.2 Wire the form submit event listener
    - Prevent default, read field values, call `Validator.validate()`
    - On invalid: call `UI.renderErrors(errors)` and return
    - On valid: call `addTransaction()`, `Storage.save()`, `UI.renderList()`, `UI.renderBalance()`, `Chart.update()`, `UI.clearForm()`
    - On storage save failure: call `UI.showStorageError()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 3.2, 4.2, 5.1, 7.2_

  - [x] 9.3 Wire the transaction list delete event listener (event delegation)
    - Attach a single `click` listener on `#transaction-list`
    - Detect delete button via `dataset.id`, call `deleteTransaction(id)`, `Storage.save()`, `UI.renderList()`, `UI.renderBalance()`, `Chart.update()`
    - On storage save failure: call `UI.showStorageError()` and revert state
    - _Requirements: 2.3, 2.4, 3.3, 4.3, 5.2_

  - [ ]* 9.4 Write property test for deletion correctness (Property 5)
    - **Property 5: Deletion removes exactly the targeted transaction**
    - Use `fc.array(transactionArb, { minLength: 1 })` and `fc.nat()` (modulo array length) to assert only the targeted transaction is removed, all others remain in original order
    - **Validates: Requirements 2.3**

- [x] 10. Apply CSS styles and responsive layout
  - [x] 10.1 Implement base layout and typography in `css/styles.css`
    - Body font size ≥ 16 px, secondary labels ≥ 12 px, heading visually distinct
    - All text meets WCAG 4.5:1 contrast ratio against its background
    - Page layout: balance at top, form and list side-by-side (or stacked on narrow viewports), chart below
    - _Requirements: 7.3, 7.5_

  - [x] 10.2 Implement responsive rules and scrollable transaction list
    - Media query to stack columns at ≤ 320 px viewport; no content clipped outside boundary
    - `#transaction-list` with `overflow-y: auto` and a max-height to enable scrolling
    - Style info-banner and error-banner elements (color-coded, dismissible button on error banner)
    - _Requirements: 2.2, 7.5_

- [x] 11. Final checkpoint — full integration verified
  - Ensure all modules integrate correctly end-to-end: add a transaction, verify balance and chart update, delete a transaction, verify balance and chart update, reload page and verify persistence. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use **fast-check** loaded from CDN in a separate `tests/property-tests.html` file — no install required
- Unit tests for Validator and Storage can run in Node.js via Jest or as browser assertions — no build step needed
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- The `Chart` module name aliases the Chart.js global to avoid collision; rename to `ChartModule` or similar if needed

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "4.1"] },
    { "id": 1, "tasks": ["2.2", "3.1", "4.2"] },
    { "id": 2, "tasks": ["3.2", "6.1", "6.3", "6.5", "7.1"] },
    { "id": 3, "tasks": ["6.2", "6.4", "6.6", "7.2", "7.3", "7.4"] },
    { "id": 4, "tasks": ["9.1", "9.2", "9.3", "10.1"] },
    { "id": 5, "tasks": ["9.4", "10.2"] }
  ]
}
```
