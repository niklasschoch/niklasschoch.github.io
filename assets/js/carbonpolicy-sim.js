(async function () {
  const CSV_URL = "/assets/data/dashboard_paths.csv";

  const elMarket = document.getElementById("ctrl-market");
  const elInstrument = document.getElementById("ctrl-instrument");
  const elCbam = document.getElementById("ctrl-cbam");
  const elLevel = document.getElementById("ctrl-level");
  const elLevelLabel = document.getElementById("ctrl-level-label");

  let rows = [];
  let levelGrid = []; // discrete levels for current (market,instrument,cbam)

  function parseNum(x) {
    const v = Number(x);
    return Number.isFinite(v) ? v : null;
  }

  function uniqSorted(arr) {
    return [...new Set(arr)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }

  function filterRows() {
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
    const data = filterRows();

    // emissions
    {
      const s = series(data, "emissions_total");
      Plotly.newPlot("plot-emissions", [{
        x: s.x, y: s.y, type: "scatter", mode: "lines", name: "Emissions"
      }], {
        title: "Emissions (total)",
        xaxis: { title: "Time" },
        yaxis: { title: "Emissions" },
        margin: { t: 50, l: 60, r: 20, b: 50 }
      }, { displayModeBar: false });
    }

    // output vs imports
    {
      const q = series(data, "marketQuantity");
      const m = series(data, "imports");
      Plotly.newPlot("plot-output", [
        { x: q.x, y: q.y, type: "scatter", mode: "lines", name: "Market quantity" },
        { x: m.x, y: m.y, type: "scatter", mode: "lines", name: "Imports" }
      ], {
        title: "Output and imports",
        xaxis: { title: "Time" },
        yaxis: { title: "Quantity" },
        margin: { t: 50, l: 60, r: 20, b: 50 }
      }, { displayModeBar: false });
    }

    // profit
    {
      const s = series(data, "profit_total");
      Plotly.newPlot("plot-profit", [{
        x: s.x, y: s.y, type: "scatter", mode: "lines", name: "Profit"
      }], {
        title: "Profit (total)",
        xaxis: { title: "Time" },
        yaxis: { title: "Profit" },
        margin: { t: 50, l: 60, r: 20, b: 50 }
      }, { displayModeBar: false });
    }
  }

  function populateControls() {
    const markets = uniqSorted(rows.map(r => r.market));
    const instruments = uniqSorted(rows.map(r => r.instrument));

    elMarket.innerHTML = markets.map(m => `<option value="${m}">${m}</option>`).join("");
    elInstrument.innerHTML = instruments.map(s => `<option value="${s}">${s}</option>`).join("");

    // defaults
    if (markets.includes("Total")) elMarket.value = "Total";
    if (instruments.includes("Tax")) elInstrument.value = "Tax";
    elCbam.value = "0";
    elLevel.value = "0";
  }

  function attachHandlers() {
    elMarket.addEventListener("change", draw);
    elInstrument.addEventListener("change", draw);
    elCbam.addEventListener("change", draw);
    elLevel.addEventListener("input", draw);
  }

  // Load CSV
  const text = await (await fetch(CSV_URL, { cache: "no-store" })).text();
  const parsed = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });

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

  populateControls();
  attachHandlers();
  draw();
})();

