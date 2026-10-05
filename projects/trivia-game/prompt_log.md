# Prompt Log

**Tool used:** [Claude Code](https://claude.com/claude-code), model Claude Sonnet 5.

## Key prompts

1. **Initial spec** (paraphrased): "Build a Trivia Game project in the format of Who Wants to
   Be a Millionaire, where questions progressively get harder. Make a home page to start
   playing and change settings; running the app should open a window with the home page, and
   pressing Play starts the game at question 1. Show a Category and Difficulty marker on each
   question screen. Use the public Open Trivia Database API with multiple-choice questions.
   Deliver a Python app, a README explaining the API call and setup, and a prompt log."

2. Follow-up answers that shaped the design, given in response to Claude's clarifying
   questions before any code was written:
   - GUI: **CustomTkinter** over plain Tkinter, for a more presentable look.
   - Millionaire fidelity: **simplified** progression (no full visual prize-ladder sidebar, no
     Ask-the-Audience) but **keep the 50:50 lifeline and safe-haven checkpoints**.
   - Settings screen scope: **number of questions + category only** (no timer).

## Notable implementation decisions made while building

- Verified OpenTDB's behavior directly (via `curl`) rather than assuming the docs were
  current: the `encoding=url3986`/`base64` query parameter turned out to have no effect on
  live responses, so the client decodes the default HTML-entity-escaped text with
  `html.unescape` instead.
- Discovered mid-testing that OpenTDB now rate-limits with a plain HTTP 429 (not only the
  documented `response_code: 5` in the JSON body); added a retry-with-backoff for both cases
  after a live integration test surfaced the failure.
- The whole app was exercised in a real window on a Linux desktop (not just read over) -
  including a scripted full playthrough (win, and a loss that correctly keeps a banked
  safe-haven prize) and one live run against the real API - before being handed off.
