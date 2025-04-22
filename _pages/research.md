---
title: "Research"
permalink: /research/
layout: single
author_profile: true
---

{% assign pubs = site.publications | sort: 'date' | reverse %}

{% assign categories = "Publications,Working Paper,Work in Progress" | split: "," %}

{% for category in categories %}
## {{ category }}

{% assign items = pubs | where: "category", category %}
{% for item in items %}
<div style="margin-bottom: 2rem;">
<p>
  <strong>{{ item.title }}</strong>
  {% if item.authors %} {{ item.authors }}{% endif %}
  {% if item.date and category != "Work in Progress" %} ({{ item.date | date: "%Y" }}){% endif %}
</p>

{% if item.citation %}
  <p>{{ item.citation }}</p>
{% endif %}

  {% if item.venue %}
    <p><em>{{ item.venue }}</em></p>
  {% endif %}

  {% if item.links %}
    {% for link in item.links %}
      <a href="{{ link.url }}" class="btn" target="_blank" rel="noopener" style="margin-right: 0.5rem;">{{ link.label }}</a>
    {% endfor %}
  {% endif %}
</div>
{% endfor %}
{% endfor %}
