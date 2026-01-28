---
layout: single
title: "Carbon Policy Simulator"
permalink: /carbonpolicy-simulator/
author_profile: true
---

On this page, you can explore the main results of my JMP. The model simulates the development of the French cement industry over time when facing  different environmental regulations. Intially, firms operate with the full emission intensity (set at 0.6kg of CO2-equivalent per kg of cement produced) and face the full burden of the regulation. Over time, the firms but can invest to reduce their emission intensity, and thus ease cost of regulation. The developments plotted over time reflect this investment behaviour. The model parameters can be found in this [Read-Me](/assets/data/Read_Me_Simulator.pdf){:target="_blank"}. The computational details are described in the paper. 

I am still developing this site, and hope to include more scenarios and industries. If you have any questions, feedback about things you would like to see, or run into issues, please do not hesitate to reach out at **niklas.schoch@sciencespo.fr**. 

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
</div>

<div id="plot-main"></div>

<div id="plot-description" class="plot-description"></div>

<link rel="stylesheet" href="/assets/css/carbonpolicy-sim.css">

<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<script src="/assets/js/carbonpolicy-sim.js" defer></script>
