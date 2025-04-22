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
  <p>
    <strong>{{ item.title }}</strong>{% if item.venue %}, <em>{{ item.venue }}</em>{% endif %}
    {% if item.citation %} ({{ item.citation }}), with {% endif %}
    {% if category != "Work in Progress" and item.authors %}
      {% assign author_count = item.authors | size %}
      {% if author_count == 1 %}
        {{ item.authors[0] }}
      {% elsif author_count == 2 %}
        {{ item.authors[0] }} and {{ item.authors[1] }}
        {% else %}
          {% for author in item.authors %}
            {% assign i = forloop.index0 %}
            {% assign last = author_count | minus: 1 %}
            {% if i < last - 1 %}
              {{ author }}, 
            {% elsif i == last - 1 %}
              {{ author }} and 
            {% else %}
              {{ author -}}
            {% endif %}
          {% endfor %}
        {% endif %}
      .
    {% endif %}
  </p>

  {% if item.links %}
    {% for link in item.links %}
      <a href="{{ link.url }}" class="btn" target="_blank" rel="noopener" style="margin-right: 0.5rem;">{{ link.label }}</a>
    {% endfor %}
  {% endif %}
</div>
{% endfor %}
{% endfor %}
