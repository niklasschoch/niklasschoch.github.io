---
layout: single
title: "Carbon Policy Simulator"
permalink: /carbonpolicy-simulator/
author_profile: true
---

#Welcome to my carbon policy simulator!

<div id="sim-controls" class="sim-controls">
  <label>Market
    <select id="ctrl-market"></select>
  </label>

  <label>Instrument
    <select id="ctrl-instrument"></select>
  </label>

  <label>Outcome
  <select id="ctrl-outcome"></select>
  </label>

  <label>CBAM
    <select id="ctrl-cbam">
      <option value="0">Off</option>
      <option value="1">On</option>
    </select>
  </label>

  <label>Level
    <input id="ctrl-level" type="range" min="0" max="0" step="1" />
    <span id="ctrl-level-label"></span>
  </label>
</div>

<div id="plot-main"></div>

<link rel="stylesheet" href="/assets/css/carbonpolicy-sim.css">

<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<script src="/assets/js/carbonpolicy-sim.js" defer></script>
