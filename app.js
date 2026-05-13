const storageKey = "gastos-app-v1";
const currency = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const state = {
  month: getCurrentMonth(),
  data: loadData(),
};

const elements = {
  monthSelect: document.querySelector("#monthSelect"),
  entryForm: document.querySelector("#entryForm"),
  entryId: document.querySelector("#entryId"),
  entryType: document.querySelector("#entryType"),
  entryName: document.querySelector("#entryName"),
  entryAmount: document.querySelector("#entryAmount"),
  entryNote: document.querySelector("#entryNote"),
  saveButton: document.querySelector("#saveButton"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  totalIncome: document.querySelector("#totalIncome"),
  totalExpenses: document.querySelector("#totalExpenses"),
  balance: document.querySelector("#balance"),
  incomeList: document.querySelector("#incomeList"),
  personalList: document.querySelector("#personalList"),
  homeList: document.querySelector("#homeList"),
  incomeCount: document.querySelector("#incomeCount"),
  personalCount: document.querySelector("#personalCount"),
  homeCount: document.querySelector("#homeCount"),
  emptyStateTemplate: document.querySelector("#emptyStateTemplate"),
  barChart: document.querySelector("#barChart"),
  donutChart: document.querySelector("#donutChart"),
};

seedInitialMonth();
elements.monthSelect.value = state.month;
render();

elements.monthSelect.addEventListener("change", (event) => {
  state.month = event.target.value;
  ensureMonth(state.month);
  resetForm();
  render();
});

elements.entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const entry = {
    id: elements.entryId.value || crypto.randomUUID(),
    type: elements.entryType.value,
    name: elements.entryName.value.trim(),
    amount: Number(elements.entryAmount.value),
    note: elements.entryNote.value.trim(),
  };

  if (!entry.name || Number.isNaN(entry.amount) || entry.amount < 0) {
    return;
  }

  const entries = getMonthEntries();
  const existingIndex = entries.findIndex((item) => item.id === entry.id);
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }

  saveData();
  resetForm();
  render();
});

elements.cancelEditButton.addEventListener("click", resetForm);

document.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  const { action, id } = actionButton.dataset;
  const entries = getMonthEntries();
  const entry = entries.find((item) => item.id === id);

  if (action === "edit" && entry) {
    elements.entryId.value = entry.id;
    elements.entryType.value = entry.type;
    elements.entryName.value = entry.name;
    elements.entryAmount.value = entry.amount;
    elements.entryNote.value = entry.note;
    elements.saveButton.textContent = "Actualizar movimiento";
    elements.cancelEditButton.hidden = false;
    elements.entryName.focus();
  }

  if (action === "delete") {
    state.data[state.month] = entries.filter((item) => item.id !== id);
    saveData();
    resetForm();
    render();
  }
});

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function loadData() {
  const saved = localStorage.getItem(storageKey);
  return saved ? JSON.parse(saved) : {};
}

function saveData() {
  localStorage.setItem(storageKey, JSON.stringify(state.data));
}

function ensureMonth(month) {
  if (!state.data[month]) {
    state.data[month] = [];
    saveData();
  }
}

function seedInitialMonth() {
  ensureMonth(state.month);
  if (state.data[state.month].length > 0) return;

  state.data[state.month] = [
    { id: crypto.randomUUID(), type: "income", name: "Sueldo", amount: 1200000, note: "Ingreso principal" },
    { id: crypto.randomUUID(), type: "personal", name: "Supermercado", amount: 180000, note: "Compra mensual" },
    { id: crypto.randomUUID(), type: "home", name: "Arriendo casa", amount: 420000, note: "Pago fijo" },
  ];
  saveData();
}

function getMonthEntries() {
  ensureMonth(state.month);
  return state.data[state.month];
}

function calculateTotals() {
  const entries = getMonthEntries();
  const income = sumByType(entries, "income");
  const personal = sumByType(entries, "personal");
  const home = sumByType(entries, "home");
  const expenses = personal + home;
  return { income, personal, home, expenses, balance: income - expenses };
}

function sumByType(entries, type) {
  return entries.filter((entry) => entry.type === type).reduce((total, entry) => total + entry.amount, 0);
}

function render() {
  const totals = calculateTotals();
  elements.totalIncome.textContent = currency.format(totals.income);
  elements.totalExpenses.textContent = currency.format(totals.expenses);
  elements.balance.textContent = currency.format(totals.balance);

  renderList("income", elements.incomeList, elements.incomeCount);
  renderList("personal", elements.personalList, elements.personalCount);
  renderList("home", elements.homeList, elements.homeCount);
  drawBarChart(totals);
  drawDonutChart(totals);
}

function renderList(type, container, counter) {
  const entries = getMonthEntries().filter((entry) => entry.type === type);
  counter.textContent = entries.length;
  container.replaceChildren();

  if (entries.length === 0) {
    container.append(elements.emptyStateTemplate.content.cloneNode(true));
    return;
  }

  entries.forEach((entry) => {
    const article = document.createElement("article");
    article.className = "entry-item";
    article.innerHTML = `
      <div>
        <h3>${escapeHtml(entry.name)}</h3>
        <p>${escapeHtml(entry.note || "Sin nota")}</p>
      </div>
      <div>
        <div class="entry-amount">${currency.format(entry.amount)}</div>
        <div class="entry-actions">
          <button class="edit" type="button" data-action="edit" data-id="${entry.id}">Editar</button>
          <button class="danger" type="button" data-action="delete" data-id="${entry.id}">Eliminar</button>
        </div>
      </div>
    `;
    container.append(article);
  });
}

function drawBarChart({ income, personal, home, expenses, balance }) {
  const canvas = elements.barChart;
  const context = canvas.getContext("2d");
  const values = [
    { label: "Ingresos", value: income, color: "#16a34a" },
    { label: "Personales", value: personal, color: "#f97316" },
    { label: "Casas", value: home, color: "#8b5cf6" },
    { label: "Saldo", value: balance, color: balance >= 0 ? "#2563eb" : "#ef4444" },
  ];
  const max = Math.max(...values.map((item) => Math.abs(item.value)), 1);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = "700 14px Inter, sans-serif";
  context.textAlign = "center";

  const chartHeight = 190;
  const chartTop = 42;
  const baseY = chartTop + chartHeight;
  const barWidth = 74;
  const gap = (canvas.width - values.length * barWidth) / (values.length + 1);

  context.strokeStyle = "#e2e8f0";
  context.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = chartTop + (chartHeight / 4) * i;
    context.beginPath();
    context.moveTo(28, y);
    context.lineTo(canvas.width - 20, y);
    context.stroke();
  }

  values.forEach((item, index) => {
    const x = gap + index * (barWidth + gap);
    const barHeight = Math.max((Math.abs(item.value) / max) * chartHeight, item.value === 0 ? 0 : 8);
    const y = item.value >= 0 ? baseY - barHeight : baseY;

    roundRect(context, x, y, barWidth, barHeight, 16, item.color);
    context.fillStyle = "#102033";
    context.fillText(currency.format(item.value), x + barWidth / 2, y - 12);
    context.fillStyle = "#607084";
    context.fillText(item.label, x + barWidth / 2, baseY + 34);
  });

  context.fillStyle = "#607084";
  context.textAlign = "left";
  context.fillText(`Egresos totales: ${currency.format(expenses)}`, 30, 294);
}

function drawDonutChart({ personal, home }) {
  const canvas = elements.donutChart;
  const context = canvas.getContext("2d");
  const total = personal + home;
  const centerX = canvas.width / 2;
  const centerY = 140;
  const radius = 94;

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (total === 0) {
    context.fillStyle = "#607084";
    context.font = "700 16px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText("Sin gastos para graficar", centerX, centerY);
    return;
  }

  let startAngle = -Math.PI / 2;
  [
    { value: personal, color: "#f97316" },
    { value: home, color: "#8b5cf6" },
  ].forEach((slice) => {
    const endAngle = startAngle + (slice.value / total) * Math.PI * 2;
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.arc(centerX, centerY, radius, startAngle, endAngle);
    context.closePath();
    context.fillStyle = slice.color;
    context.fill();
    startAngle = endAngle;
  });

  context.beginPath();
  context.arc(centerX, centerY, 54, 0, Math.PI * 2);
  context.fillStyle = "#fff";
  context.fill();
  context.fillStyle = "#102033";
  context.font = "900 18px Inter, sans-serif";
  context.textAlign = "center";
  context.fillText(currency.format(total), centerX, centerY + 6);
}

function roundRect(context, x, y, width, height, radius, color) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height);
  context.lineTo(x, y + height);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();
}

function resetForm() {
  elements.entryForm.reset();
  elements.entryId.value = "";
  elements.entryType.value = "income";
  elements.saveButton.textContent = "Guardar movimiento";
  elements.cancelEditButton.hidden = true;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;",
  }[character]));
}
