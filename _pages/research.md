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
- **{{ item.title }}** ({{ item.date | date: "%Y" }})  
  {{ item.citation }}  
  {% if item.links %}
    {% for link in item.links %}
      [{{ link.label }}]({{ link.url }}){% if forloop.last == false %} | {% endif %}
    {% endfor %}
  {% endif %}
{% endfor %}

{% endfor %}
