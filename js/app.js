/* Expense & Budget Visualizer - app.js */

/* ============================================================
   STATE
   ============================================================ */

var state = {
  transactions: [],
  storageError: null
};

function addTransaction(opts) {
  var name = opts.name;
  var amount = opts.amount;
  var category = opts.category;
  var id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString();
  state.transactions.push({
    id: id,
    name: name.trim(),
    amount: parseFloat(amount),
    category: category,
    createdAt: new Date().toISOString()
  });
}

function deleteTransaction(id) {
  var index = state.transactions.findIndex(function (t) { return t.id === id; });
  if (index !== -1) state.transactions.splice(index, 1);
}

/* ============================================================
   STORAGE
   ============================================================ */

var STORAGE_KEY = 'ebv_transactions';

var Storage = {
  save: function (transactions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (err) {
      var msg = 'Could not save your data. Changes will be lost when you close this page.';
      state.storageError = msg;
      if (typeof UI !== 'undefined' && typeof UI.showStorageError === 'function') {
        UI.showStorageError(msg);
      }
    }
  },
  load: function () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('not array');
      return parsed;
    } catch (err) {
      state.storageError = 'Could not load your saved data. Starting with an empty transaction list.';
      return [];
    }
  }
};

/* ============================================================
   VALIDATOR
   ============================================================ */

var VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

var Validator = {
  validate: function (opts) {
    var name = opts.name;
    var amount = opts.amount;
    var category = opts.category;
    var errors = {};

    var trimmedName = (typeof name === 'string') ? name.trim() : '';
    if (!trimmedName) {
      errors.name = 'Name is required.';
    } else if (trimmedName.length > 100) {
      errors.name = 'Item name must not exceed 100 characters.';
    }

    var rawAmount = (typeof amount === 'string') ? amount.trim() : String(amount != null ? amount : '');
    if (!rawAmount) {
      errors.amount = 'Amount is required.';
    } else {
      var n = Number(rawAmount);
      if (isNaN(n) || n < 0.01 || n > 999999999.99) {
        errors.amount = 'Amount must be a number between 0.01 and 999,999,999.99.';
      }
    }

    if (!category || VALID_CATEGORIES.indexOf(category) === -1) {
      errors.category = 'Category is required.';
    }

    return { valid: Object.keys(errors).length === 0, errors: errors };
  }
};

/* ============================================================
   BALANCE HELPER
   ============================================================ */

function calculateBalance(transactions) {
  if (!transactions || transactions.length === 0) return '0.00';
  var total = transactions.reduce(function (sum, tx) { return sum + tx.amount; }, 0);
  return total.toFixed(2);
}

/* ============================================================
   UI
   ============================================================ */

var UI = {
  renderList: function (transactions) {
    var list = document.getElementById('transaction-list');
    if (!list) return;
    list.innerHTML = '';

    if (!transactions || transactions.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'transaction-empty';
      empty.textContent = 'No expenses added yet.';
      list.appendChild(empty);
      return;
    }

    transactions.forEach(function (tx) {
      var li = document.createElement('li');
      li.className = 'transaction-item';
      li.dataset.id = tx.id;

      var ns = document.createElement('span');
      ns.className = 'tx-name';
      ns.textContent = tx.name;

      var as = document.createElement('span');
      as.className = 'tx-amount';
      as.textContent = '$' + tx.amount.toFixed(2);

      var cs = document.createElement('span');
      cs.className = 'tx-category';
      cs.textContent = tx.category;

      var db = document.createElement('button');
      db.className = 'tx-delete';
      db.type = 'button';
      db.dataset.id = tx.id;
      db.setAttribute('aria-label', 'Delete transaction: ' + tx.name);
      db.textContent = 'Delete';

      li.appendChild(ns);
      li.appendChild(as);
      li.appendChild(cs);
      li.appendChild(db);
      list.appendChild(li);
    });
  },

  renderBalance: function (transactions) {
    var display = document.getElementById('balance-display');
    if (display) display.textContent = calculateBalance(transactions);
  },

  renderErrors: function (errors) {
    document.querySelectorAll('.error-msg').forEach(function (s) { s.textContent = ''; });
    if (!errors) return;
    var map = { name: 'error-name', amount: 'error-amount', category: 'error-category' };
    Object.keys(map).forEach(function (f) {
      if (errors[f]) {
        var el = document.getElementById(map[f]);
        if (el) el.textContent = errors[f];
      }
    });
  },

  clearForm: function () {
    var form = document.getElementById('expense-form');
    if (form) form.reset();
    this.renderErrors({});
  },

  showInfoMessage: function (message) {
    var banner = document.getElementById('info-banner');
    if (!banner) return;
    banner.textContent = message;
    banner.hidden = false;
    setTimeout(function () {
      banner.hidden = true;
      banner.textContent = '';
    }, 5000);
  },

  showStorageError: function (message) {
    var banner = document.getElementById('error-banner');
    var msgSpan = document.getElementById('error-banner-msg');
    var closeBtn = document.getElementById('error-banner-close');
    if (!banner || !msgSpan) return;
    msgSpan.textContent = message;
    banner.hidden = false;
    if (closeBtn && !closeBtn._dismissWired) {
      closeBtn.addEventListener('click', function () {
        banner.hidden = true;
        msgSpan.textContent = '';
      });
      closeBtn._dismissWired = true;
    }
  }
};

/* ============================================================
   CHART
   ============================================================ */

var AppChart = {
  _instance: null,
  _COLORS: { Food: '#e05c2f', Transport: '#2f7fe0', Fun: '#2fc97e' },

  computeData: function (transactions) {
    var CATS = ['Food', 'Transport', 'Fun'];
    var totals = { Food: 0, Transport: 0, Fun: 0 };
    (transactions || []).forEach(function (tx) {
      if (Object.prototype.hasOwnProperty.call(totals, tx.category)) {
        totals[tx.category] += tx.amount;
      }
    });
    var grand = CATS.reduce(function (s, c) { return s + totals[c]; }, 0);
    if (grand === 0) return { labels: [], data: [], percentages: [] };
    var labels = [], data = [], percentages = [];
    CATS.forEach(function (cat) {
      var r = Math.round((totals[cat] / grand) * 1000) / 10;
      if (r === 0) return;
      labels.push(cat + ' (' + r.toFixed(1) + '%)');
      data.push(totals[cat]);
      percentages.push(r);
    });
    return { labels: labels, data: data, percentages: percentages };
  },

  init: function (canvasId) {
    var ChartJS = (typeof window.Chart !== 'undefined') ? window.Chart : null;
    if (!ChartJS) { this._showPlaceholder('Chart library could not be loaded.'); return; }
    var canvas = document.getElementById(canvasId);
    if (!canvas) { this._showPlaceholder('Chart canvas element not found.'); return; }
    try {
      this._instance = new ChartJS(canvas, {
        type: 'pie',
        data: {
          labels: [],
          datasets: [{
            data: [],
            backgroundColor: [],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: { font: { size: 14 }, color: '#1a1a1a', padding: 16 }
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return ' $' + (ctx.parsed || 0).toFixed(2) + ' - ' + (ctx.label || '');
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

  update: function (transactions) {
    var res = this.computeData(transactions);
    if (res.labels.length === 0) {
      this._showPlaceholder('No data to visualize yet.');
      return;
    }
    this._hidePlaceholder();
    if (!this._instance) return;
    var self = this;
    var bgColors = res.labels.map(function (l) {
      var c = l.split(' (')[0];
      return self._COLORS[c] || '#999';
    });
    this._instance.data.labels = res.labels;
    this._instance.data.datasets[0].data = res.data;
    this._instance.data.datasets[0].backgroundColor = bgColors;
    this._instance.update();
  },

  _showPlaceholder: function (msg) {
    var ph = document.getElementById('chart-placeholder');
    var cv = document.getElementById('expense-chart');
    if (ph) { var p = ph.querySelector('p'); if (p) p.textContent = msg; ph.hidden = false; }
    if (cv) cv.hidden = true;
  },

  _hidePlaceholder: function () {
    var ph = document.getElementById('chart-placeholder');
    var cv = document.getElementById('expense-chart');
    if (ph) ph.hidden = true;
    if (cv) cv.hidden = false;
  }
};

/* ============================================================
   INIT
   ============================================================ */

function init() {
  state.transactions = Storage.load();
  UI.renderList(state.transactions);
  UI.renderBalance(state.transactions);
  AppChart.init('expense-chart');
  AppChart.update(state.transactions);
  if (state.storageError) UI.showInfoMessage(state.storageError);

  var form = document.getElementById('expense-form');
  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var name     = document.getElementById('expense-name').value;
      var amount   = document.getElementById('expense-amount').value;
      var category = document.getElementById('expense-category').value;
      var result   = Validator.validate({ name: name, amount: amount, category: category });
      if (!result.valid) { UI.renderErrors(result.errors); return; }
      UI.renderErrors({});
      addTransaction({ name: name, amount: amount, category: category });
      state.storageError = null;
      Storage.save(state.transactions);
      UI.renderList(state.transactions);
      UI.renderBalance(state.transactions);
      AppChart.update(state.transactions);
      UI.clearForm();
      if (state.storageError) UI.showStorageError(state.storageError);
    });
  }

  var list = document.getElementById('transaction-list');
  if (list) {
    list.addEventListener('click', function (event) {
      var target = event.target;
      if (!target.classList.contains('tx-delete') || !target.dataset.id) return;
      var id = target.dataset.id;
      var snapshot = state.transactions.slice();
      deleteTransaction(id);
      state.storageError = null;
      Storage.save(state.transactions);
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

document.addEventListener('DOMContentLoaded', init);
