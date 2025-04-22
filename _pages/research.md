---
title: "Research"
permalink: /research/
layout: single
author_profile: true
---

Welcome to my research page.

{% assign pubs = site.publications | sort: 'date' | reverse %}

{% assign categories = "Publications,Working Paper,Work in Progress" | split: "," %}

{% for category in categories %}
## {{ category }}

{% assign items = pubs | where: "category", category %}
{% for item in items %}
<div style="margin-bottom: 2rem;">
  <p><strong>{{ item.title }}</strong> ({{ item.date | date: "%Y" }})<br>
  {{ item.citation }}</p>

  {% if item.links %}
    {% for link in item.links %}
      <a href="{{ link.url }}" class="btn" target="_blank" rel="noopener" style="margin-right: 0.5rem;">{{ link.label }}</a>
    {% endfor %}
  {% endif %}
</div>
{% endfor %}


{% endfor %}
