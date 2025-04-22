---
title: "Policy Writing"
permalink: /policy/
layout: single
author_profile: true
---

{% assign policies = site.policy | sort: "date" | reverse %}
<ul>
{% for item in policies %}
  <li>
    "{{ item.title }}", <em>{{ item.venue }}</em>{% if item.date %}, {{ item.date | date: "%Y" }}{% endif %}{% if item.authors %}, {{ item.authors }}{% endif -%}.
  </li>
{% endfor %}
</ul>
