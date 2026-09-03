# peng-jerry.github.io

Personal portfolio of Jerry Peng — <https://peng-jerry.github.io/>

Static HTML, CSS, and JavaScript. No framework, no theme, no build step.

## Preview it locally

From this folder:

```
python -m http.server 8000
```

Then open <http://localhost:8000>. Edit any file and refresh the browser — there is
nothing to rebuild. (Serve it rather than double-clicking the files: every link and
image path starts at the site root, so `file://` will not resolve them.)

## Layout

```
index.html            Home
projects.html         Projects grid
resume.html           Resume
project1/ … project8/ Project write-ups  (each is an index.html so the URL is /project1/)
portfolio/            Write-up about this site
css/style.css         All styling, including both colour themes
js/site.js            Theme toggle + mobile nav (the only JavaScript on the site)
assets/               Images, resume PDF/PNG
.nojekyll             Tells GitHub Pages to serve these files as-is
```

The navigation bar and footer are duplicated at the top and bottom of every page.
If you change one, change it everywhere — a find-and-replace across `*.html` works,
since the blocks are byte-identical.

## Branches

- `main` — what is published at peng-jerry.github.io
- `minima` — the previous Jekyll/Minima version, kept for reference

## AI assistance

This site was rebuilt with Claude Code acting as a coding assistant for the
markup and styling. [PROMPTS.md](PROMPTS.md) is a verbatim log of the prompts
used.

## Credits

- Colour palette adapted from [Linbo Gao's portfolio](https://linbo271828-cell.github.io/github.io/)
- Project-card grid layout inspired by [Elizabeth Sumpter's portfolio](https://esump25.github.io/sumpterportfolio/)
- Previous versions used the [Minima](https://github.com/jekyll/minima) Jekyll theme (MIT)
- Typeface: [Inter](https://fonts.google.com/specimen/Inter) by Rasmus Andersson (SIL OFL), via Google Fonts
- Photographs, CAD renders, and figures are my own, except the dielectric elastomer
  figure on the Core-Shell-Shell 3-D Printer page, which is cited on that page
