"""Tiny local high-score persistence - no database, just a JSON file next to the app."""

import json
from pathlib import Path

_HIGH_SCORE_FILE = Path(__file__).resolve().parent.parent / "highscore.json"


def load_high_score() -> int:
    try:
        data = json.loads(_HIGH_SCORE_FILE.read_text())
        return int(data["high_score"])
    except (FileNotFoundError, json.JSONDecodeError, KeyError, ValueError):
        return 0


def save_high_score(value: int) -> None:
    _HIGH_SCORE_FILE.write_text(json.dumps({"high_score": value}))
