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

  const CSV_URL = "/assets/data/dashboard_paths_robustness.csv";

  const elMarket = document.getElementById("ctrl-market");
  const elInstrument = document.getElementById("ctrl-instrument");
  const elCbam = document.getElementById("ctrl-cbam");
  const elContextWrap = document.getElementById("ctrl-context-wrap");
  const elContext = document.getElementById("ctrl-context");
  const elContextLabel = document.getElementById("ctrl-context-label");
  const elLevel = document.getElementById("ctrl-level");
  const elLevelLabel = document.getElementById("ctrl-level-label");
  const elOutcome = document.getElementById("ctrl-outcome");
  const elDescription = document.getElementById("plot-description");

  // Check if all required DOM elements exist
  if (!elMarket || !elInstrument || !elCbam || !elContext || !elContextLabel || !elLevel || !elLevelLabel || !elOutcome) {
    console.error("Carbon Policy Simulator: Required DOM elements not found", {
      elMarket: !!elMarket,
      elInstrument: !!elInstrument,
      elCbam: !!elCbam,
      elContext: !!elContext,
      elContextLabel: !!elContextLabel,
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

  function instrumentKey(instrument) {
    const inst = String(instrument || "").toLowerCase();
    if (inst === "subsidy") return "subsidy";
    if (inst === "oba") return "oba";
    return "tax";
  }

  function getContextConfig(instrument) {
    const key = instrumentKey(instrument);
    if (key === "subsidy") {
      return { field: "subsidy_tax_level", label: "Tax Level", formatter: v => String(Math.round(v)) };
    }
    if (key === "oba") {
      return { field: "oba_benchmark", label: "OBA Benchmark", formatter: v => Number(v).toFixed(2) };
    }
    return null;
  }

  function getLevelConfig(instrument) {
    const key = instrumentKey(instrument);
    if (key === "subsidy") return { field: "subsidy_level", formatter: v => String(Math.round(v * 100)) };
    if (key === "oba") return { field: "oba_tax_level", formatter: v => String(Math.round(v)) };
    return { field: "tax_level", formatter: v => String(Math.round(v)) };
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

  function generateDescription(outcome, market, instrument, cbam, contextValue, level) {
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
        const taxTxt = contextValue !== null ? ` and a carbon tax of ${Math.round(contextValue)} EUR per ton of CO2 emitted` : "";
        levelText = ` at a CAPEX subsidy of ${fmtSubsidyPct(level)}%${taxTxt}`;
      } else if (instrument.toLowerCase() === "oba") {
        const bTxt = contextValue !== null ? ` with benchmark ${Number(contextValue).toFixed(2)}` : "";
        levelText = ` at a carbon tax of ${Math.round(level)} EUR per ton of CO2 emitted${bTxt}`;
      } else {
        levelText = ` at level ${level}`;
      }
    }

    const efficiencyNote = " Even without policy intervention, emissions decline naturally over time due to some efficiency progress.";
    
    const descriptions = {
      "emissions_total": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. Domestic emissions represent the carbon dioxide equivalent emitted in megatonnes by domestic producers.${efficiencyNote}`,
      "profit_total": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. Profit represents the variable operating profits of domestic producers. The plotted values do not account for investment cost. The model does not account for fixed operating and overhead costs.`,
      "marketQuantity": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. Market quantity represents the total amount of cement produced by domestic producers.`,
      "imports": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. Imports represent the quantity of cement imported.`,
      "price": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. The price represents the market equilibrium price of cement, accounting for domestic production and imports.`,
      "quantityProduced_total": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. Domestic quantity represents the total amount of cement produced domestically.`,
      "leakage": `This plot shows the evolution of ${outcomeDesc} in ${marketText} ${cbamText}${levelText}. Leakage represents carbon emissions embedded in cement imports.`
    };
    
    return descriptions[outcome] || `This plot shows the evolution of ${outcomeDesc} in the ${marketText} market ${cbamText}${levelText}.`;
  }

  function filterRows() {
    if (!elMarket || !elInstrument || !elCbam || !elContext || !elContextLabel || !elLevel || rows.length === 0) {
      return [];
    }

    const market = elMarket.value;
    const instrument = elInstrument.value;
    const cbam = Number(elCbam.value);
    const contextCfg = getContextConfig(instrument);
    const levelCfg = getLevelConfig(instrument);
    let contextVal = null;
    let candidates = rows.filter(r =>
      r.market === market &&
      r.instrument === instrument &&
      r.cbam === cbam
    );

    if (contextCfg) {
      if (elContextWrap) {
        elContextWrap.style.display = "flex";
      }
      elContextLabel.textContent = contextCfg.label;
      const contextCandidates = candidates.filter(r => r[contextCfg.field] !== null);
      const contextGrid = uniqSorted(contextCandidates.map(r => r[contextCfg.field]));
      const oldContext = Number(elContext.value);
      elContext.innerHTML = contextGrid
        .map(v => `<option value="${v}">${contextCfg.formatter(v)}</option>`)
        .join("");
      if (contextGrid.length > 0) {
        if (Number.isFinite(oldContext) && contextGrid.includes(oldContext)) {
          elContext.value = String(oldContext);
        } else {
          elContext.value = String(contextGrid[0]);
        }
      }
      contextVal = contextGrid.length > 0 ? Number(elContext.value) : null;
      candidates = contextCandidates.filter(r => r[contextCfg.field] === contextVal);
    } else {
      if (elContextWrap) {
        elContextWrap.style.display = "none";
      }
      elContext.innerHTML = "";
    }

    levelGrid = uniqSorted(candidates.map(r => r[levelCfg.field]));

    // slider indexes levels
    elLevel.min = 0;
    elLevel.max = Math.max(0, levelGrid.length - 1);
    elLevel.step = 1;

    // clamp current slider value
    const idx = Math.min(Number(elLevel.value || 0), levelGrid.length - 1);
    elLevel.value = Math.max(0, idx);

    const level = levelGrid.length ? levelGrid[Number(elLevel.value)] : null;
    elLevelLabel.textContent = (level === null) ? "" : levelCfg.formatter(level);

    // final filtered set including level
    return candidates.filter(r => r[levelCfg.field] === level);
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
    if (instrument.toLowerCase() === "tax") return `Tax level ${Math.round(level)}`;
    if (instrument.toLowerCase() === "subsidy") return `Subsidy Level ${Math.round(level * 100)}`;
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
    const contextCfg = getContextConfig(instrument);
    const levelCfg = getLevelConfig(instrument);
    const contextVal = contextCfg ? Number(elContext.value) : null;
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
    const baselineRows = rows.filter(r => {
      if (!(r.market === market && r.instrument === instrument && r.cbam === cbam)) return false;
      if (contextCfg && r[contextCfg.field] !== contextVal) return false;
      return r[levelCfg.field] === 0;
    });
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
      elDescription.textContent = generateDescription(outcome, market, instrument, cbam, contextVal, level);
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
    elContext.value = "";
    elLevel.value = "0";
    
    if (validOutcomes.length > 0) {
      elOutcome.value = validOutcomes[0].key;
    }
    filterRows();
  }

  function getContextGrid(market, instrument, cbam) {
    const cfg = getContextConfig(instrument);
    if (!cfg) return [];
    const candidates = rows.filter(r =>
      r.market === market && r.instrument === instrument && r.cbam === cbam && r[cfg.field] !== null
    );
    return uniqSorted(candidates.map(r => r[cfg.field]));
  }

  function getLevelGrid(market, instrument, cbam, contextValue) {
    const cfg = getLevelConfig(instrument);
    const ctx = getContextConfig(instrument);
    const candidates = rows.filter(r =>
      r.market === market &&
      r.instrument === instrument &&
      r.cbam === cbam &&
      (!ctx || r[ctx.field] === contextValue) &&
      r[cfg.field] !== null
    );
    return uniqSorted(candidates.map(r => r[cfg.field]));
  }

  function policyLabel(market, instrument, cbam, contextValue, level) {
    const cbamText = cbam === 1 ? "CBAM" : "no CBAM";
    const lvlTxt = getLevelConfig(instrument).formatter(level);
    const ctxCfg = getContextConfig(instrument);
    const ctxTxt = (ctxCfg && contextValue != null) ? ` ${ctxCfg.label}=${ctxCfg.formatter(contextValue)}` : "";
    return `${market} ${instrument}${ctxTxt} ${lvlTxt} ${cbamText}`;
  }

  function policyDescFragment(market, instrument, cbam, contextValue, level) {
    const marketText = marketLabel(market);
    const cbamText = cbam === 1 ? "with CBAM" : "without CBAM";
    const inst = instrument.toLowerCase();
    const levelText = level != null
      ? (inst === "subsidy"
        ? `with a CAPEX subsidy of ${Math.round(level * 100)}% and tax level ${Math.round(contextValue)}`
        : inst === "oba"
          ? `with OBA benchmark ${Number(contextValue).toFixed(2)} and tax level ${Math.round(level)}`
          : `with a carbon tax level of ${Math.round(level)} EUR per ton`)
      : "";
    return `${marketText}, ${levelText}, ${cbamText}`;
  }

  function fmtEur(value) {
    if (value == null) return "N/A";
    const millions = value / 1000;
    return Math.round(millions) + " million EUR";
  }

  function computeBudgetLine(policy, policyRows, mode, year) {
    let revenue = null;
    let subsidyCost = null;

    if (mode === "npv") {
      revenue = computeNPV(policyRows, "carbonRevenue");
      const investNPV = computeNPV(policyRows, "investCost_total");
      if (policy.instrument.toLowerCase() === "subsidy" && policy.level != null) {
        subsidyCost = policy.level * investNPV;
      }
    } else {
      revenue = getValueAtTime(policyRows, "carbonRevenue", year);
      const invest = getValueAtTime(policyRows, "investCost_total", year);
      if (policy.instrument.toLowerCase() === "subsidy" && policy.level != null && invest != null) {
        subsidyCost = policy.level * invest;
      }
    }

    let text = `generates ${fmtEur(revenue)} in carbon tax revenue`;
    if (subsidyCost != null) {
      text += ` and costs ${fmtEur(subsidyCost)} in subsidies`;
    }
    return text;
  }

  function generateComparisonDescription(policyA, policyB, mode, year, rowsA, rowsB) {
    const descA = policyDescFragment(policyA.market, policyA.instrument, policyA.cbam, policyA.contextValue, policyA.level);
    const descB = policyDescFragment(policyB.market, policyB.instrument, policyB.cbam, policyB.contextValue, policyB.level);
    const timeFrame = mode === "npv" ? "over the next 30 years" : `in ${year}`;
    const budgetA = computeBudgetLine(policyA, rowsA, mode, year);
    const budgetB = computeBudgetLine(policyB, rowsB, mode, year);
    return `<strong>Policy A:</strong> ${descA}<br><strong>Policy B:</strong> ${descB}<br><br>This comparison shows the percentage change in emissions, leakage, consumer surplus, and industry profits when moving from Policy A to Policy B ${timeFrame}. Policy A ${budgetA}. In contrast, Policy B ${budgetB}.`;
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
      const elCtx = document.getElementById(`comp-context-${suffix}`);
      const elL = document.getElementById(`comp-level-${suffix}`);
      if (!elM || !elI || !elC || !elCtx || !elL) return;
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
      const elCtx = document.getElementById(`comp-context-${suffix}`);
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
    const elCtx = document.getElementById(`comp-context-${suffix}`);
    const elCtxWrap = document.getElementById(`comp-context-wrap-${suffix}`);
    const elCtxLabel = document.getElementById(`comp-context-label-${suffix}`);
    const elL = document.getElementById(`comp-level-${suffix}`);
    if (!elM || !elI || !elC || !elCtx || !elL) return;

    const market = elM.value;
    const instrument = elI.value;
    const cbam = Number(elC.value);
    const ctxCfg = getContextConfig(instrument);
    const lvlCfg = getLevelConfig(instrument);
    let contextValue = null;
    if (ctxCfg) {
      if (elCtxWrap) elCtxWrap.style.display = "flex";
      if (elCtxLabel) elCtxLabel.textContent = ctxCfg.label;
      const oldContext = Number(elCtx.value);
      const contextGrid = getContextGrid(market, instrument, cbam);
      elCtx.innerHTML = contextGrid.map(v => `<option value="${v}">${ctxCfg.formatter(v)}</option>`).join("");
      if (contextGrid.length > 0) {
        if (Number.isFinite(oldContext) && contextGrid.includes(oldContext)) elCtx.value = String(oldContext);
        else elCtx.value = String(contextGrid[0]);
      }
      contextValue = contextGrid.length > 0 ? Number(elCtx.value) : null;
    } else {
      if (elCtxWrap) elCtxWrap.style.display = "none";
      elCtx.innerHTML = "";
    }

    // Get the displayed level value from the currently selected option before rebuilding
    const selectedOption = elL.options[elL.selectedIndex];
    const oldDisplayedLevel = selectedOption ? Number(selectedOption.textContent) : null;
    const grid = getLevelGrid(market, instrument, cbam, contextValue);
    const fmtLevel = (l) => Number(lvlCfg.formatter(l));
    elL.innerHTML = grid.map((lvl, i) =>
      `<option value="${i}">${fmtLevel(lvl)}</option>`
    ).join("");

    // Try to restore the same displayed level if it exists in the new grid
    if (oldDisplayedLevel !== null) {
      const newIdx = grid.findIndex(l => fmtLevel(l) === oldDisplayedLevel);
      if (newIdx >= 0) {
        elL.value = String(newIdx);
      }
    }
  }

  function getPolicySelection(suffix) {
    const elM = document.getElementById(`comp-market-${suffix}`);
    const elI = document.getElementById(`comp-instrument-${suffix}`);
    const elC = document.getElementById(`comp-cbam-${suffix}`);
    const elCtx = document.getElementById(`comp-context-${suffix}`);
    const elL = document.getElementById(`comp-level-${suffix}`);
    if (!elM || !elI || !elC || !elCtx || !elL) return null;
    const market = elM.value;
    const instrument = elI.value;
    const cbam = Number(elC.value);
    const contextCfg = getContextConfig(instrument);
    const contextValue = contextCfg ? Number(elCtx.value) : null;
    const grid = getLevelGrid(market, instrument, cbam, contextValue);
    const levelIdx = Math.min(Number(elL.value || 0), grid.length - 1);
    const level = grid.length ? grid[levelIdx] : null;
    return { market, instrument, cbam, contextValue, level };
  }

  function getPolicyRows(policy) {
    if (!policy || policy.level == null) return [];
    const ctxCfg = getContextConfig(policy.instrument);
    const lvlCfg = getLevelConfig(policy.instrument);
    return rows.filter(r =>
      r.market === policy.market &&
      r.instrument === policy.instrument &&
      r.cbam === policy.cbam &&
      (!ctxCfg || r[ctxCfg.field] === policy.contextValue) &&
      r[lvlCfg.field] === policy.level
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
    const elDesc = document.getElementById("comparison-description");
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
      if (elDesc) elDesc.innerHTML = "";
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
      if (elDesc) elDesc.innerHTML = "";
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
      hoverinfo: "skip"
    };

    const xRange = Math.max(20, Math.ceil(Math.max(...values.map(Math.abs)) * 1.2));
    Plotly.newPlot("comparison-plot", [trace], {
      title: { text: "Percentage change", font: { size: 16 } },
      margin: { t: 50, l: 160, r: 90, b: 50 },
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

    if (elDesc) {
      elDesc.innerHTML = generateComparisonDescription(policyA, policyB, mode, year, rowsA, rowsB);
    }
  }

  function attachHandlers() {
    elMarket.addEventListener("change", draw);
    elInstrument.addEventListener("change", draw);
    elCbam.addEventListener("change", draw);
    elContext.addEventListener("change", draw);
    elLevel.addEventListener("input", draw);
    elOutcome.addEventListener("change", draw);
    const btnCsv = document.getElementById("btn-download-csv");
    if (btnCsv) btnCsv.addEventListener("click", downloadPlotCSV);

    ["a", "b"].forEach(suffix => {
      const elM = document.getElementById(`comp-market-${suffix}`);
      const elI = document.getElementById(`comp-instrument-${suffix}`);
      const elC = document.getElementById(`comp-cbam-${suffix}`);
      const elCtx = document.getElementById(`comp-context-${suffix}`);
      const elL = document.getElementById(`comp-level-${suffix}`);
      [elM, elI, elC].forEach(el => {
        if (el) el.addEventListener("change", () => {
          updateComparisonLevelOptions(suffix);
          drawComparison();
        });
      });
      if (elCtx) elCtx.addEventListener("change", () => {
        updateComparisonLevelOptions(suffix);
        drawComparison();
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
      instrument: String(r.instrument || r.scenario),
      cbam: parseNum(r.cbam),
      level: parseNum(r.level),
      tax_level: parseNum(r.tax_level),
      subsidy_tax_level: parseNum(r.subsidy_tax_level),
      subsidy_level: parseNum(r.subsidy_level),
      oba_benchmark: parseNum(r.oba_benchmark),
      oba_tax_level: parseNum(r.oba_tax_level),
      time: parseNum(r.time),

      price: parseNum(r.price),
      consumerSurplus: parseNum(r.consumerSurplus ?? r.consumersurplus),

      emissions_total: parseNum(r.emissions_total ?? r.emissionstotal),
      profit_total: parseNum(r.profit_total ?? r.profittotal),
      marketQuantity: parseNum(r.marketQuantity ?? r.marketquantity),
      imports: parseNum(r.imports),
      quantityProduced_total: parseNum(r.quantityProduced_total ?? r.quantityproduced_total ?? r.quantityproducedtotal),
      leakage: parseNum(r.leakage),
      carbonRevenue: parseNum(r.carbonRevenue ?? r.carbonrevenue),
      investCost_total: parseNum(r.investCost_total ?? r.investcost_total ?? r.investcosttotal),
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
