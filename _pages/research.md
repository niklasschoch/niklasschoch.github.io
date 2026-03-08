---
title: "Research"
permalink: /research/
layout: single
author_profile: true
---

{% assign pubs = site.publications | sort: 'date' | reverse %}
{% assign categories = "Publications,Working Paper,Work in Progress,Master thesis" | split: "," %}

{% for category in categories %}
## {{ category }}

{% assign items = pubs | where: "category", category %}
<ul>
{% for item in items %}
  <li>
    "{{ item.title }}"{% if item.authors %}, {{ item.authors }}{% endif -%}.
    {% if item.venue %}, <em>{{ item.venue }}</em>{% endif -%}
   {% if item.citation %}
    <br/><em>{{ item.citation }}</em>
  {% endif -%}
    
    {% if item.links or item.abstract %}
      <br/>
      <span class="pub-buttons">
      {% if item.abstract %}
      <details class="pub-abstract">
        <summary class="pub-abstract__toggle btn">Abstract <span class="pub-abstract__arrow" aria-hidden="true">▼</span></summary>
        <p class="pub-abstract__text">{{ item.abstract }}</p>
      </details>
      {% endif -%}
      {% if item.links %}
        {% for link in item.links %}
          <a href="{{ link.url }}" class="btn" target="_blank" rel="noopener">{{ link.label }}</a>
        {% endfor %}
      {% endif -%}
      </span>
    {% endif -%}
  </li>
{% endfor %}
</ul>
{% endfor %}
