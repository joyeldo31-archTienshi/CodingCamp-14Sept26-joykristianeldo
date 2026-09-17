# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page, client-side web application built with plain HTML, CSS, and Vanilla JavaScript. There is no backend, no build pipeline, and no JavaScript framework. The app lets users log personal expense transactions (name, amount, category), view a running total balance, browse a scrollable transaction list with per-item deletion, and see a live pie chart of spending by category. All data is persisted in the browser's `localStorage`. The app must work when opened directly via the `file://` protocol.

### Design Goals

- **Zero dependencies beyond Chart.js** — no npm, no bundler, no framework.
- **Single JS file, single CSS file** — `js/app.js` and `css/styles.css`.
- **Immediate reactivity** — every add or delete updates the balance and chart without a page reload, within 100 ms (target) / 1 second (hard limit).
- **Resilient persistence** — graceful degradation when `localStorage` is unavailable or corrupt.
- **Accessible and responsive** — WCAG 4.5:1 contrast, 16 px minimum body text, usable down to 320 px viewport.

---

## Architecture

The application follows a simple **event-driven MVC** pattern, entirely within a single JavaScript file. There is no module system; instead the code is organized into clearly commented sections with well-named functions and a single shared state object.

```
index.html
│
├── css/styles.css          ← all styles (layout, typography, color, responsiveness)
│
└── js/app.js               ← all application logic
    ├── State               (in-memory transaction array + derived values)
    ├── Storage module      (read/write localStorage)
    ├── Validator module    (form field validation)
    ├── UI module           (DOM rendering helpers)
    ├── Chart module        (Chart.js wrapper)
    └── Event listeners     (form submit, delete clicks, DOMContentLoaded)
```

### Data Flow

```
User Action (form submit / delete click)
        │
        ▼
   Validator  ──(invalid)──▶  Inline error messages (UI)
        │ (valid)
        ▼
   State update (add / splice)
        │
        ├──▶ Storage.save()       → localStorage
        ├──▶ UI.renderList()      → Transaction_List DOM
        ├──▶ UI.renderBalance()   → Balance_Display DOM
        └──▶ Chart.update()       → Chart.js pie chart
```

On page load (`DOMContentLoaded`):

```
Storage.load()
   └──▶ parse JSON  ──(parse error / unavailable)──▶ empty state + info message
              │ (ok)
              ▼
         State.transactions = loaded array
              │
              ├──▶ UI.renderList()
              ├──▶ UI.renderBalance()
              └──▶ Chart.update()
```

---

## Components and Interfaces

### 1. State

A single module-level object holding runtime state:

```js
const state = {
  transactions: [],   // Array<Transaction>
  storageError: null  // string | null — message to show if storage fails
};
```

All reads and writes go through helper functions (`addTransaction`, `deleteTransaction`) that keep `state.transactions` as the single source of truth.

### 2. Storage Module

Responsible for all `localStorage` interaction.

```js
Storage.save(transactions)
  // Serializes transactions to JSON and writes to localStorage key "ebv_transactions".
  // On failure: sets state.storageError and calls UI.showStorageError().
  // Returns: void

Storage.load()
  // Reads and JSON-parses "ebv_transactions" from localStorage.
  // On unavailability or parse error: returns [] and sets state.storageError.
  // Returns: Array<Transaction>
```

**Key**: `"ebv_transactions"`

### 3. Validator Module

Pure functions — no DOM side-effects. Returns a validation result object.

```js
Validator.validate({ name, amount, category })
  // Returns: { valid: boolean, errors: { name?: string, amount?: string, category?: string } }

// Rules:
//   name: required, 1–100 non-whitespace-only characters
//   amount: required, numeric, in range [0.01, 999999999.99]
//   category: required, one of ["Food", "Transport", "Fun"]
```

The UI layer reads the `errors` map and renders inline messages adjacent to each field.

### 4. UI Module

All DOM manipulation lives here. Each function is idempotent — it clears and re-renders its target container.

```js
UI.renderList(transactions)
  // Clears #transaction-list and re-renders all transactions.
  // Each row: item name, amount (toFixed(2)), category, delete button.
  // Empty state: shows "No expenses added yet." message when array is empty.

UI.renderBalance(transactions)
  // Computes sum, formats to 2 dp, writes to #balance-display.
  // Displays "0.00" when array is empty.

UI.renderErrors(errors)
  // Writes inline error messages into .error-msg spans adjacent to each field.
  // Clears all error spans before writing new ones.

UI.clearForm()
  // Resets all form fields to empty/default.

UI.showInfoMessage(message)
  // Displays a transient info banner (e.g., storage unavailable).

UI.showStorageError(message)
  // Displays a persistent error banner for save failures.
```

### 5. Chart Module

Wraps Chart.js. Owns the single `Chart` instance.

```js
Chart.init(canvasId)
  // Creates a Chart.js doughnut/pie chart on the given canvas element.
  // Called once on DOMContentLoaded.

Chart.update(transactions)
  // Recomputes per-category totals and percentages from transactions.
  // Calls chart.data update + chart.update() on the Chart.js instance.
  // Shows placeholder message when transactions is empty or all categories round to 0%.
  // Excludes any category whose share rounds to 0.0%.

Chart.computeData(transactions)
  // Pure function. Returns { labels, data, percentages } for Chart.js.
  // Filters out categories where percentage rounds to 0.0%.
  // Percentages rounded to 1 decimal place.
```

### 6. Event Listeners

Wired in a single `init()` function called on `DOMContentLoaded`:

- **Form `submit`**: validate → add → save → render all → clear form.
- **Transaction list `click` (delegated)**: detect delete button → delete → save → render all.
- **`DOMContentLoaded`**: load from storage → render all → init chart.

---

## Data Models

### Transaction

```js
{
  id:        string,   // crypto.randomUUID() or Date.now().toString() fallback
  name:      string,   // 1–100 characters, trimmed
  amount:    number,   // float, [0.01, 999999999.99]
  category:  string,   // "Food" | "Transport" | "Fun"
  createdAt: string    // ISO 8601 datetime string (new Date().toISOString())
}
```

### StoragePayload

The value stored under `"ebv_transactions"` in `localStorage`:

```js
JSON.stringify(Array<Transaction>)
```

A plain JSON array of Transaction objects. No envelope or version field is required (single-version, client-side-only app).

### ChartData

Internal structure produced by `Chart.computeData()`:

```js
{
  labels:      string[],   // category names with percentage labels, e.g. ["Food (45.3%)", "Fun (54.7%)"]
  data:        number[],   // raw totals per category (used for slice sizing)
  percentages: number[]    // rounded to 1 dp, parallel to labels/data
}
```

### ValidationResult

```js
{
  valid:  boolean,
  errors: {
    name?:     string,   // error message or absent
    amount?:   string,
    category?: string
  }
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid transaction addition grows the list

*For any* transaction list and any valid `(name, amount, category)` tuple, calling `addTransaction` should produce a list whose length is exactly one greater than the original, and which contains the newly added transaction.

**Validates: Requirements 1.2**

---

### Property 2: Invalid field combinations are rejected with per-field errors

*For any* combination of form inputs where at least one required field is missing/empty (or the amount is outside `[0.01, 999999999.99]`, or the name exceeds 100 characters), `Validator.validate()` should return `valid: false` and include an error message for every offending field.

**Validates: Requirements 1.4, 1.5, 1.6**

---

### Property 3: Submission always resets the form

*For any* valid transaction that is successfully submitted, all form fields should be in their default empty/unselected state afterward.

**Validates: Requirements 1.3**

---

### Property 4: Transaction list renders all transactions with correct formatting

*For any* array of transactions, `UI.renderList()` should produce a DOM where every transaction's name, amount (formatted to exactly 2 decimal places), and category appear in the list.

**Validates: Requirements 2.1**

---

### Property 5: Deletion removes exactly the targeted transaction

*For any* collection of transactions and any chosen transaction index, `deleteTransaction(index)` should produce a list that is missing only the targeted transaction while all others remain intact and in their original order.

**Validates: Requirements 2.3**

---

### Property 6: Balance equals the sum of all transaction amounts

*For any* list of transactions, `calculateBalance(transactions)` should return a string equal to the sum of all `amount` values, formatted to exactly 2 decimal places.

**Validates: Requirements 3.1, 3.2, 3.3**

---

### Property 7: Chart percentages are proportional and sum to 100%

*For any* non-empty list of transactions, `Chart.computeData(transactions)` should produce percentages where each category's value equals `(categoryTotal / grandTotal) * 100` rounded to 1 decimal place, and the sum of all percentages is within ±0.2% of 100 (rounding tolerance).

**Validates: Requirements 4.1**

---

### Property 8: Zero-share categories are excluded from chart data

*For any* transaction set where a category's share of total spending rounds to 0.0%, `Chart.computeData()` should not include that category in its `labels`, `data`, or `percentages` arrays.

**Validates: Requirements 4.6**

---

### Property 9: Serialization round-trip preserves the transaction collection

*For any* array of Transaction objects, serializing to JSON with `Storage.save()` and then deserializing with `Storage.load()` should produce an array that is deeply equal to the original.

**Validates: Requirements 5.1, 5.2, 5.3**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Form submitted with missing fields | Validator blocks submission; inline error messages appear adjacent to each invalid field; no transaction is created |
| Form submitted with invalid amount | Validator blocks submission; inline error on amount field |
| Form submitted with name >100 chars | Validator blocks submission; inline error on name field |
| `localStorage` unavailable on load | App initializes with empty transaction list; info banner shown |
| `localStorage` parse error on load | App initializes with empty transaction list; info banner shown |
| `localStorage` save failure (add/delete) | User notified via persistent error banner; in-memory state unchanged so session continues |
| Delete operation failure (storage write) | Error message shown; transaction retained in list and in-memory state |
| Chart.js fails to render (e.g., canvas unavailable) | Pie chart area displays a graceful fallback message; rest of app continues to function |

### Error Message Placement

- **Inline field errors** (`name`, `amount`, `category`): `<span class="error-msg">` elements placed directly below each form field, populated by `UI.renderErrors()`.
- **Info banners** (storage load failure, no data): a `<div id="info-banner">` at the top of the page, auto-dismissed after 5 seconds.
- **Persistent error banners** (save failure, delete failure): a `<div id="error-banner">` that stays visible until the user dismisses it.

---

## Testing Strategy

### Unit Tests (Example-Based)

Use a lightweight test runner that works without a build tool — either **Jest** (if run via Node for logic-only tests) or plain assertion functions executed in the browser console for zero-dependency testing.

Focus areas:

- `Validator.validate()` with specific valid and invalid inputs.
- `calculateBalance()` with concrete arrays including edge cases (empty array, single item, large sums).
- `Chart.computeData()` with concrete category distributions.
- `Storage.load()` when called with a pre-seeded `localStorage` mock.
- Empty-state rendering: `UI.renderList([])` shows the empty-state message.
- `calculateBalance([])` returns `"0.00"`.

### Property-Based Tests

Use **[fast-check](https://github.com/dubzzz/fast-check)** (loaded from CDN in the test HTML file, no install required) with a minimum of **100 iterations per property**.

Each test is tagged with the property it validates:

| Property | Test description | fast-check arbitraries |
|---|---|---|
| **Property 1** | Adding a valid transaction grows the list by 1 and contains the new item | `fc.array(transactionArb)`, `fc.record({ name: fc.string({minLength:1, maxLength:100}), amount: fc.float({min:0.01, max:999999999.99}), category: fc.constantFrom("Food","Transport","Fun") })` |
| **Property 2** | Any invalid input combination returns `valid: false` with errors for each bad field | `fc.record(...)` with invalid combinations generated per field |
| **Property 3** | Any valid submission leaves all form fields cleared | `fc.record(validInputArb)` |
| **Property 4** | Rendering any transaction array produces correct name/amount/category in DOM | `fc.array(transactionArb)` |
| **Property 5** | Deleting any index removes only that transaction, preserving all others | `fc.array(transactionArb, {minLength:1})`, `fc.nat()` (index) |
| **Property 6** | Balance equals sum of amounts to 2 dp for any transaction list | `fc.array(fc.record({ amount: fc.float({min:0.01, max:999999.99}) }))` |
| **Property 7** | Chart percentages are proportional and sum to ≈100% | `fc.array(transactionArb, {minLength:1})` |
| **Property 8** | Categories with 0.0% share are excluded from chart data | crafted arbitrary ensuring at least one tiny-amount category |
| **Property 9** | JSON round-trip produces deeply equal transaction array | `fc.array(transactionArb)` |

**Tag format for each test:**
```js
// Feature: expense-budget-visualizer, Property 1: Valid transaction addition grows the list
```

**Test configuration:**
```js
fc.assert(fc.property(...), { numRuns: 100 });
```

### Integration / Smoke Checks (Manual)

- Open `index.html` via `file://` — verify app loads, chart renders, form works end-to-end.
- Resize browser to 320 px viewport — verify no clipping.
- Run Chrome Lighthouse accessibility audit — verify WCAG 4.5:1 contrast pass.
- Add a transaction, close tab, reopen — verify data persists.
- Open browser DevTools → Application → LocalStorage → manually corrupt the value → reload — verify graceful fallback.
- Verify exactly one `<script src="js/app.js">` tag and one `<link href="css/styles.css">` in `index.html`.
