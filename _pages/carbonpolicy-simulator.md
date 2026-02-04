---
layout: single
title: "Carbon Policy Simulator"
permalink: /carbonpolicy-simulator/
author_profile: true
---

With this tool, you can explore the main results of my JMP. The model simulates the development of the French cement industry over time when facing different environmental regulations. Initially, firms operate with the full emission intensity (set at 0.6 kg of CO2-equivalent per kg of cement produced) and face the full burden of the regulation. Over time, firms can invest to reduce their emission intensity, and thus ease the cost of regulation. The developments plotted over time reflect this investment behaviour. A brief description of the model and parameters can be found [here](/assets/data/Read_Me_Simulator.pdf){:target="_blank"}. For further details on the model and computations, I refer to the original paper.

I plan to add more scenarios and industries over time. If you have any questions, feedback, or run into issues, please reach out at **niklas.schoch@sciencespo.fr**. 

<div id="sim-controls" class="sim-controls">
  <label>
    <span>Market</span>
    <select id="ctrl-market"></select>
  </label>

  <label>
    <span>Instrument</span>
    <select id="ctrl-instrument"></select>
  </label>

  <label>
    <span>Outcome</span>
    <select id="ctrl-outcome"></select>
  </label>

  <label>
    <span>CBAM</span>
    <select id="ctrl-cbam">
      <option value="0">Off</option>
      <option value="1">On</option>
    </select>
  </label>

  <label>
    <span>Level</span>
    <input id="ctrl-level" type="range" min="0" max="0" step="1" />
    <span id="ctrl-level-label"></span>
  </label>

  <button type="button" id="btn-download-csv" class="sim-download-btn">Download CSV</button>
</div>

<div id="plot-main"></div>

<div id="plot-description" class="plot-description"></div>

<hr class="sim-section-divider" />

<h2 id="policy-comparison-heading">Policy Comparison</h2>
<p class="sim-section-intro">Compare two policies by percentage change in key outcomes. Choose NPV (discounted sum over time) or a single year.</p>

<div id="comparison-controls" class="comparison-controls">
  <div class="comparison-policy">
    <h3>Policy A (baseline)</h3>
    <label><span>Market</span><select id="comp-market-a"></select></label>
    <label><span>Instrument</span><select id="comp-instrument-a"></select></label>
    <label><span>CBAM</span><select id="comp-cbam-a"><option value="0">Off</option><option value="1">On</option></select></label>
    <label><span>Level</span><select id="comp-level-a"></select></label>
  </div>
  <div class="comparison-policy">
    <h3>Policy B</h3>
    <label><span>Market</span><select id="comp-market-b"></select></label>
    <label><span>Instrument</span><select id="comp-instrument-b"></select></label>
    <label><span>CBAM</span><select id="comp-cbam-b"><option value="0">Off</option><option value="1">On</option></select></label>
    <label><span>Level</span><select id="comp-level-b"></select></label>
  </div>
  <div class="comparison-mode">
    <h3>Comparison mode</h3>
    <label><span>Mode</span><select id="comp-mode"><option value="npv">NPV (all periods)</option><option value="year">Single year</option></select></label>
    <label id="comp-year-label"><span>Year</span><select id="comp-year"></select></label>
  </div>
</div>

<div id="comparison-plot" class="comparison-plot"></div>

<div id="comparison-description" class="plot-description"></div>

<link rel="stylesheet" href="/assets/css/carbonpolicy-sim.css">

<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<script src="/assets/js/carbonpolicy-sim.js" defer></script>
