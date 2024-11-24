---
layout: archive
title: "CV"
title: "Download my resume: [here](https://niklasschoch.github.io/files/CV_Niklas_Schoch.pdf)"
author_profile: true
redirect_from:
  - /files
---

{% include base_path %}

Publications
======
  <ul>{% for post in site.publications reversed %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>
  
Teaching
======
  <ul>{% for post in site.teaching reversed %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>
