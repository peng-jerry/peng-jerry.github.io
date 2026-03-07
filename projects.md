---
layout: page
title: Projects
---

<div class="projects-grid">

{% for project in site.projects %}

<a class="project-card" href="{{ project.url | relative_url }}">
  <div class="project-image">
    <img src="{{ project.image }}" alt="{{ project.title }}">
  </div>

  <div class="project-overlay">
    <h3>{{ project.title }}</h3>
  </div>
</a>

{% endfor %}

</div>
