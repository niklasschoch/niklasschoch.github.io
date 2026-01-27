---
layout: single
title: "Carbon Policy Simulator"
permalink: /carbonpolicy-simulator/
author_profile: true
---

On this page, you can explore the main results of my JMP. The values show the development of the French Cement industry over time. 

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
