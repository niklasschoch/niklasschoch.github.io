(async function () {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }

  // Wait for PapaParse and Plotly libraries to load
  let waitCount = 0;
  while ((typeof Papa === 'undefined' || typeof Plotly === 'undefined') && waitCount < 100) {
    await new Promise(resolve => setTimeout(resolve, 50));
    waitCount++;
  }

  if (typeof Papa === 'undefined') {
    console.error("Carbon Policy Simulator: PapaParse library not loaded");
    const plotEl = document.getElementById("plot-main");
    if (plotEl) plotEl.innerHTML = '<p style="color: red;">Error: PapaParse library failed to load</p>';
    return;
  }

  if (typeof Plotly === 'undefined') {
    console.error("Carbon Policy Simulator: Plotly library not loaded");
    const plotEl = document.getElementById("plot-main");
    if (plotEl) plotEl.innerHTML = '<p style="color: red;">Error: Plotly library failed to load</p>';
    return;
  }

  const CSV_URL = "/assets/data/dashboard_paths.csv";

  const elMarket = document.getElementById("ctrl-market");
  const elInstrument = document.getElementById("ctrl-instrument");
  const elCbam = document.getElementById("ctrl-cbam");
  const elLevel = document.getElementById("ctrl-level");
  const elLevelLabel = document.getElementById("ctrl-level-label");
  const elOutcome = document.getElementById("ctrl-outcome");
  const elDescription = document.getElementById("plot-description");

  // Check if all required DOM elements exist
  if (!elMarket || !elInstrument || !elCbam || !elLevel || !elLevelLabel || !elOutcome) {
    console.error("Carbon Policy Simulator: Required DOM elements not found", {
      elMarket: !!elMarket,
      elInstrument: !!elInstrument,
      elCbam: !!elCbam,
      elLevel: !!elLevel,
      elLevelLabel: !!elLevelLabel,
      elOutcome: !!elOutcome
    });
    const plotEl = document.getElementById("plot-main");
    if (plotEl) plotEl.innerHTML = '<p style="color: red;">Error: Required page elements not found</p>';
    return;
  }

  let rows = [];
  let levelGrid = []; // discrete levels for current (market,instrument,cbam)

  function parseNum(x) {
    const v = Number(x);
    return Number.isFinite(v) ? v : null;
  }

  function uniqSorted(arr) {
    return [...new Set(arr)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }

  function outcomeLabel(key) {
    const labels = {
      "emissions_total": "Emissions (total)",
      "profit_total": "Profit (total)",
      "marketQuantity": "Market quantity",
      "imports": "Imports",
      "price": "Price"
    };
    return labels[key] || key;
  }

  function marketLabel(market) {
    const labels = {
      "Total": "all of France",
      "NorthEast": "North-East of France",
      "NorthWest": "North-West of France",
      "SouthEast": "South-East of France",
      "SouthWest": "South-West of France"
    };
    return labels[market] || market;
  }

  function generateDescription(outcome, market, instrument, cbam, level) {
    const outcomeLabels = {
      "emissions_total": "total emissions",
      "profit_total": "total profit",
      "marketQuantity": "market quantity",
      "imports": "imports",
      "price": "price"
    };
    
    const outcomeDesc = outcomeLabels[outcome] || outcome;
    const cbamText = cbam === 1 ? "with CBAM" : "without CBAM";
    const instrumentText = instrument.toLowerCase();
    const marketText = marketLabel(market);
    const levelText = level !== null ? ` at level ${level}` : "";
    
    const descriptions = {
      "emissions_total": `This plot shows the evolution of ${outcomeDesc} in the ${marketText} under a ${instrumentText} ${cbamText}${levelText}. Emissions represent the total carbon dioxide equivalent emitted in megatonnes.`,
      "profit_total": `This plot shows the evolution of ${outcomeDesc} in the ${marketText} under a ${instrumentText} ${cbamText}${levelText}. Profit represents the total operating profit of domestic producers.`,
      "marketQuantity": `This plot shows the evolution of ${outcomeDesc} in the ${marketText} under a ${instrumentText} ${cbamText}${levelText}. Market quantity represents the total amount of cement produced by domestic producers.`,
      "imports": `This plot shows the evolution of ${outcomeDesc} in the ${marketText} under a ${instrumentText} ${cbamText}${levelText}. Imports represent the quantity of cement imported.`,
      "price": `This plot shows the evolution of ${outcomeDesc} in the ${marketText} under a ${instrumentText} ${cbamText}${levelText}. The price represents the market equilibrium price of cement, accounting for domestic production and imports.`
    };
    
    return descriptions[outcome] || `This plot shows the evolution of ${outcomeDesc} in the ${marketText} market under a ${instrumentText} ${cbamText}${levelText}.`;
  }

  function filterRows() {
    if (!elMarket || !elInstrument || !elCbam || !elLevel || rows.length === 0) {
      return [];
    }

    const market = elMarket.value;
    const instrument = elInstrument.value;
    const cbam = Number(elCbam.value);

    // update discrete level grid for this selection
    const candidates = rows.filter(r =>
      r.market === market &&
      r.instrument === instrument &&
      r.cbam === cbam
    );

    levelGrid = uniqSorted(candidates.map(r => r.level));

    // slider indexes levels
    elLevel.min = 0;
    elLevel.max = Math.max(0, levelGrid.length - 1);
    elLevel.step = 1;

    // clamp current slider value
    const idx = Math.min(Number(elLevel.value || 0), levelGrid.length - 1);
    elLevel.value = Math.max(0, idx);

    const level = levelGrid.length ? levelGrid[Number(elLevel.value)] : null;
    elLevelLabel.textContent = (level === null) ? "" : String(level);

    // final filtered set including level
    return candidates.filter(r => r.level === level);
  }

  function series(data, yKey) {
    // sort by time; keep nulls out
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
    if (!elOutcome) {
      return;
    }

    const data = filterRows();
    const outcome = elOutcome.value;

    if (!outcome || data.length === 0) {
      Plotly.purge("plot-main");
      return;
    }

    const s = series(data, outcome);
    
    if (s.x.length === 0 || s.y.length === 0) {
      Plotly.purge("plot-main");
      return;
    }

    const label = outcomeLabel(outcome);
    const maxY = s.y.length > 0 ? Math.max(...s.y) : 0;
    const upper = 1.25 * maxY;

    Plotly.newPlot("plot-main", [{
      x: s.x,
      y: s.y,
      type: "scatter",
      mode: "lines",
      name: label
    }], {
      title: label,
      xaxis: { title: "Time" },
      yaxis: {
        title: label,
        range: [0, upper],
        autorange: false
      },
      margin: { t: 50, l: 60, r: 20, b: 50 }
    }, { displayModeBar: false, responsive: true });

    // Update description
    if (elDescription) {
      const market = elMarket.value;
      const instrument = elInstrument.value;
      const cbam = Number(elCbam.value);
      const level = levelGrid.length > 0 ? levelGrid[Number(elLevel.value)] : null;
      elDescription.textContent = generateDescription(outcome, market, instrument, cbam, level);
    }
  }

  function populateControls() {
    if (rows.length === 0) {
      console.error("Carbon Policy Simulator: Cannot populate controls - no data available");
      return;
    }

    const markets = uniqSorted(rows.map(r => r.market));
    const instruments = uniqSorted(rows.map(r => r.instrument));

    if (markets.length === 0 || instruments.length === 0) {
      console.error("Carbon Policy Simulator: No markets or instruments found in data");
      return;
    }

    elMarket.innerHTML = markets.map(m => `<option value="${m}">${m}</option>`).join("");
    elInstrument.innerHTML = instruments.map(inst => `<option value="${inst}">${inst}</option>`).join("");

    // Populate outcome dropdown with available metrics
    const availableOutcomes = [
      { key: "emissions_total", label: "Emissions (total)" },
      { key: "profit_total", label: "Profit (total)" },
      { key: "marketQuantity", label: "Market quantity" },
      { key: "imports", label: "Imports" },
      { key: "price", label: "Price" }
    ];
    
    // Check which outcomes are actually available in the data
    const sample = rows[0] || {};
    const validOutcomes = availableOutcomes.filter(o => 
      Object.prototype.hasOwnProperty.call(sample, o.key) && sample[o.key] !== null
    );
    
    if (validOutcomes.length === 0) {
      console.error("Carbon Policy Simulator: No valid outcomes found in data");
      elOutcome.innerHTML = '<option value="">No data available</option>';
    } else {
      elOutcome.innerHTML = validOutcomes.map(o => 
        `<option value="${o.key}">${o.label}</option>`
      ).join("");
    }

    // defaults
    if (markets.includes("Total")) elMarket.value = "Total";
    else if (markets.length > 0) elMarket.value = markets[0];
    
    if (instruments.includes("Tax")) elInstrument.value = "Tax";
    else if (instruments.length > 0) elInstrument.value = instruments[0];
    
    elCbam.value = "0";
    elLevel.value = "0";
    
    if (validOutcomes.length > 0) {
      elOutcome.value = validOutcomes[0].key;
    }
  }

  function attachHandlers() {
    elMarket.addEventListener("change", draw);
    elInstrument.addEventListener("change", draw);
    elCbam.addEventListener("change", draw);
    elLevel.addEventListener("input", draw);
    elOutcome.addEventListener("change", draw);
  }

  // Load CSV with error handling
  try {
    const response = await fetch(CSV_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    if (!text || text.trim().length === 0) {
      throw new Error("CSV file is empty");
    }

    const parsed = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
    
    if (parsed.errors && parsed.errors.length > 0) {
      console.warn("CSV parsing errors:", parsed.errors);
    }

    if (!parsed.data || !Array.isArray(parsed.data)) {
      throw new Error("CSV parsing returned invalid data format");
    }

    rows = parsed.data.map(r => ({
      market: String(r.market),
      instrument: String(r.instrument),
      cbam: parseNum(r.cbam),
      level: parseNum(r.level),
      time: parseNum(r.time),

      price: parseNum(r.price),

      emissions_total: parseNum(r.emissions_total),
      profit_total: parseNum(r.profit_total),
      marketQuantity: parseNum(r.marketQuantity),
      imports: parseNum(r.imports),
    })).filter(r =>
      r.market && r.instrument &&
      r.cbam !== null && r.level !== null && r.time !== null
    );

    if (rows.length === 0) {
      throw new Error("No valid data rows found in CSV");
    }

    console.log(`Carbon Policy Simulator: Loaded ${rows.length} rows successfully`);

    populateControls();
    attachHandlers();
    draw();
  } catch (error) {
    console.error("Carbon Policy Simulator error:", error);
    const plotEl = document.getElementById("plot-main");
    if (plotEl) {
      plotEl.innerHTML = `<p style="color: red; padding: 20px;">Error loading simulator: ${error.message}<br>Check browser console for details.</p>`;
    }
  }
})();
