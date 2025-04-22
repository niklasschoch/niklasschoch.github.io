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
<div style="margin-bottom: 1.5rem;">
  {% if category == "Work in Progress" %}
    <p><strong>{{ item.title }}</strong>{% if item.authors %} ({{ item.authors | join: ", " }}){% endif %}</p>
  {% else %}
    <p><strong>{{ item.title }}</strong>{% if item.venue %}, <em>{{ item.venue }}</em>{% endif %}</p>
    {% if item.citation %}<p>{{ item.citation }}</p>{% endif %}
    {% if item.authors %}<p>({{ item.authors | join: ", " }})</p>{% endif %}
  {% endif %}

  {% if item.links %}
    {% for link in item.links %}
      <a href="{{ link.url }}" class="btn" target="_blank" rel="noopener" style="margin-right: 0.5rem;">{{ link.label }}</a>
    {% endfor %}
  {% endif %}
</div>
{% endfor %}
{% endfor %}
