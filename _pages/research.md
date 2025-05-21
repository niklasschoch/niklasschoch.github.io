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
<ul>
{% for item in items %}
  <li>
    "{{ item.title }}"{% if item.authors %}, {{ item.authors }}{% endif %}
    {% if item.venue %}, <em>{{ item.venue }}</em>{% endif %}
    {% if item.citation %} ({{ item.citation }}){% endif %}.
    
    {% if item.links %}
      <br/>
      {% for link in item.links %}
        <a href="{{ link.url }}" class="btn" target="_blank" rel="noopener" style="margin-right: 0.5rem;">{{ link.label }}</a>
      {% endfor %}
    {% endif %}
  </li>
{% endfor %}
</ul>
{% endfor %}
