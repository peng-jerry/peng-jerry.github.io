# Trivia Game Show

A desktop "Who Wants to Be a Millionaire"-style trivia game. Questions get progressively
harder as you advance: the first third of the game is easy, the middle third is medium, and
the last third is hard. Running the app opens a window with a home/settings screen; pressing
**Play** starts the game at question 1.

## Gameplay

- **Prize ladder**: each question is worth more than the last (roughly ×1.6 per step, e.g.
  `$100 -> $150 -> $250 -> ... -> $72,500` for a 15-question game).
- **Safe havens**: reaching the end of the easy tier and the end of the medium tier "banks"
  your prize. If you get a later question wrong, you keep the last banked amount instead of
  losing everything - just like the real show's guaranteed checkpoints.
- **50:50 lifeline**: usable once per game, removes two of the three wrong answers.
- Each question screen shows the **category** and a color-coded **difficulty** badge
  (green/orange/red for easy/medium/hard).
- Your best-ever prize is saved locally (`highscore.json`) and shown on the home screen.

## How the Open Trivia DB API is called

The app talks to the [Open Trivia Database](https://opentdb.com/api_config.php)
(`trivia/api.py`) using the `requests` library. **No API key or account is needed** - OpenTDB
is a fully public, keyless REST API.

- To fetch questions, it sends a `GET` to `https://opentdb.com/api.php` with query parameters
  `amount` (how many questions), `difficulty` (`easy` / `medium` / `hard`), `type=multiple`
  (multiple-choice only), and optionally `category` (an integer id, e.g. `21` for Sports - see
  `trivia/categories.py` for the full list). One call is made per difficulty tier, since a
  single game mixes all three difficulties.
- The response is JSON: a `response_code` (0 = success, 1 = not enough questions for those
  filters, 4 = the session has exhausted every matching question, 5 = rate-limited) and a
  `results` list of objects with `category`, `difficulty`, `question`, `correct_answer`, and
  `incorrect_answers` (a list of 3 strings) - all HTML-escaped text (e.g. `&quot;`), which the
  app unescapes with Python's built-in `html.unescape`.
- The client also requests an optional **session token** from
  `https://opentdb.com/api_token.php?command=request` and passes it back on every question
  request as a `token` parameter. This isn't authentication (there's nothing to obtain or
  configure) - it's just an opaque id OpenTDB uses so it doesn't repeat a question you've
  already been served this session. There's nothing you need to set up for this yourself.

## Setup

Requires Python 3.10+.

```bash
cd "Trivia Game"
pip install -r requirements.txt
python main.py
```

`requirements.txt` installs `requests` (API calls) and `customtkinter` (the GUI toolkit).

## Project layout

```
main.py                  - entry point, opens the app window
trivia/
  api.py                 - Open Trivia DB client (fetching, session tokens, retries)
  categories.py          - OpenTDB's fixed category name -> id list
  game_logic.py           - difficulty tiers, prize ladder, safe havens, 50:50
  storage.py             - local high-score persistence (highscore.json)
  ui.py                  - CustomTkinter screens: Home, Loading, Game, End
```

See `prompt_log.md` for the AI tool used and the key prompts behind this implementation.
