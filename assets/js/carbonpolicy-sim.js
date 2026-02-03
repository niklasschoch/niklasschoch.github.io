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

  const TONNE_OUTCOMES = new Set([
    "emissions_total", "marketQuantity", "imports", "quantityProduced_total", "leakage"
  ]);

  // Policy comparison: discount params (match Aggregator_Website.R / model)
  const DISCOUNT_FACTOR = 0.975;
  const PERIOD_LENGTH = 3;
  const YEAR_BASE = 2025;
  const COMPARISON_OUTCOMES = [
    { key: "emissions_total", label: "Emissions" },
    { key: "leakage", label: "Leakage" },
    { key: "consumerSurplus", label: "Consumer surplus" },
    { key: "profit_total", label: "Industry profits" }
  ];

  function outcomeUsesTonnes(key) {
    return TONNE_OUTCOMES.has(key);
  }

  function outcomeLabel(key) {
    const labels = {
      "emissions_total": "Domestic emissions",
      "profit_total": "Industry profits",
      "marketQuantity": "Market quantity",
      "imports": "Imports",
      "price": "Price",
      "quantityProduced_total": "Domestic quantity",
      "leakage": "Leakage"
    };
    return labels[key] || key;
  }

  function marketLabel(market) {
    const labels = {
      "Total": "all of France",
      "NorthEast": "the North-East of France",
      "NorthWest": "the North-West of France",
      "SouthEast": "the South-East of France",
      "SouthWest": "the South-West of France"
    };
    return labels[market] || market;
  }

  function generateDescription(outcome, market, instrument, cbam, level) {
    const outcomeLabels = {
      "emissions_total": "domestic emissions",
      "profit_total": "total operating profits of domestic firms",
      "marketQuantity": "total market quantity, including imports and domestic production",
      "imports": "imports",
      "price": "price",
      "quantityProduced_total": "domestic production",
      "leakage": "leakage"
    };
    
    const outcomeDesc = outcomeLabels[outcome] || outcome;
    const cbamText = cbam === 1 ? "with CBAM" : "without CBAM";
    const instrumentText = instrument.toLowerCase();
    const marketText = marketLabel(market);
    
    // Format level text based on instrument type
    const fmtSubsidyPct = (l) => Math.round(l * 100);
    let levelText = "";
    if (level !== null) {
      if (instrument.toLowerCase() === "tax") {
        levelText = ` at a carbon tax of ${Math.round(level)} EUR per ton of CO2 emitted`;
      } else if (instrument.toLowerCase() === "subsidy") {
        levelText = ` at a CAPEX subsidy of ${fmtSubsidyPct(level)}%`;
      } else {
        levelText = ` at level ${level}`;
      }
    }
    
    // Add carbon tax note for subsidy scenarios
    const carbonTaxNote = instrument.toLowerCase() === "subsidy" 
      ? " The carbon tax set for the subsidy scenario is 45 per ton of CO2 emitted."
      : "";

    const zeroTaxEmissionsNote = (outcome === "emissions_total" && instrument.toLowerCase() === "tax" && level === 0)
      ? " Even without a tax, emissions decline naturally over time due to some efficiency progress."
      : "";
    
    const descriptions = {
      "emissions_total": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. Domestic emissions represent the carbon dioxide equivalent emitted in megatonnes by domestic producers.${zeroTaxEmissionsNote}${carbonTaxNote}`,
      "profit_total": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. Profit represents the variable operating profits of domestic producers. The model does not account for fixed operating and overhead costs.${carbonTaxNote}`,
      "marketQuantity": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. Market quantity represents the total amount of cement produced by domestic producers.${carbonTaxNote}`,
      "imports": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. Imports represent the quantity of cement imported.${carbonTaxNote}`,
      "price": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. The price represents the market equilibrium price of cement, accounting for domestic production and imports.${carbonTaxNote}`,
      "quantityProduced_total": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. Domestic quantity represents the total amount of cement produced domestically.${carbonTaxNote}`,
      "leakage": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. Leakage represents carbon emissions embedded in cement imports.${carbonTaxNote}`
    };
    
    return descriptions[outcome] || `This plot shows the evolution of ${outcomeDesc} in the ${marketText} market ${cbamText}${levelText}.${carbonTaxNote}`;
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
    elLevelLabel.textContent = (level === null) ? "" : (instrument.toLowerCase() === "subsidy" ? String(Math.round(level * 100)) : String(Math.round(level)));

    // final filtered set including level
    return candidates.filter(r => r.level === level);
  }

  function series(data, yKey) {
    // sort by time; keep nulls out
    // Keep periods for smooth plotting (no kinks)
    const s = data
      .map(r => ({ t: r.time, y: r[yKey] }))
      .filter(p => p.t !== null && p.y !== null)
      .sort((a, b) => a.t - b.t);

    return {
      x: s.map(p => p.t), // Keep periods for smooth plotting
      y: s.map(p => p.y)
    };
  }

  function baselineLabel(instrument) {
    if (instrument.toLowerCase() === "tax") return "No Tax";
    if (instrument.toLowerCase() === "subsidy") return "No Subsidy";
    return "Baseline";
  }

  function levelTraceLabel(level, instrument) {
    if (instrument.toLowerCase() === "tax") return `Tax level ${level}`;
    if (instrument.toLowerCase() === "subsidy") return `Subsidy Level ${level * 100}`;
    return `Level ${level}`;
  }

  function downloadPlotCSV() {
    const data = filterRows();
    const outcome = elOutcome?.value;
    if (!outcome || data.length === 0) return;
    const outcomeCol = outcomeLabel(outcome);
    const sorted = [...data].sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
    const header = ["time", "year", outcomeCol];
    const yearBase = 2025;
    const periodLength = 3;
    const lines = [header.join(",")];
    for (const r of sorted) {
      const t = r.time;
      const y = r[outcome];
      if (t == null || y == null) continue;
      const year = yearBase + t * periodLength;
      const row = [t, year, String(y)];
      lines.push(row.join(","));
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "carbonpolicy-plot-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function draw() {
    if (!elOutcome) {
      return;
    }

    const data = filterRows();
    const outcome = elOutcome.value;
    const market = elMarket.value;
    const instrument = elInstrument.value;
    const cbam = Number(elCbam.value);
    const level = levelGrid.length > 0 ? levelGrid[Number(elLevel.value)] : null;

    if (!outcome || data.length === 0) {
      Plotly.purge("plot-main");
      return;
    }

    const s = series(data, outcome);
    
    if (s.x.length === 0 || s.y.length === 0) {
      Plotly.purge("plot-main");
      return;
    }

    const useMt = outcomeUsesTonnes(outcome);
    const useMillionEur = outcome === "profit_total";
    const scaleBy1000 = useMt || useMillionEur;
    const scale = (ys) => scaleBy1000 ? ys.map(v => v / 1000) : ys;

    const yPlot = scale(s.y);

    // Baseline (level 0) for same market, instrument, cbam – include when level !== 0
    const baselineRows = rows.filter(r =>
      r.market === market && r.instrument === instrument && r.cbam === cbam && r.level === 0
    );
    const addBaseline = baselineRows.length > 0 && level !== 0;
    let sBaseline = null;
    if (addBaseline) {
      sBaseline = series(baselineRows, outcome);
      if (sBaseline.x.length > 0 && sBaseline.y.length > 0) {
        sBaseline = { x: sBaseline.x, y: scale(sBaseline.y) };
      } else {
        sBaseline = null;
      }
    }

    const label = outcomeLabel(outcome);
    const yAxisLabel = useMt ? `${label} (in Mt)` : useMillionEur ? `${label} (EUR million)` : outcome === "price" ? `${label} (EUR/ton)` : label;
    let maxY = yPlot.length > 0 ? Math.max(...yPlot) : 0;
    if (sBaseline && sBaseline.y.length > 0) {
      const baseMax = Math.max(...sBaseline.y);
      if (baseMax > maxY) maxY = baseMax;
    }
    const upper = 1.25 * maxY;

    // Calculate y-axis ticks with round numbers, excluding zero label
    const numYTicks = 5;
    const rawStep = upper / numYTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalizedStep = rawStep / magnitude;
    let niceStep;
    if (upper <= 2) {
      niceStep = 0.5; // Use 0.5 steps for small ranges (e.g. Mt when max < 1)
    } else {
      if (normalizedStep <= 1) niceStep = magnitude;
      else if (normalizedStep <= 2) niceStep = 2 * magnitude;
      else if (normalizedStep <= 5) niceStep = 5 * magnitude;
      else niceStep = 10 * magnitude;
    }

    const yTickVals = [0];
    const yTickText = [""];
    for (let i = niceStep; i <= upper; i += niceStep) {
      yTickVals.push(i);
      yTickText.push(i % 1 === 0 ? i.toString() : i.toFixed(1));
    }

    // Calculate tick positions and labels for years (every 5 years)
    // Period 0 = 2025, each period = 3 years
    // We want ticks at: 2025, 2030, 2035, 2040, 2045, 2050, 2055
    // Convert years to periods: period = (year - 2025) / 3
    const tickYears = [2025, 2030, 2035, 2040, 2045, 2050, 2055];
    const tickVals = tickYears.map(year => (year - 2025) / 3);
    const tickText = tickYears.map(year => year.toString());

    const traces = [];
    if (addBaseline && sBaseline) {
      traces.push({
        x: sBaseline.x,
        y: sBaseline.y,
        type: "scatter",
        mode: "lines",
        name: baselineLabel(instrument)
      });
    }
    traces.push({
      x: s.x,
      y: yPlot,
      type: "scatter",
      mode: "lines",
      name: level === 0 ? baselineLabel(instrument) : (level !== null ? levelTraceLabel(level, instrument) : label)
    });

    Plotly.newPlot("plot-main", traces, {
      title: label,
      showlegend: true,
      legend: {
        x: 1,
        y: 1,
        xanchor: "right",
        yanchor: "top",
        orientation: "v",
        bgcolor: "rgba(255,255,255,0.8)",
        bordercolor: "#ccc",
        borderwidth: 1
      },
      xaxis: { 
        tickmode: "array",
        tickvals: tickVals,
        ticktext: tickText,
        range: [0, 10], // Periods 0 to 10 (2025 to 2055)
        ticklabelposition: "outside",
        title: {
          text: "Year",
          standoff: 15
        }
      },
      yaxis: {
        title: yAxisLabel,
        range: [0, upper],
        autorange: false,
        tickmode: "array",
        tickvals: yTickVals,
        ticktext: yTickText,
        ticklabelposition: "outside",
        title: {
          text: yAxisLabel,
          standoff: 20
        }
      },
      margin: { t: 50, l: 70, r: 100, b: 60 }
    }, { displayModeBar: false, responsive: true });

    // Update description
    if (elDescription) {
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
      { key: "emissions_total", label: "Domestic Emissions" },
      { key: "profit_total", label: "Industry profits" },
      { key: "marketQuantity", label: "Market quantity" },
      { key: "imports", label: "Imports" },
      { key: "price", label: "Price" },
      { key: "quantityProduced_total", label: "Domestic quantity" },
      { key: "leakage", label: "Leakage" }
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

  function getLevelGrid(market, instrument, cbam) {
    const candidates = rows.filter(r =>
      r.market === market && r.instrument === instrument && r.cbam === cbam
    );
    return uniqSorted(candidates.map(r => r.level));
  }

  function policyLabel(market, instrument, cbam, level) {
    const cbamText = cbam === 1 ? "CBAM" : "no CBAM";
    const levelText = instrument.toLowerCase() === "subsidy"
      ? `${Math.round(level * 100)}%` : `${Math.round(level)}`;
    return `${market} ${instrument} ${levelText} ${cbamText}`;
  }

  function populateComparisonControls() {
    const markets = uniqSorted(rows.map(r => r.market));
    const instruments = uniqSorted(rows.map(r => r.instrument));
    const years = [];
    for (let y = YEAR_BASE; y <= 2055; y += PERIOD_LENGTH) years.push(y);

    ["a", "b"].forEach(suffix => {
      const elM = document.getElementById(`comp-market-${suffix}`);
      const elI = document.getElementById(`comp-instrument-${suffix}`);
      const elC = document.getElementById(`comp-cbam-${suffix}`);
      const elL = document.getElementById(`comp-level-${suffix}`);
      if (!elM || !elI || !elC || !elL) return;
      elM.innerHTML = markets.map(m => `<option value="${m}">${m}</option>`).join("");
      elI.innerHTML = instruments.map(i => `<option value="${i}">${i}</option>`).join("");
      updateComparisonLevelOptions(suffix);
    });

    const elYear = document.getElementById("comp-year");
    if (elYear) elYear.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
    const idx2040 = years.indexOf(2040);
    if (elYear && idx2040 >= 0) elYear.value = "2040";
    else if (elYear && years.length) elYear.value = String(years[Math.floor(years.length / 2)]);

    const elMode = document.getElementById("comp-mode");
    const elYearLabel = document.getElementById("comp-year-label");
    if (elYearLabel) elYearLabel.style.display = (elMode && elMode.value === "year") ? "flex" : "none";

    // Defaults: Policy A = baseline (level 0), Policy B = first policy level
    ["a", "b"].forEach(suffix => {
      const elM = document.getElementById(`comp-market-${suffix}`);
      const elI = document.getElementById(`comp-instrument-${suffix}`);
      const elC = document.getElementById(`comp-cbam-${suffix}`);
      const elL = document.getElementById(`comp-level-${suffix}`);
      if (elM && elM.querySelector('option[value="Total"]')) elM.value = "Total";
      else if (elM && elM.options.length) elM.value = elM.options[0].value;
      if (elI && elI.querySelector('option[value="Tax"]')) elI.value = "Tax";
      else if (elI && elI.options.length) elI.value = elI.options[0].value;
      if (elC) elC.value = "0";
      updateComparisonLevelOptions(suffix);
      if (elL && elL.options.length) {
        elL.value = String(suffix === "a" ? 0 : Math.min(1, elL.options.length - 1));
      }
    });
  }

  function updateComparisonLevelOptions(suffix) {
    const elM = document.getElementById(`comp-market-${suffix}`);
    const elI = document.getElementById(`comp-instrument-${suffix}`);
    const elC = document.getElementById(`comp-cbam-${suffix}`);
    const elL = document.getElementById(`comp-level-${suffix}`);
    if (!elM || !elI || !elC || !elL) return;
    const market = elM.value;
    const instrument = elI.value;
    const cbam = Number(elC.value);
    const grid = getLevelGrid(market, instrument, cbam);
    const isSubsidy = instrument.toLowerCase() === "subsidy";
    const fmtLevel = (l) => isSubsidy ? Math.round(l * 100) : Math.round(l);
    elL.innerHTML = grid.map((lvl, i) =>
      `<option value="${i}">${fmtLevel(lvl)}</option>`
    ).join("");
  }

  function getPolicySelection(suffix) {
    const elM = document.getElementById(`comp-market-${suffix}`);
    const elI = document.getElementById(`comp-instrument-${suffix}`);
    const elC = document.getElementById(`comp-cbam-${suffix}`);
    const elL = document.getElementById(`comp-level-${suffix}`);
    if (!elM || !elI || !elC || !elL) return null;
    const market = elM.value;
    const instrument = elI.value;
    const cbam = Number(elC.value);
    const grid = getLevelGrid(market, instrument, cbam);
    const levelIdx = Math.min(Number(elL.value || 0), grid.length - 1);
    const level = grid.length ? grid[levelIdx] : null;
    return { market, instrument, cbam, level };
  }

  function getPolicyRows(policy) {
    if (!policy || policy.level == null) return [];
    return rows.filter(r =>
      r.market === policy.market &&
      r.instrument === policy.instrument &&
      r.cbam === policy.cbam &&
      r.level === policy.level
    );
  }

  function computeNPV(data, key) {
    let sum = 0;
    for (const r of data) {
      const t = r.time;
      const v = r[key];
      if (t == null || v == null) continue;
      sum += v * Math.pow(DISCOUNT_FACTOR, t * PERIOD_LENGTH);
    }
    return sum;
  }

  function getValueAtTime(data, key, year) {
    const period = (year - YEAR_BASE) / PERIOD_LENGTH;
    const r = data.find(d => d.time === period);
    return r && r[key] != null ? r[key] : null;
  }

  function drawComparison() {
    const elPlot = document.getElementById("comparison-plot");
    if (!elPlot) return;

    const policyA = getPolicySelection("a");
    const policyB = getPolicySelection("b");
    const elMode = document.getElementById("comp-mode");
    const elYear = document.getElementById("comp-year");
    const mode = elMode ? elMode.value : "npv";
    const year = elYear ? Number(elYear.value) : 2040;

    if (!policyA || !policyB) {
      Plotly.purge("comparison-plot");
      elPlot.innerHTML = "";
      return;
    }

    const rowsA = getPolicyRows(policyA);
    const rowsB = getPolicyRows(policyB);
    if (rowsA.length === 0 || rowsB.length === 0) {
      Plotly.purge("comparison-plot");
      elPlot.innerHTML = "<p class='comparison-empty'>No data for one or both policies.</p>";
      return;
    }

    const pctChanges = [];
    const labels = [];
    const values = [];

    for (const { key, label } of COMPARISON_OUTCOMES) {
      let valA, valB;
      if (mode === "npv") {
        valA = computeNPV(rowsA, key);
        valB = computeNPV(rowsB, key);
      } else {
        valA = getValueAtTime(rowsA, key, year);
        valB = getValueAtTime(rowsB, key, year);
      }
      if (valA == null || valB == null) continue;
      const denom = Math.abs(valA);
      const pct = denom > 1e-10 ? ((valB - valA) / denom) * 100 : null;
      if (pct == null) continue;
      labels.push(label);
      values.push(pct);
      pctChanges.push({ label, pct, valA, valB });
    }

    if (labels.length === 0) {
      Plotly.purge("comparison-plot");
      elPlot.innerHTML = "<p class='comparison-empty'>Could not compute comparison.</p>";
      return;
    }

    const subTitle = mode === "npv"
      ? `NPV (Policy B vs Policy A)`
      : `Year ${year} (Policy B vs Policy A)`;

    const trace = {
      x: values,
      y: labels,
      type: "bar",
      orientation: "h",
      marker: {
        color: values.map(v => v >= 0 ? "rgba(200,80,80,0.8)" : "rgba(80,160,80,0.8)"),
        line: { width: 0 }
      },
      text: values.map(v => (v >= 0 ? "+" : "") + v.toFixed(1) + "%"),
      textposition: "outside",
      textfont: { size: 12 }
    };

    const xRange = Math.max(20, Math.ceil(Math.max(...values.map(Math.abs)) * 1.2));
    Plotly.newPlot("comparison-plot", [trace], {
      title: { text: "Percentage change", font: { size: 16 } },
      margin: { t: 50, l: 140, r: 80, b: 50 },
      xaxis: {
        title: subTitle,
        range: [-xRange, xRange],
        zeroline: true,
        zerolinewidth: 1,
        zerolinecolor: "#333"
      },
      yaxis: { automargin: true },
      showlegend: false,
      bargap: 0.4
    }, { displayModeBar: false, responsive: true });
  }

  function attachHandlers() {
    elMarket.addEventListener("change", draw);
    elInstrument.addEventListener("change", draw);
    elCbam.addEventListener("change", draw);
    elLevel.addEventListener("input", draw);
    elOutcome.addEventListener("change", draw);
    const btnCsv = document.getElementById("btn-download-csv");
    if (btnCsv) btnCsv.addEventListener("click", downloadPlotCSV);

    ["a", "b"].forEach(suffix => {
      const elM = document.getElementById(`comp-market-${suffix}`);
      const elI = document.getElementById(`comp-instrument-${suffix}`);
      const elC = document.getElementById(`comp-cbam-${suffix}`);
      const elL = document.getElementById(`comp-level-${suffix}`);
      [elM, elI, elC].forEach(el => {
        if (el) el.addEventListener("change", () => {
          updateComparisonLevelOptions(suffix);
          drawComparison();
        });
      });
      if (elL) elL.addEventListener("change", drawComparison);
    });

    const elMode = document.getElementById("comp-mode");
    const elYear = document.getElementById("comp-year");
    const elYearLabel = document.getElementById("comp-year-label");
    if (elMode) elMode.addEventListener("change", () => {
      if (elYearLabel) elYearLabel.style.display = elMode.value === "year" ? "flex" : "none";
      drawComparison();
    });
    if (elYear) elYear.addEventListener("change", drawComparison);
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
      consumerSurplus: parseNum(r.consumerSurplus),

      emissions_total: parseNum(r.emissions_total),
      profit_total: parseNum(r.profit_total),
      marketQuantity: parseNum(r.marketQuantity),
      imports: parseNum(r.imports),
      quantityProduced_total: parseNum(r.quantityProduced_total),
      leakage: parseNum(r.leakage),
    })).filter(r =>
      r.market && r.instrument &&
      r.cbam !== null && r.level !== null && r.time !== null
    );

    if (rows.length === 0) {
      throw new Error("No valid data rows found in CSV");
    }

    console.log(`Carbon Policy Simulator: Loaded ${rows.length} rows successfully`);

    populateControls();
    populateComparisonControls();
    attachHandlers();
    draw();
    drawComparison();
  } catch (error) {
    console.error("Carbon Policy Simulator error:", error);
    const plotEl = document.getElementById("plot-main");
    if (plotEl) {
      plotEl.innerHTML = `<p style="color: red; padding: 20px;">Error loading simulator: ${error.message}<br>Check browser console for details.</p>`;
    }
  }
})();
