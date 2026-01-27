// assets/js/carbonpolicy-sim.js
// One-outcome-at-a-time CarbonPolicy Simulator
// Controls: market, instrument (Tax/Subsidy), cbam (0/1), level (discrete slider), outcome (dropdown)
// Data: /assets/data/dashboard_paths.csv

(async function () {
  const CSV_URL = "/assets/data/dashboard_paths.csv";

  const elMarket = document.getElementById("ctrl-market");
  const elInstrument = document.getElementById("ctrl-instrument");
  const elCbam = document.getElementById("ctrl-cbam");
  const elLevel = document.getElementById("ctrl-level");
  const elLevelLabel = document.getElementById("ctrl-level-label");
  const elOutcome = document.getElementById("ctrl-outcome");

  const PLOT_ID = "plot-main";

  let rows = [];
  let levelGrid = []; // discrete levels for current (market,instrument,cbam)

  // Define selectable outcomes (filtered to those present in CSV at runtime)
  const OUTCOMES = [
    { key: "price", label: "Price" },
    { key: "marketQuantity", label: "Market quantity" },
    { key: "imports", label: "Imports" },
    { key: "leakage", label: "Leakage" },

    { key: "quantityProduced_total", label: "Domestic output (total)" },
    { key: "profit_total", label: "Profit (total)" },
    { key: "investCost_total", label: "Investment cost (total)" },
    { key: "emissions_total", label: "Emissions (total)" },

    { key: "consumerSurplus", label: "Consumer surplus" },
    { key: "carbonRevenue", label: "Carbon revenue" },
    { key: "damage", label: "Damage" },
    { key: "importProfit", label: "Import profit" },
  ];

  function parseNum(x) {
    const v = Number(x);
    return Number.isFinite(v) ? v : null;
  }

  function uniqSorted(arr) {
    return [...new Set(arr)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }

  function outcomeLabel(key) {
    const o = OUTCOMES.find(x => x.key === key);
    return o ? o.label : key;
  }

  function updateLevelGrid(market, instrument, cbam) {
    const candidates = rows.filter(r =>
      r.market === market &&
      r.instrument === instrument &&
      r.cbam === cbam
    );

    levelGrid = uniqSorted(candidates.map(r => r.level));

    elLevel.min = 0;
    elLevel.max = Math.max(0, levelGrid.length - 1);
    elLevel.step = 1;

    const idxCurrent = Number(elLevel.value || 0);
    const idxClamped = Math.min(Math.max(0, idxCurrent), Math.max(0, levelGrid.length - 1));
    elLevel.value = String(idxClamped);

    const level = levelGrid.length ? levelGrid[idxClamped] : null;
    elLevelLabel.textContent = (level === null) ? "" : String(level);

    return { candidates, level };
  }

  function currentFilters() {
    return {
      market: elMarket.value,
      instrument: elInstrument.value,
      cbam: Number(elCbam.value),
      outcome: elOutcome.value
    };
  }

  function filteredRows() {
    const f = currentFilters();
    const { candidates, level } = updateLevelGrid(f.market, f.instrument, f.cbam);
    if (level === null) return [];
    return candidates.filter(r => r.level === level);
  }

  function series(data, yKey) {
    const s = data
      .map(r => ({ t: r.time, y: r[yKey] }))
      .filter(p => p.t !== null && p.y !== null)
      .sort((a, b) => a.t - b.t);

    return {
      x: s.map(p => p.t),
      y: s.map(p => p.y)
    };
  }

  function draw() {
    const data = filteredRows();
    const f = currentFilters();

    if (!f.outcome) {
      Plotly.purge(PLOT_ID);
      return;
    }

    if (data.length === 0) {
      Plotly.purge(PLOT_ID);
      return;
    }

    const s = series(data, f.outcome);

    Plotly.newPlot(PLOT_ID, [{
      x: s.x,
      y: s.y,
      type: "scatter",
      mode: "lines",
      name: outcomeLabel(f.outcome)
    }], {
      title: outcomeLabel(f.outcome),
      xaxis: { title: "Time" },
      yaxis: { title: outcomeLabel(f.outcome) },
      margin: { t: 50, l: 60, r: 20, b: 50 }
    }, { displayModeBar: false, responsive: true });
  }

  function populateControls() {
    const markets = uniqSorted(rows.map(r => r.market));
    const instruments = uniqSorted(rows.map(r => r.instrument));

    elMarket.innerHTML = markets.map(m => `<option value="${m}">${m}</option>`).join("");
    elInstrument.innerHTML = instruments.map(s => `<option value="${s}">${s}</option>`).join("");

    // Populate outcomes based on actual available columns
    const sample = rows[0] || {};
    const availableOutcomes = OUTCOMES.filter(o => Object.prototype.hasOwnProperty.call(sample, o.key));
    elOutcome.innerHTML = availableOutcomes.map(o => `<option value="${o.key}">${o.label}</option>`).join("");

    // Defaults
    if (markets.includes("Total")) elMarket.value = "Total";
    if (instruments.includes("Tax")) elInstrument.value = "Tax";
    elCbam.value = "0";
    elLevel.value = "0";

    // Default outcome preference order
    const preferred = ["emissions_total", "marketQuantity", "profit_total", "price"];
    const availableKeys = new Set(availableOutcomes.map(o => o.key));
    const firstPreferred = preferred.find(k => availableKeys.has(k));
    elOutcome.value = firstPreferred || (availableOutcomes[0] ? availableOutcomes[0].key : "");
  }

  function attachHandlers() {
    elMarket.addEventListener("change", draw);
    elInstrument.addEventListener("change", draw);
    elCbam.addEventListener("change", draw);
    elLevel.addEventListener("input", draw);
    elOutcome.addEventListener("change", draw);
  }

  // ---- Load CSV ----
  const text = await (await fetch(CSV_URL, { cache: "no-store" })).text();
  const parsed = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });

  rows = (parsed.data || []).map(r => ({
    market: String(r.market),
    instrument: String(r.instrument),
    cbam: parseNum(r.cbam),
    level: parseNum(r.level),
    time: parseNum(r.time),

    // metrics (include all you might plot)
    price: parseNum(r.price),
    marketQuantity: parseNum(r.marketQuantity),
    imports: parseNum(r.imports),
    leakage: parseNum(r.leakage),
    consumerSurplus: parseNum(r.consumerSurplus),
    carbonRevenue: parseNum(r.carbonRevenue),
    damage: parseNum(r.damage),
    importProfit: parseNum(r.importProfit),

    profit_total: parseNum(r.profit_total),
    emissions_total: parseNum(r.emissions_total),
    investCost_total: parseNum(r.investCost_total),
    quantityProduced_total: parseNum(r.quantityProduced_total),
  })).filter(r =>
    r.market && r.instrument &&
    r.cbam !== null && r.level !== null && r.time !== null
  );

  if (rows.length === 0) {
    Plotly.purge(PLOT_ID);
    return;
  }

  populateControls();
  attachHandlers();
  draw();
})();
