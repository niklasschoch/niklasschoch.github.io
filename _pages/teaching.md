---
title: "Teaching"
permalink: /teaching/
layout: single
author_profile: true
---

{% assign classes = site.teaching | sort: "date" | reverse %}
<ul>
  {% for item in classes %}
    <li>
      <strong>{{ item.title }}</strong>, <em>{{ item.venue }}</em>, {{ item.level }} ({{ item.semester }})
    </li>
  {% endfor %}
</ul>
