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
- **{{ item.title }}**  
  {{ item.citation }}  
  {% if item.pdf %}
    [PDF]({{ item.pdf }})
  {% elsif item.external_url %}
    [Link]({{ item.external_url }})
  {% endif %}
{% endfor %}

{% endfor %}
