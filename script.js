// NOTION FINANCE TRACKER ENGINE & INTERACTION LOGIC

// DEFAULT STATE & FINANCIAL DATABASE
const appState = {
  theme: localStorage.getItem('notion_theme') || 'light',
  activeTab: 'dashboard',
  income: {
    annualGross: 0,
    sideHustle: 0,
    other: 0
  },
  expenses: [],
  categoryLimits: [
    { category: 'Housing & Rent', icon: '<i class="fa-solid fa-house"></i>', limit: 1000 },
    { category: 'Utilities & Bills', icon: '<i class="fa-solid fa-bolt"></i>', limit: 300 },
    { category: 'Food & Groceries', icon: '<i class="fa-solid fa-cart-shopping"></i>', limit: 400 },
    { category: 'Transport & Car', icon: '<i class="fa-solid fa-car"></i>', limit: 200 },
    { category: 'Entertainment & Leisure', icon: '<i class="fa-solid fa-film"></i>', limit: 250 },
    { category: 'Subscriptions', icon: '<i class="fa-solid fa-mobile-screen"></i>', limit: 60 },
    { category: 'Savings & Investments', icon: '<i class="fa-solid fa-piggy-bank"></i>', limit: 500 },
    { category: 'Other', icon: '<i class="fa-solid fa-box"></i>', limit: 150 }
  ],
  events: [],
  calendarDate: new Date()
};

// CHART REFERENCES
let doughnutChartInstance = null;
let barChartInstance = null;

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initIncomeForm();
  initExpenses();
  initCalendar();
  initCategoriesDatabase();
  initExportListeners();
  recalculateAll();

  // BACKSPACE KEY LISTENER (Return to Home Page if not typing in an input field)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' || e.keyCode === 8) {
      const activeEl = document.activeElement;
      const tag = activeEl ? activeEl.tagName.toLowerCase() : '';
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || (activeEl && activeEl.isContentEditable);
      
      if (!isInput) {
        e.preventDefault();
        if (typeof window.logoutToLanding === 'function') {
          window.logoutToLanding();
        }
      }
    }
  });
});

// GLOBAL VIEW SWITCHERS
window.launchAppDirectly = function() {
  const landing = document.getElementById('landingView');
  const app = document.getElementById('appContainer');
  if (landing) landing.classList.add('hidden');
  if (app) {
    app.classList.remove('hidden');
    app.style.display = 'flex';
  }
  recalculateAll();
};

window.logoutToLanding = function() {
  const landing = document.getElementById('landingView');
  const app = document.getElementById('appContainer');
  if (app) {
    app.classList.add('hidden');
    app.style.display = 'none';
  }
  if (landing) landing.classList.remove('hidden');
};

// THEME SYSTEM
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  document.documentElement.setAttribute('data-theme', appState.theme);
  themeToggle.checked = appState.theme === 'dark';

  themeToggle.addEventListener('change', (e) => {
    appState.theme = e.target.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', appState.theme);
    localStorage.setItem('notion_theme', appState.theme);
    renderCharts();
  });
}

// NAVIGATION SYSTEM
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  appState.activeTab = tabId;
  
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Update tab panel visibility
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.toggle('active', tab.id === `tab-${tabId}`);
  });

  // Update breadcrumb title
  const titles = {
    'dashboard': 'Overview & Analytics',
    'income-expenses': 'Income & Outgoings',
    'calendar': 'Event Calendar',
    'instructions': 'User Guide & Instructions',
    'categories': 'Budget Categories',
    'export': 'Export (Excel & PDF)'
  };
  document.getElementById('crumbTitle').textContent = titles[tabId] || 'Overview';

  // Render dynamic views on switch
  if (tabId === 'dashboard') {
    setTimeout(renderCharts, 50);
  } else if (tabId === 'calendar') {
    renderCalendar();
  }
}

// UK TAX & NI CALCULATOR ENGINE
function calculateUKTaxAndNI(annualGross) {
  let tax = 0;
  let ni = 0;

  // Personal Allowance: £12,570
  if (annualGross > 12570) {
    const taxableIncome = Math.min(annualGross, 50270) - 12570;
    tax += taxableIncome * 0.20; // Basic Rate 20%
  }
  if (annualGross > 50270) {
    const higherTaxable = Math.min(annualGross, 125140) - 50270;
    tax += higherTaxable * 0.40; // Higher Rate 40%
  }

  // National Insurance (Class 1) - Threshold ~£12,570
  if (annualGross > 12570) {
    const niSubject = Math.min(annualGross, 50270) - 12570;
    ni += niSubject * 0.08; // 8% main rate
  }
  if (annualGross > 50270) {
    const niHigher = annualGross - 50270;
    ni += niHigher * 0.02; // 2% higher rate
  }

  const totalDeductionsAnnual = tax + ni;
  const netSalaryAnnual = Math.max(0, annualGross - totalDeductionsAnnual);

  return {
    annualGross,
    monthlyGross: annualGross / 12,
    monthlyTaxAndNI: totalDeductionsAnnual / 12,
    monthlyNetSalary: netSalaryAnnual / 12
  };
}

// INCOME FORM CONTROLLER
function initIncomeForm() {
  const salaryInput = document.getElementById('annualGrossSalary');
  const sideInput = document.getElementById('sideHustleIncome');
  const otherInput = document.getElementById('otherIncome');

  const handleIncomeChange = () => {
    appState.income.annualGross = parseFloat(salaryInput.value) || 0;
    appState.income.sideHustle = parseFloat(sideInput.value) || 0;
    appState.income.other = parseFloat(otherInput.value) || 0;
    recalculateAll();
  };

  salaryInput.addEventListener('input', handleIncomeChange);
  sideInput.addEventListener('input', handleIncomeChange);
  otherInput.addEventListener('input', handleIncomeChange);
}

// EXPENSES MANAGER & TABLE
function initExpenses() {
  const btnAddExpense = document.getElementById('btnAddExpense');
  const modal = document.getElementById('expenseModal');
  const closeModal = document.getElementById('closeExpenseModal');
  const modalForm = document.getElementById('modalExpenseForm');

  btnAddExpense.addEventListener('click', () => {
    modalForm.reset();
    modal.classList.add('active');
  });

  closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newExpense = {
      id: Date.now(),
      category: document.getElementById('modalExpenseCategory').value,
      description: document.getElementById('modalExpenseDesc').value,
      type: document.getElementById('modalExpenseType').value,
      amount: parseFloat(document.getElementById('modalExpenseAmount').value) || 0
    };

    appState.expenses.push(newExpense);
    modal.classList.remove('active');
    recalculateAll();
  });
}

function renderExpensesTable() {
  const tbody = document.getElementById('expensesTableBody');
  tbody.innerHTML = '';

  appState.expenses.forEach(exp => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge blue">${exp.category}</span></td>
      <td>${exp.description}</td>
      <td><span class="badge gray">${exp.type}</span></td>
      <td class="text-right"><strong>£${exp.amount.toFixed(2)}</strong></td>
      <td class="text-center">
        <button class="btn btn-sm btn-icon" onclick="deleteExpense(${exp.id})" title="Delete"><i class="fa-solid fa-trash text-danger"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteExpense = function(id) {
  appState.expenses = appState.expenses.filter(e => e.id !== id);
  recalculateAll();
};

// CATEGORIES DATABASE RENDERER
function initCategoriesDatabase() {
  renderCategoriesDatabase();
}

function renderCategoriesDatabase() {
  const tbody = document.getElementById('categoryDatabaseBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  appState.categoryLimits.forEach(cat => {
    // calculate current spent
    const spent = appState.expenses
      .filter(e => e.category === cat.category)
      .reduce((sum, e) => sum + e.amount, 0);

    const isOver = spent > cat.limit;
    const percentage = cat.limit > 0 ? Math.min(100, Math.round((spent / cat.limit) * 100)) : 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${cat.category}</strong></td>
      <td style="font-size: 1.2rem;">${cat.icon}</td>
      <td>£${cat.limit.toFixed(2)}</td>
      <td><strong>£${spent.toFixed(2)}</strong></td>
      <td>
        <span class="badge ${isOver ? 'red' : 'green'}">
          ${isOver ? `Over limit by £${(spent - cat.limit).toFixed(2)}` : `${percentage}% of limit`}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// MAIN FINANCIAL RECALCULATOR & UI UPDATER
function recalculateAll() {
  const taxCalc = calculateUKTaxAndNI(appState.income.annualGross);
  const totalGrossMonthly = taxCalc.monthlyGross + appState.income.sideHustle + appState.income.other;
  const netTakeHomeMonthly = taxCalc.monthlyNetSalary + appState.income.sideHustle + appState.income.other;

  const totalMonthlyOutgoings = appState.expenses.reduce((sum, e) => sum + e.amount, 0);
  const netMonthlySurplus = netTakeHomeMonthly - totalMonthlyOutgoings;
  const savingsRate = netTakeHomeMonthly > 0 ? Math.max(0, Math.round((netMonthlySurplus / netTakeHomeMonthly) * 100)) : 0;

  // Format currency helpers
  const fmt = val => `£${val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Quick stats bar
  document.getElementById('statNetSalary').textContent = fmt(netTakeHomeMonthly);
  document.getElementById('statTotalExpenses').textContent = fmt(totalMonthlyOutgoings);
  document.getElementById('statMonthlySurplus').textContent = fmt(netMonthlySurplus);
  document.getElementById('statSavingsRate').textContent = `${savingsRate}%`;

  // Summary box in Income Tab
  document.getElementById('summaryGrossMonthly').textContent = fmt(totalGrossMonthly);
  document.getElementById('summaryMonthlyTax').textContent = `-${fmt(taxCalc.monthlyTaxAndNI)}`;
  document.getElementById('summaryNetMonthly').textContent = fmt(netTakeHomeMonthly);
  document.getElementById('summaryTotalOutgoings').textContent = fmt(totalMonthlyOutgoings);

  // Cash flow visual diagram
  document.getElementById('diagramGrossIncome').textContent = fmt(totalGrossMonthly);
  document.getElementById('diagramTax').textContent = fmt(taxCalc.monthlyTaxAndNI);
  document.getElementById('diagramNetIncome').textContent = fmt(netTakeHomeMonthly);
  document.getElementById('diagramTotalOutgoings').textContent = fmt(totalMonthlyOutgoings);
  document.getElementById('diagramSurplus').textContent = fmt(netMonthlySurplus);

  // Progress bars in Cash Flow Diagram
  const outgoingsPercent = netTakeHomeMonthly > 0 ? Math.min(100, (totalMonthlyOutgoings / netTakeHomeMonthly) * 100) : 0;
  const surplusPercent = netTakeHomeMonthly > 0 ? Math.max(0, 100 - outgoingsPercent) : 0;
  document.getElementById('outgoingsProgressBar').style.width = `${outgoingsPercent}%`;
  document.getElementById('surplusProgressBar').style.width = `${surplusPercent}%`;

  // Render components
  renderExpensesTable();
  renderCategoriesDatabase();
  renderDashboardEventsList();
  if (appState.activeTab === 'dashboard') {
    renderCharts();
  }

  // AUTO SAVE STATE TO FIREBASE & LOCAL STORAGE
  persistAppState();
}

function persistAppState() {
  const currentUser = window.firebaseAuth ? window.firebaseAuth.getCurrentUser() : null;
  const financeData = {
    income: appState.income,
    expenses: appState.expenses,
    events: appState.events
  };

  if (currentUser && currentUser.userId) {
    if (window.firebaseAuth && window.firebaseAuth.saveFinanceData) {
      window.firebaseAuth.saveFinanceData(currentUser.userId, financeData);
    }
  } else {
    // Fallback if guest user
    localStorage.setItem('grace_guest_finance_data', JSON.stringify(financeData));
  }
}

// CHARTS ENGINE (CHART.JS)
function renderCharts() {
  const isDark = appState.theme === 'dark';
  const textColor = isDark ? '#a4a4a4' : '#6b6b6b';
  const gridColor = isDark ? '#2f2f2f' : '#e1e0da';

  // 1. Doughnut Chart: Expenses by Category
  const categoryTotals = {};
  appState.expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const doughnutCtx = document.getElementById('categoryDoughnutChart').getContext('2d');
  if (doughnutChartInstance) doughnutChartInstance.destroy();

  doughnutChartInstance = new Chart(doughnutCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [{
        data: Object.values(categoryTotals),
        backgroundColor: ['#2eaadc', '#0f7b6c', '#eb5757', '#dfab01', '#9065b0', '#e07a5f', '#3d5a80'],
        borderWidth: 2,
        borderColor: isDark ? '#202020' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: textColor, font: { family: 'Inter', size: 11 } } }
      }
    }
  });

  // 2. Bar Chart: 12-Month Projection
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const taxCalc = calculateUKTaxAndNI(appState.income.annualGross);
  const netTakeHome = taxCalc.monthlyNetSalary + appState.income.sideHustle + appState.income.other;
  const outgoings = appState.expenses.reduce((s, e) => s + e.amount, 0);

  const barCtx = document.getElementById('annualBarChart').getContext('2d');
  if (barChartInstance) barChartInstance.destroy();

  barChartInstance = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Net Take-Home Pay',
          data: Array(12).fill(netTakeHome),
          backgroundColor: '#0f7b6c'
        },
        {
          label: 'Monthly Outgoings',
          data: Array(12).fill(outgoings),
          backgroundColor: '#eb5757'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } }
      },
      plugins: {
        legend: { labels: { color: textColor } }
      }
    }
  });
}

// EVENT CALENDAR SYSTEM
function initCalendar() {
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    appState.calendarDate.setMonth(appState.calendarDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    appState.calendarDate.setMonth(appState.calendarDate.getMonth() + 1);
    renderCalendar();
  });

  document.getElementById('eventForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const newEvent = {
      id: Date.now(),
      title: document.getElementById('eventTitle').value,
      date: document.getElementById('eventDate').value,
      type: document.getElementById('eventType').value,
      amount: parseFloat(document.getElementById('eventAmount').value) || 0
    };

    appState.events.push(newEvent);
    document.getElementById('eventForm').reset();
    renderCalendar();
    renderDashboardEventsList();
  });
}

function renderCalendar() {
  const monthYearTitle = document.getElementById('currentMonthYearTitle');
  const calendarDays = document.getElementById('calendarDays');
  calendarDays.innerHTML = '';

  const date = appState.calendarDate;
  const year = date.getFullYear();
  const month = date.getMonth();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  monthYearTitle.textContent = `${monthNames[month]} ${year}`;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const prevLastDay = new Date(year, month, 0).getDate();

  // Prev month padded days
  for (let x = firstDayIndex; x > 0; x--) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day-cell other-month';
    dayDiv.innerHTML = `<span class="day-number">${prevLastDay - x + 1}</span>`;
    calendarDays.appendChild(dayDiv);
  }

  // Current month days
  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 1; i <= lastDay; i++) {
    const currentFormattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day-cell';
    if (currentFormattedDate === todayStr) dayDiv.classList.add('today');

    // Find events for this date
    const dayEvents = appState.events.filter(e => e.date === currentFormattedDate);
    let eventsHTML = dayEvents.map(e => `
      <div class="event-dot ${e.type}">
        ${e.type === 'expense' ? '-' : '+'}£${e.amount} ${e.title}
      </div>
    `).join('');

    dayDiv.innerHTML = `
      <span class="day-number">${i}</span>
      <div class="day-events">${eventsHTML}</div>
    `;
    calendarDays.appendChild(dayDiv);
  }

  renderEventsList();
}

function renderEventsList() {
  const listContainer = document.getElementById('eventsFullList');
  listContainer.innerHTML = '';

  if (appState.events.length === 0) {
    listContainer.innerHTML = '<div class="empty-state">No events scheduled.</div>';
    return;
  }

  appState.events.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(ev => {
    const item = document.createElement('div');
    item.className = 'event-list-item notion-block card mt-2';
    item.style.padding = '10px 14px';
    item.style.marginBottom = '8px';
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong>${ev.title}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${ev.date}</div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="badge ${ev.type === 'expense' ? 'red' : 'green'}">
            ${ev.type === 'expense' ? '-' : '+'}£${ev.amount.toFixed(2)}
          </span>
          <button class="btn btn-sm btn-icon" onclick="deleteEvent(${ev.id})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

function renderDashboardEventsList() {
  const container = document.getElementById('dashboardEventsList');
  if (!container) return;
  container.innerHTML = '';

  if (appState.events.length === 0) {
    container.innerHTML = '<div class="empty-state">No upcoming financial events logged yet.</div>';
    return;
  }

  appState.events.slice(0, 4).forEach(ev => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifySpaceBetween = 'space-between';
    div.style.padding = '8px 0';
    div.style.borderBottom = '1px solid var(--border-subtle)';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; width:100%;">
        <span><strong>${ev.title}</strong> (${ev.date})</span>
        <span class="badge ${ev.type === 'expense' ? 'red' : 'green'}">${ev.type === 'expense' ? '-' : '+'}£${ev.amount}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

window.deleteEvent = function(id) {
  appState.events = appState.events.filter(e => e.id !== id);
  renderCalendar();
  renderDashboardEventsList();
};

// DYNAMIC EXPORT LOGIC: EXCEL (.XLSX) WITH FORMULAS & PDF REPORT
function initExportListeners() {
  document.getElementById('btnExportExcel').addEventListener('click', generateExcelWithFormulas);
  document.getElementById('btnExportPDF').addEventListener('click', generatePDFReport);
}

// 1. DYNAMIC EXCEL EXPORT (EXCELJS WITH REAL FORMULAS)
async function generateExcelWithFormulas() {
  if (typeof ExcelJS === 'undefined') {
    alert('ExcelJS library is loading. Please try again in a moment.');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Notion Finance Tracker';
  workbook.created = new Date();

  // WORKSHEET 1: BUDGET SUMMARY & FORMULAS
  const ws = workbook.addWorksheet('Personal Finance Summary');

  // Set column widths
  ws.columns = [
    { header: 'Item / Category', key: 'item', width: 30 },
    { header: 'Description / Type', key: 'desc', width: 25 },
    { header: 'Amount (£)', key: 'amount', width: 18 }
  ];

  // Title Row
  ws.mergeCells('A1:C1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'UK PERSONAL FINANCE TRACKER (DYNAMIC FORMULAS)';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2EAADC' } };
  titleCell.alignment = { horizontal: 'center' };

  // Section 1: Income Inputs
  ws.addRow([]);
  const incHeader = ws.addRow(['1. MONTHLY INCOME INPUTS', '', '']);
  incHeader.font = { bold: true, color: { argb: 'FF0F7B6C' } };

  const rGross = ws.addRow(['Annual Gross Salary', 'User Input Salary', appState.income.annualGross]);
  rGross.getCell(3).numFmt = '£#,##0.00';

  const rSide = ws.addRow(['Side Hustle / Freelancing', 'Monthly Input', appState.income.sideHustle]);
  rSide.getCell(3).numFmt = '£#,##0.00';

  const rOther = ws.addRow(['Other Monthly Income', 'Dividends / Extra', appState.income.other]);
  rOther.getCell(3).numFmt = '£#,##0.00';

  // Gross Monthly Formula: = (C4 / 12) + C5 + C6
  const rGrossMonthly = ws.addRow(['Gross Monthly Total', 'Formula: =(Gross/12)+Side+Other', { formula: '=(C4/12)+C5+C6' }]);
  rGrossMonthly.font = { bold: true };
  rGrossMonthly.getCell(3).numFmt = '£#,##0.00';

  // Estimated Tax & NI Formula: = IF(C4>12570, ((C4-12570)*0.28)/12, 0)
  const rTaxMonthly = ws.addRow(['Est. UK Tax & NI (Monthly)', 'Formula Estimate', { formula: '=IF(C4>12570, ((C4-12570)*0.28)/12, 0)' }]);
  rTaxMonthly.font = { italic: true, color: { argb: 'FFEB5757' } };
  rTaxMonthly.getCell(3).numFmt = '-£#,##0.00';

  // Net Take-Home Pay Formula: = C7 - C8
  const rNetMonthly = ws.addRow(['NET TAKE-HOME PAY (MONTHLY)', 'Formula: Gross - Tax', { formula: '=C7-C8' }]);
  rNetMonthly.font = { bold: true, size: 11, color: { argb: 'FF0F7B6C' } };
  rNetMonthly.getCell(3).numFmt = '£#,##0.00';
  rNetMonthly.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF6F5' } };

  // Section 2: Outgoings & Expenses Table
  ws.addRow([]);
  const expHeader = ws.addRow(['2. MONTHLY OUTGOINGS LIST', '', '']);
  expHeader.font = { bold: true, color: { argb: 'FFEB5757' } };

  const startExpenseRowIndex = 13;
  appState.expenses.forEach(exp => {
    const row = ws.addRow([exp.category, exp.description, exp.amount]);
    row.getCell(3).numFmt = '£#,##0.00';
  });
  const endExpenseRowIndex = startExpenseRowIndex + appState.expenses.length - 1;

  // Total Outgoings Formula: =SUM(C13:C18)
  const rTotalExp = ws.addRow([
    'TOTAL MONTHLY OUTGOINGS', 
    `Formula: =SUM(C${startExpenseRowIndex}:C${endExpenseRowIndex})`, 
    { formula: `=SUM(C${startExpenseRowIndex}:C${endExpenseRowIndex})` }
  ]);
  rTotalExp.font = { bold: true, size: 11, color: { argb: 'FFEB5757' } };
  const totalExpRowIndex = rTotalExp.number;
  rTotalExp.getCell(3).numFmt = '£#,##0.00';
  rTotalExp.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDEBEB' } };

  // Section 3: Final Monthly Balance & Surplus
  ws.addRow([]);
  const rSurplus = ws.addRow([
    'NET MONTHLY SURPLUS / SAVINGS', 
    'Formula: Net Income - Total Expenses', 
    { formula: `=C9-C${totalExpRowIndex}` }
  ]);
  rSurplus.font = { bold: true, size: 12, color: { argb: 'FF0F7B6C' } };
  rSurplus.getCell(3).numFmt = '£#,##0.00';
  rSurplus.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4F9' } };

  // Generate File & Trigger Browser Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Notion_Finance_Tracker_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// 2. PDF REPORT GENERATOR
function generatePDFReport() {
  const element = document.getElementById('reportArea');
  const opt = {
    margin: 0.3,
    filename: `Finance_Report_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}
