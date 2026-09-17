/* Expense & Budget Visualizer 窶・app.js */

// =============================================================================
// === State ===================================================================
// =============================================================================

const state = {
  transactions: [],  // Array<Transaction>
  storageError: null // string | null 窶・set when localStorage operations fail
};

/**
 * Adds a new transaction to state.transactions.
 * @param {{ name: string, amount: string|number, category: string }} param0
 */
function addTransaction({ name, amount, category }) {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString();

  state.transactions.push({
    id,
    name: name.trim(),
    amount: parseFloat(amount),
    category,
    createdAt: new Date().toISOString()
  });
}

/**
 * Removes the transaction with the given id from state.transactions.
 * @param {string} id
 */
function deleteTransaction(id) {
  const index = state.transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    state.transactions.splice(index, 1);
  }
}

// =============================================================================
// === Storage (Task 3) ========================================================
// =============================================================================

const STORAGE_KEY = 'ebv_transactions';

const Storage = {
  /**
   * Serializes the transaction array to JSON and persists it to localStorage.
   * On any failure, records the error in state and notifies the user via the UI.
   * @param {Array<Transaction>} transactions
   */
  save(transactions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (err) {
      const message = 'Could not save your data. Changes will be lost when you close this page.';
      state.storageError = message;
      // UI.showStorageError is defined in the UI module (Task 6).
      // Guard against it not being wired yet during early development.
      if (typeof UI !== 'undefined' && typeof UI.showStorageError === 'function') {
        UI.showStorageError(message);
      }
    }
  },

  /**
   * Reads and JSON-parses the transaction array from localStorage.
   * Returns an empty array and records an error in state on any failure
   * (localStorage unavailable, missing key, or corrupt JSON).
   * @returns {Array<Transaction>}
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        // No data saved yet 窶・treat as a fresh start, not an error.
        return [];
      }
      const parsed = JSON.parse(raw);
      // Validate that the stored value is actually an array.
      if (!Array.isArray(parsed)) {
        throw new Error('Stored value is not an array');
      }
      return parsed;
    } catch (err) {
      state.storageError = 'Could not load your saved data. Starting with an empty transaction list.';
      return [];
    }
  }
};

// =============================================================================
// === Validator (Task 4) ======================================================
// =============================================================================

const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

const Validator = {
  /**
   * Validates form input before creating a transaction.
   * Pure function 窶・no DOM side-effects.
   *
   * @param {{ name: string, amount: string|number, category: string }} param0
   * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
   */
  validate({ name, amount, category }) {
    const errors = {};

    // --- name ---
    const trimmedName = (typeof name === 'string') ? name.trim() : '';
    if (!trimmedName) {
      errors.name = 'Name is required.';
    } else if (trimmedName.length > 100) {
      errors.name = 'Item name must not exceed 100 characters.';
    }

    // --- amount ---
    const rawAmount = (typeof amount === 'string') ? amount.trim() : String(amount ?? '');
    if (!rawAmount) {
      errors.amount = 'Amount is required.';
    } else {
      const parsed = Number(rawAmount);
      if (isNaN(parsed) || parsed < 0.01 || parsed > 999999999.99) {
        errors.amount = 'Amount must be a number between 0.01 and 999,999,999.99.';
      }
    }

    // --- category ---
    if (!category || !VALID_CATEGORIES.includes(category)) {
      errors.category = 'Category is required.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};

// =============================================================================
// === Balance helper ==========================================================
// =============================================================================

/**
 * Pure function. Returns the sum of all transaction amounts as a string
 * formatted to exactly 2 decimal places.
 * Returns "0.00" for an empty or falsy array.
 * @param {Array<{amount: number}>} transactions
 * @returns {string}
 */
function calculateBalance(transactions) {
  if (!transactions || transactions.length === 0) return '0.00';
  const total = transactions.reduce(function (sum, tx) {
    return sum + tx.amount;
  }, 0);
  return total.toFixed(2);
}

// =============================================================================
// === UI (Task 6) =============================================================
// =============================================================================

const UI = {
  // ---------------------------------------------------------------------------
  // 6.1 窶・renderList(transactions)
  // Clears #transaction-list and re-renders one <li> per transaction.
  // Each row shows: name, formatted amount, category, and a delete button.
  // Shows an empty-state message when the array is empty.
  // ---------------------------------------------------------------------------
  renderList(transactions) {
    const list = document.getElementById('transaction-list');
    if (!list) return;

    // Clear existing content
    list.innerHTML = '';

    if (!transactions || transactions.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'transaction-empty';
      empty.textContent = 'No expenses added yet.';
      list.appendChild(empty);
      return;
    }

    transactions.forEach(function (tx) {
      const li = document.createElement('li');
      li.className = 'transaction-item';
      li.dataset.id = tx.id;

      // Name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'tx-name';
      nameSpan.textContent = tx.name;

      // Amount 窶・always 2 decimal places
      const amountSpan = document.createElement('span');
      amountSpan.className = 'tx-amount';
      amountSpan.textContent = '$' + tx.amount.toFixed(2);

      // Category
      const categorySpan = document.createElement('span');
      categorySpan.className = 'tx-category';
      categorySpan.textContent = tx.category;

      // Delete button 窶・carries the transaction id as a data attribute
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'tx-delete';
      deleteBtn.type = 'button';
      deleteBtn.dataset.id = tx.id;
      deleteBtn.setAttribute('aria-label', 'Delete transaction: ' + tx.name);
      deleteBtn.textContent = 'Delete';

      li.appendChild(nameSpan);
      li.appendChild(amountSpan);
      li.appendChild(categorySpan);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  },

  // ---------------------------------------------------------------------------
  // 6.3 窶・renderBalance(transactions)
  // Delegates to calculateBalance() and writes the result to #balance-display.
  // ---------------------------------------------------------------------------
  renderBalance(transactions) {
    const display = document.getElementById('balance-display');
    if (!display) return;
    display.textContent = calculateBalance(transactions);
  },

  // ---------------------------------------------------------------------------
  // 6.5a 窶・renderErrors(errors)
  // Clears every .error-msg span, then writes a message into the span that
  // corresponds to each offending field ('name', 'amount', 'category').
  // ---------------------------------------------------------------------------
  renderErrors(errors) {
    // Clear all error spans first
    const allErrorSpans = document.querySelectorAll('.error-msg');
    allErrorSpans.forEach(function (span) {
      span.textContent = '';
    });

    if (!errors) return;

    // Map field names to their dedicated error span ids (as defined in index.html)
    const fieldMap = {
      name:     'error-name',
      amount:   'error-amount',
      category: 'error-category'
    };

    Object.keys(fieldMap).forEach(function (field) {
      if (errors[field]) {
        const span = document.getElementById(fieldMap[field]);
        if (span) {
          span.textContent = errors[field];
        }
      }
    });
  },

  // ---------------------------------------------------------------------------
  // 6.5b 窶・clearForm()
  // Resets all Input_Form fields to their default empty / unselected state.
  // ---------------------------------------------------------------------------
  clearForm() {
    const form = document.getElementById('expense-form');
    if (!form) return;
    form.reset();

    // Also clear any lingering error messages
    this.renderErrors({});
  },

  // ---------------------------------------------------------------------------
  // 6.5c 窶・showInfoMessage(message)
  // Displays a transient info banner that auto-dismisses after 5 seconds.
  // Used for non-critical notices such as a storage load failure on startup.
  // ---------------------------------------------------------------------------
  showInfoMessage(message) {
    const banner = document.getElementById('info-banner');
    if (!banner) return;

    banner.textContent = message;
    banner.hidden = false;

    // Auto-dismiss after 5 seconds
    setTimeout(function () {
      banner.hidden = true;
      banner.textContent = '';
    }, 5000);
  },

  // ---------------------------------------------------------------------------
  // 6.5d 窶・showStorageError(message)
  // Displays a persistent error banner that stays until the user dismisses it.
  // The dismiss button (#error-banner-close) is already in the HTML; we wire it
  // here so it works even if the event-listener init phase has not run yet.
  // ---------------------------------------------------------------------------
  showStorageError(message) {
    const banner  = document.getElementById('error-banner');
    const msgSpan = document.getElementById('error-banner-msg');
    const closeBtn = document.getElementById('error-banner-close');
    if (!banner || !msgSpan) return;

    msgSpan.textContent = message;
    banner.hidden = false;

    // Wire the dismiss button (safe to call multiple times 窶・addEventListener
    // with the same named function does not add duplicate listeners)
    if (closeBtn && !closeBtn._dismissWired) {
      closeBtn.addEventListener('click', function () {
        banner.hidden = true;
        msgSpan.textContent = '';
      });
      closeBtn._dismissWired = true;
    }
  }
};

// =============================================================================
// === Chart (Task 7) ==========================================================
// =============================================================================

// NOTE: The Chart.js library exposes a global named `Chart`. To avoid
// colliding with that global, this application's Chart module is an object
// literal stored in the same `Chart` name AFTER Chart.js has been loaded.
// Chart.js attaches itself to `window.Chart`, so we save a reference to the
// constructor before we shadow the name, then use that reference inside init.
const _ChartJSConstructor = (typeof window.Chart !== 'undefined') ? window.Chart : null;

const AppChart = {
  // Internal Chart.js instance 窶・created once by AppChart.init().
  _instance: null,

  // Colour palette for the three categories (Food, Transport, Fun).
  // Using accessible, high-contrast colours.
  _COLORS: {
    Food:      '#e05c2f', // warm orange-red
    Transport: '#2f7fe0', // blue
    Fun:       '#2fc97e'  // green
  },

  // ---------------------------------------------------------------------------
  // 7.1 窶・AppChart.computeData(transactions)
  // Pure function. Returns { labels, data, percentages } ready for Chart.js.
  // Categories whose rounded percentage is exactly 0.0% are excluded.
  // ---------------------------------------------------------------------------
  computeData(transactions) {
    const CATEGORIES = ['Food', 'Transport', 'Fun'];

    // Sum amounts per category
    const totals = { Food: 0, Transport: 0, Fun: 0 };
    (transactions || []).forEach(function (tx) {
      if (totals.hasOwnProperty(tx.category)) {
        totals[tx.category] += tx.amount;
      }
    });

    const grandTotal = CATEGORIES.reduce(function (sum, cat) {
      return sum + totals[cat];
    }, 0);

    if (grandTotal === 0) {
      return { labels: [], data: [], percentages: [] };
    }

    const labels      = [];
    const data        = [];
    const percentages = [];

    CATEGORIES.forEach(function (cat) {
      const rawPct = (totals[cat] / grandTotal) * 100;
      const rounded = Math.round(rawPct * 10) / 10; // 1 decimal place

      // Exclude categories whose share rounds to exactly 0.0%
      if (rounded === 0) return;

      labels.push(cat + ' (' + rounded.toFixed(1) + '%)');
      data.push(totals[cat]);
      percentages.push(rounded);
    });

    return { labels, data, percentages };
  },

  // ---------------------------------------------------------------------------
  // 7.4a 窶・AppChart.init(canvasId)
  // Creates the Chart.js doughnut instance on the given canvas element.
  // Should be called exactly once on DOMContentLoaded.
  // ---------------------------------------------------------------------------
  init(canvasId) {
    if (!_ChartJSConstructor) {
      // Chart.js CDN did not load 窶・show fallback
      this._showPlaceholder('Chart library could not be loaded.');
      return;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      this._showPlaceholder('Chart canvas element not found.');
      return;
    }

    // Start with no data; AppChart.update() will populate on first render.
    try {
      this._instance = new _ChartJSConstructor(canvas, {
        type: 'pie',
        data: {
          labels:   [],
          datasets: [{
            data:            [],
            backgroundColor: [],
            borderWidth:     2,
            borderColor:     '#fff'
          }]
        },
        options: {
          responsive:          true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display:  true,
              position: 'bottom',
              labels:   {
                font:  { size: 14 },
                color: '#1a1a1a',
                padding: 16
              }
            },
            tooltip: {
              callbacks: {
                label(context) {
                  // Tooltip: "Food: $45.30 (45.3%)"
                  const rawLabel = context.label || '';
                  const value    = context.parsed || 0;
                  return ' $' + value.toFixed(2) + '  窶・ ' + rawLabel;
                }
              }
            }
          }
        }
      });
    } catch (err) {
      this._showPlaceholder('Could not render the chart.');
    }
  },

  // ---------------------------------------------------------------------------
  // 7.4b 窶・AppChart.update(transactions)
  // Recomputes chart data and updates the live Chart.js instance.
  // Shows/hides the placeholder element depending on whether there is data.
  // ---------------------------------------------------------------------------
  update(transactions) {
    const { labels, data, percentages } = this.computeData(transactions);

    const hasData = labels.length > 0;

    if (hasData) {
      this._hidePlaceholder();
    } else {
      this._showPlaceholder('No data to visualize yet.');
      return;
    }

    if (!this._instance) return;

    // Build background colours aligned with the filtered labels array.
    // Labels are formatted as "Food (45.3%)" so we extract the category name.
    const bgColors = labels.map((label) => {
      const catName = label.split(' (')[0];
      return this._COLORS[catName] || '#999999';
    });

    this._instance.data.labels                          = labels;
    this._instance.data.datasets[0].data               = data;
    this._instance.data.datasets[0].backgroundColor    = bgColors;

    this._instance.update();
  },

  // ---------------------------------------------------------------------------
  // Helpers 窶・show / hide the placeholder element and the canvas
  // ---------------------------------------------------------------------------
  _showPlaceholder(message) {
    const placeholder = document.getElementById('chart-placeholder');
    const canvas      = document.getElementById('expense-chart');

    if (placeholder) {
      // Update the inner message if a <p> child exists
      const p = placeholder.querySelector('p');
      if (p) p.textContent = message;
      placeholder.hidden = false;
    }
    if (canvas) {
      canvas.hidden = true;
    }
  },

  _hidePlaceholder() {
    const placeholder = document.getElementById('chart-placeholder');
    const canvas      = document.getElementById('expense-chart');

    if (placeholder) placeholder.hidden = true;
    if (canvas)      canvas.hidden      = false;
  }
};

// =============================================================================
// === Event Listeners / Init (Task 9) =========================================
// =============================================================================

/**
 * Bootstraps the application: loads persisted data, renders all UI components,
 * and wires the form-submit and delete event listeners.
 * Called once on DOMContentLoaded.
 */
function init() {
  // --- 9.1 Load persisted data and render initial UI -----------------------
  state.transactions = Storage.load();

  UI.renderList(state.transactions);
  UI.renderBalance(state.transactions);
  AppChart.init('expense-chart');
  AppChart.update(state.transactions);

  // If storage returned an error during load, surface an info message.
  if (state.storageError) {
    UI.showInfoMessage(state.storageError);
  }

  // --- 9.2 Form submit event listener --------------------------------------
  var form = document.getElementById('expense-form');
  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var name     = document.getElementById('expense-name').value;
      var amount   = document.getElementById('expense-amount').value;
      var category = document.getElementById('expense-category').value;

      var result = Validator.validate({ name: name, amount: amount, category: category });

      if (!result.valid) {
        UI.renderErrors(result.errors);
        return;
      }

      // Valid input 窶・clear any lingering errors, then add the transaction.
      UI.renderErrors({});
      addTransaction({ name: name, amount: amount, category: category });

      // Reset storage error state before attempting to save.
      state.storageError = null;
      Storage.save(state.transactions);

      UI.renderList(state.transactions);
      UI.renderBalance(state.transactions);
      AppChart.update(state.transactions);
      UI.clearForm();

      // Notify the user if the save failed (state.storageError was set by Storage.save).
      if (state.storageError) {
        UI.showStorageError(state.storageError);
      }
    });
  }

  // --- 9.3 Delete event listener (event delegation on the list) ------------
  var list = document.getElementById('transaction-list');
  if (list) {
    list.addEventListener('click', function (event) {
      // Only react to clicks on a delete button that carries a transaction id.
      var target = event.target;
      if (!target.classList.contains('tx-delete') || !target.dataset.id) {
        return;
      }

      var id = target.dataset.id;

      // Snapshot current state so we can revert if the save fails.
      var snapshot = state.transactions.slice();

      deleteTransaction(id);

      state.storageError = null;
      Storage.save(state.transactions);

      // If the save failed, revert the in-memory state and notify the user.
      if (state.storageError) {
        state.transactions = snapshot;
        UI.showStorageError('Could not delete the transaction. Please try again.');
        UI.renderList(state.transactions);
        return;
      }

      UI.renderList(state.transactions);
      UI.renderBalance(state.transactions);
      AppChart.update(state.transactions);
    });
  }
}

// Kick everything off once the DOM is ready.
document.addEventListener('DOMContentLoaded', init);

