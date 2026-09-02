/* Site behaviour: dark/light theme toggle + mobile nav.
   Kept deliberately small and dependency-free. */
(function () {
  "use strict";

  // --- Theme toggle -------------------------------------------------------
  // The initial theme is applied by an inline script in <head> so the page
  // never flashes the wrong colours. Here we only handle the button.
  var themeBtn = document.querySelector("[data-theme-toggle]");

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  }

  function applyTheme(theme) {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    if (themeBtn) {
      themeBtn.setAttribute(
        "aria-label",
        theme === "light" ? "Switch to dark theme" : "Switch to light theme"
      );
    }
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      /* private browsing / storage blocked — the toggle still works for this page */
    }
  }

  if (themeBtn) {
    applyTheme(currentTheme());
    themeBtn.addEventListener("click", function () {
      applyTheme(currentTheme() === "light" ? "dark" : "light");
    });
  }

  // --- Mobile nav ---------------------------------------------------------
  var navBtn = document.querySelector("[data-nav-toggle]");
  var navLinks = document.getElementById("nav-links");

  if (navBtn && navLinks) {
    navBtn.addEventListener("click", function () {
      var open = navLinks.classList.toggle("open");
      navBtn.setAttribute("aria-expanded", String(open));
    });

    // Close the menu after tapping a link
    navLinks.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        navLinks.classList.remove("open");
        navBtn.setAttribute("aria-expanded", "false");
      }
    });
  }
})();
